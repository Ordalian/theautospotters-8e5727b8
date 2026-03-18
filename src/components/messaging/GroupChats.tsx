import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/i18n/LanguageContext";
import { useBlacklist } from "@/hooks/useBlacklist";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft, Loader2, Plus, Send, Users, X } from "lucide-react";

type ProfileLite = { user_id: string; username: string | null; role?: string | null; is_premium?: boolean };
type Friend = ProfileLite;
type GroupChatRow = { id: string; title: string; created_at: string; last_message_at: string | null; created_by: string };
type GroupMsgRow = { id: string; chat_id: string; sender_id: string; body: string; created_at: string };

export default function GroupChats({ onBack }: { onBack: () => void }) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const qc = useQueryClient();
  const { isBlacklisted } = useBlacklist(user?.id);

  const [selectedChat, setSelectedChat] = useState<GroupChatRow | null>(null);
  const [messageBody, setMessageBody] = useState("");
  const [creatingOpen, setCreatingOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [memberQuery, setMemberQuery] = useState("");
  const [selectedMemberIds, setSelectedMemberIds] = useState<Set<string>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: friends = [] } = useQuery({
    queryKey: ["group_friends", user?.id],
    queryFn: async () => {
      const { data: friendships } = await supabase
        .from("friendships")
        .select("requester_id, addressee_id")
        .eq("status", "accepted")
        .or(`requester_id.eq.${user!.id},addressee_id.eq.${user!.id}`);
      if (!friendships?.length) return [];
      const ids = friendships.map((f) => (f.requester_id === user!.id ? f.addressee_id : f.requester_id));
      const { data: profiles } = await supabase.from("profiles_public").select("user_id, username, role, is_premium").in("user_id", ids);
      return (profiles || []) as Friend[];
    },
    enabled: !!user,
    staleTime: 60_000,
  });

  const eligibleFriends = useMemo(() => friends.filter((f) => !isBlacklisted(f.user_id)), [friends, isBlacklisted]);
  const filteredEligible = useMemo(() => {
    const q = memberQuery.trim().toLowerCase();
    if (!q) return eligibleFriends;
    return eligibleFriends.filter((f) => (f.username || "").toLowerCase().includes(q) || f.user_id.toLowerCase().includes(q));
  }, [eligibleFriends, memberQuery]);

  const { data: chats = [], isLoading: chatsLoading } = useQuery({
    queryKey: ["group_chats", user?.id],
    queryFn: async () => {
      const { data: memberRows } = await supabase
        .from("group_chat_members")
        .select("chat_id")
        .eq("user_id", user!.id)
        .is("left_at", null);
      const chatIds = (memberRows || []).map((r) => r.chat_id);
      if (chatIds.length === 0) return [];
      const { data } = await supabase
        .from("group_chats")
        .select("id, title, created_at, created_by, last_message_at")
        .in("id", chatIds)
        .order("last_message_at", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false });
      return (data || []) as GroupChatRow[];
    },
    enabled: !!user,
  });

  const { data: members = [] } = useQuery({
    queryKey: ["group_chat_members", selectedChat?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("group_chat_members")
        .select("user_id, role, left_at")
        .eq("chat_id", selectedChat!.id)
        .is("left_at", null);
      const ids = (data || []).map((r) => r.user_id);
      const { data: profiles } = await supabase.from("profiles_public").select("user_id, username").in("user_id", ids);
      const map = new Map((profiles || []).map((p) => [p.user_id, p.username]));
      return (data || []).map((r) => ({ ...r, username: map.get(r.user_id) ?? null })) as { user_id: string; role: string; username: string | null }[];
    },
    enabled: !!selectedChat?.id,
  });

  const isOwner = useMemo(() => members.some((m) => m.user_id === user?.id && m.role === "owner"), [members, user?.id]);

  const { data: messages = [], isLoading: msgsLoading } = useQuery({
    queryKey: ["group_chat_messages", selectedChat?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("group_chat_messages")
        .select("id, chat_id, sender_id, body, created_at")
        .eq("chat_id", selectedChat!.id)
        .order("created_at", { ascending: true });
      const senderIds = [...new Set((data || []).map((m) => m.sender_id))];
      const { data: profiles } = await supabase.from("profiles_public").select("user_id, username").in("user_id", senderIds);
      const map = new Map((profiles || []).map((p) => [p.user_id, p.username]));
      return ((data || []) as GroupMsgRow[]).map((m) => ({ ...m, sender_name: map.get(m.sender_id) ?? null })) as (GroupMsgRow & { sender_name: string | null })[];
    },
    enabled: !!selectedChat?.id,
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, selectedChat?.id]);

  const createChatMut = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("no user");
      const title = newTitle.trim();
      if (!title) throw new Error("title");

      const { data: chat, error: chatErr } = await supabase
        .from("group_chats")
        .insert({ created_by: user.id, title })
        .select("id, title, created_at, created_by, last_message_at")
        .single();
      if (chatErr) throw chatErr;

      // Add self as owner then add others as members
      const membersToInsert = [
        { chat_id: chat.id, user_id: user.id, role: "owner" },
        ...[...selectedMemberIds].map((uid) => ({ chat_id: chat.id, user_id: uid, role: "member" })),
      ];
      const { error: memErr } = await supabase.from("group_chat_members").insert(membersToInsert as any);
      if (memErr) throw memErr;
      return chat as GroupChatRow;
    },
    onSuccess: (chat) => {
      setCreatingOpen(false);
      setNewTitle("");
      setMemberQuery("");
      setSelectedMemberIds(new Set());
      qc.invalidateQueries({ queryKey: ["group_chats"] });
      setSelectedChat(chat);
    },
  });

  const sendMut = useMutation({
    mutationFn: async () => {
      if (!user || !selectedChat) return;
      const body = messageBody.trim();
      if (!body) return;
      const { error } = await supabase.from("group_chat_messages").insert({
        chat_id: selectedChat.id,
        sender_id: user.id,
        body,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      setMessageBody("");
      qc.invalidateQueries({ queryKey: ["group_chat_messages", selectedChat?.id] });
      qc.invalidateQueries({ queryKey: ["group_chats", user?.id] });
    },
  });

  const removeMemberMut = useMutation({
    mutationFn: async (memberId: string) => {
      if (!selectedChat) return;
      const { error } = await supabase
        .from("group_chat_members")
        .update({ left_at: new Date().toISOString() } as any)
        .eq("chat_id", selectedChat.id)
        .eq("user_id", memberId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["group_chat_members", selectedChat?.id] });
    },
  });

  if (selectedChat) {
    return (
      <div className="min-h-screen min-h-[100dvh] relative flex flex-col">
        <header className="sticky top-0 z-20 flex items-center gap-3 px-4 py-3 border-b border-primary/10 bg-background/95 backdrop-blur">
          <Button variant="ghost" size="icon" onClick={() => setSelectedChat(null)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="text-sm font-bold truncate flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              {selectedChat.title}
            </h1>
            <p className="text-[11px] text-muted-foreground truncate">
              {members.map((m) => m.username || m.user_id.slice(0, 6)).join(", ")}
            </p>
          </div>
          {isOwner && (
            <Dialog open={false} onOpenChange={() => {}}>
              {/* placeholder to keep layout stable; member management is inline below */}
            </Dialog>
          )}
        </header>

        <div className="flex-1 overflow-y-auto p-4 pb-28 space-y-2">
          {msgsLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : messages.length === 0 ? (
            <p className="text-center text-muted-foreground text-sm py-12">Aucun message.</p>
          ) : (
            messages.map((m) => {
              const isMine = m.sender_id === user!.id;
              return (
                <div key={m.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[78%] rounded-2xl px-3.5 py-2 ${isMine ? "bg-primary text-primary-foreground rounded-br-md" : "bg-muted rounded-bl-md"}`}>
                    {!isMine && (
                      <p className="text-[10px] text-muted-foreground mb-0.5">{(m as any).sender_name || "—"}</p>
                    )}
                    <p className="text-sm whitespace-pre-wrap break-words">{m.body}</p>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {isOwner && members.length > 1 && (
          <div className="border-t border-border/40 bg-background/95 backdrop-blur px-3 py-2">
            <div className="flex gap-2 overflow-x-auto">
              {members
                .filter((m) => m.user_id !== user!.id)
                .map((m) => (
                  <button
                    key={m.user_id}
                    type="button"
                    className="text-xs rounded-full border border-border/60 px-2 py-1 flex items-center gap-1 shrink-0"
                    onClick={() => removeMemberMut.mutate(m.user_id)}
                    disabled={removeMemberMut.isPending}
                    title="Retirer"
                  >
                    <X className="h-3 w-3 text-muted-foreground" />
                    <span className="truncate max-w-[120px]">{m.username || m.user_id.slice(0, 6)}</span>
                  </button>
                ))}
            </div>
          </div>
        )}

        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border/40 bg-background/95 backdrop-blur p-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] flex gap-2 items-end">
          <Input
            value={messageBody}
            onChange={(e) => setMessageBody(e.target.value)}
            placeholder="Écrire un message..."
            className="flex-1"
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && messageBody.trim()) { e.preventDefault(); sendMut.mutate(); } }}
          />
          <Button size="icon" disabled={!messageBody.trim() || sendMut.isPending} onClick={() => sendMut.mutate()}>
            {sendMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen min-h-[100dvh] relative flex flex-col">
      <header className="sticky top-0 z-20 flex items-center justify-between gap-3 px-4 py-3 border-b border-primary/10 bg-background/95 backdrop-blur">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-sm font-bold">Groupes</h1>
        </div>
        <Button size="sm" className="gap-1" onClick={() => setCreatingOpen(true)}>
          <Plus className="h-4 w-4" /> Nouveau
        </Button>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {chatsLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : chats.length === 0 ? (
          <p className="text-center text-muted-foreground text-sm py-12">Aucun groupe.</p>
        ) : (
          chats.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedChat(c)}
              className="w-full text-left rounded-xl border border-border/50 bg-card/80 p-3 hover:border-primary/40 transition-colors"
            >
              <p className="font-semibold text-sm truncate flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                {c.title}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {c.last_message_at ? new Date(c.last_message_at).toLocaleString() : new Date(c.created_at).toLocaleString()}
              </p>
            </button>
          ))
        )}
      </div>

      <Dialog open={creatingOpen} onOpenChange={(o) => { setCreatingOpen(o); if (!o) { setNewTitle(""); setMemberQuery(""); setSelectedMemberIds(new Set()); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nouveau groupe</DialogTitle>
            <DialogDescription>Choisissez un titre et des membres.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <p className="text-sm font-medium mb-1">Titre</p>
              <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Ex: Road trip" />
            </div>
            <div>
              <p className="text-sm font-medium mb-1">Membres</p>
              <Input value={memberQuery} onChange={(e) => setMemberQuery(e.target.value)} placeholder="Rechercher..." />
              <div className="mt-2 max-h-48 overflow-y-auto rounded-lg border border-border/60 p-2 space-y-1">
                {filteredEligible.length === 0 ? (
                  <p className="text-sm text-muted-foreground p-2">Aucun ami.</p>
                ) : (
                  filteredEligible.map((f) => {
                    const selected = selectedMemberIds.has(f.user_id);
                    return (
                      <button
                        key={f.user_id}
                        type="button"
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm ${selected ? "bg-primary/20 text-primary" : "hover:bg-muted"}`}
                        onClick={() => {
                          setSelectedMemberIds((prev) => {
                            const next = new Set(prev);
                            if (next.has(f.user_id)) next.delete(f.user_id);
                            else next.add(f.user_id);
                            return next;
                          });
                        }}
                      >
                        {f.username || f.user_id}
                      </button>
                    );
                  })
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">{selectedMemberIds.size} sélectionné(s)</p>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setCreatingOpen(false)}>Annuler</Button>
            <Button
              onClick={() => createChatMut.mutate()}
              disabled={!newTitle.trim() || createChatMut.isPending}
            >
              {createChatMut.isPending ? "…" : "Créer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

