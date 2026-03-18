import { useState, useEffect, useRef, useMemo } from "react";
import { useLanguage } from "@/i18n/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, Send, Loader2, Users, Plus, X, Trash2, UserPlus, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import UserRoleBadge from "@/components/UserRoleBadge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type GroupChat = {
  id: string;
  title: string;
  created_by: string;
  created_at: string;
  last_message_at: string | null;
};
type GroupMessage = {
  id: string;
  chat_id: string;
  sender_id: string;
  body: string;
  created_at: string;
  username?: string;
  role?: string | null;
  is_premium?: boolean;
};
type Member = {
  user_id: string;
  role: string;
  username?: string;
  avatar_url?: string | null;
};
type Friend = { user_id: string; username: string; avatar_url: string | null };

interface GroupChatsProps {
  onBack: () => void;
}

const GroupChats = ({ onBack }: GroupChatsProps) => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [selectedChat, setSelectedChat] = useState<GroupChat | null>(null);
  const [messageBody, setMessageBody] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [selectedFriendIds, setSelectedFriendIds] = useState<Set<string>>(new Set());
  const [showAddMember, setShowAddMember] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Friends list
  const { data: friends = [] } = useQuery({
    queryKey: ["gc_friends", user?.id],
    queryFn: async () => {
      const { data: friendships } = await supabase
        .from("friendships")
        .select("requester_id, addressee_id")
        .eq("status", "accepted")
        .or(`requester_id.eq.${user!.id},addressee_id.eq.${user!.id}`);
      if (!friendships?.length) return [];
      const ids = friendships.map((f) => (f.requester_id === user!.id ? f.addressee_id : f.requester_id));
      const { data: profiles } = await supabase
        .from("profiles_public")
        .select("user_id, username, avatar_url")
        .in("user_id", ids);
      return (profiles || []) as Friend[];
    },
    enabled: !!user,
  });

  // My group chats
  const { data: chats = [], isLoading: chatsLoading } = useQuery({
    queryKey: ["group_chats", user?.id],
    queryFn: async () => {
      const { data: memberships } = await supabase
        .from("group_chat_members")
        .select("chat_id")
        .eq("user_id", user!.id)
        .is("left_at", null);
      if (!memberships?.length) return [];
      const chatIds = memberships.map((m) => m.chat_id);
      const { data } = await supabase
        .from("group_chats")
        .select("*")
        .in("id", chatIds)
        .order("last_message_at", { ascending: false, nullsFirst: false });
      return (data || []) as GroupChat[];
    },
    enabled: !!user,
  });

  // Members of selected chat
  const { data: members = [] } = useQuery({
    queryKey: ["gc_members", selectedChat?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("group_chat_members")
        .select("user_id, role")
        .eq("chat_id", selectedChat!.id)
        .is("left_at", null);
      if (!data?.length) return [];
      const ids = data.map((m) => m.user_id);
      const { data: profiles } = await supabase
        .from("profiles_public")
        .select("user_id, username, avatar_url")
        .in("user_id", ids);
      const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));
      return data.map((m) => ({
        user_id: m.user_id,
        role: m.role,
        username: profileMap.get(m.user_id)?.username || "?",
        avatar_url: profileMap.get(m.user_id)?.avatar_url,
      })) as Member[];
    },
    enabled: !!selectedChat,
  });

  // Messages
  const { data: messages = [], isLoading: msgsLoading } = useQuery({
    queryKey: ["gc_messages", selectedChat?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("group_chat_messages")
        .select("*")
        .eq("chat_id", selectedChat!.id)
        .order("created_at", { ascending: true })
        .limit(200);
      if (!data?.length) return [];
      const ids = [...new Set(data.map((m) => m.sender_id))];
      const { data: profiles } = await supabase
        .from("profiles_public")
        .select("user_id, username, role, is_premium")
        .in("user_id", ids);
      const map = new Map((profiles || []).map((p: any) => [p.user_id, p]));
      return data.map((m) => ({
        ...m,
        username: map.get(m.sender_id)?.username || "?",
        role: map.get(m.sender_id)?.role,
        is_premium: map.get(m.sender_id)?.is_premium,
      })) as GroupMessage[];
    },
    enabled: !!selectedChat,
    refetchInterval: 10000,
  });

  // Realtime
  useEffect(() => {
    if (!selectedChat || !user) return;
    const channel = supabase
      .channel(`gc_${selectedChat.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "group_chat_messages", filter: `chat_id=eq.${selectedChat.id}` }, () => {
        qc.invalidateQueries({ queryKey: ["gc_messages", selectedChat.id] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selectedChat?.id, user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Create group
  const createMut = useMutation({
    mutationFn: async () => {
      const { data: chat, error } = await supabase
        .from("group_chats")
        .insert({ title: newTitle.trim(), created_by: user!.id } as any)
        .select("id")
        .single();
      if (error) throw error;
      // Add myself as owner
      await supabase.from("group_chat_members").insert({ chat_id: chat.id, user_id: user!.id, role: "owner" } as any);
      // Add selected friends
      for (const fid of selectedFriendIds) {
        await supabase.from("group_chat_members").insert({ chat_id: chat.id, user_id: fid, role: "member" } as any);
      }
      return chat;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["group_chats"] });
      setShowCreate(false);
      setNewTitle("");
      setSelectedFriendIds(new Set());
    },
  });

  // Send message
  const sendMut = useMutation({
    mutationFn: async () => {
      await supabase.from("group_chat_messages").insert({
        chat_id: selectedChat!.id,
        sender_id: user!.id,
        body: messageBody.trim(),
      } as any);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["gc_messages", selectedChat?.id] });
      qc.invalidateQueries({ queryKey: ["group_chats"] });
      setMessageBody("");
    },
  });

  // Add member
  const addMemberMut = useMutation({
    mutationFn: async (friendId: string) => {
      await supabase.from("group_chat_members").insert({ chat_id: selectedChat!.id, user_id: friendId, role: "member" } as any);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["gc_members", selectedChat?.id] });
      setShowAddMember(false);
    },
  });

  // Leave group
  const leaveMut = useMutation({
    mutationFn: async () => {
      await supabase
        .from("group_chat_members")
        .update({ left_at: new Date().toISOString() } as any)
        .eq("chat_id", selectedChat!.id)
        .eq("user_id", user!.id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["group_chats"] });
      setSelectedChat(null);
    },
  });

  const formatTime = (d: string) => {
    const date = new Date(d);
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 86400000);
    if (diff === 0) return date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
    if (diff < 7) return date.toLocaleDateString(undefined, { weekday: "short" }) + " " + date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
    return date.toLocaleDateString(undefined, { day: "numeric", month: "short" });
  };

  const memberIds = useMemo(() => new Set(members.map((m) => m.user_id)), [members]);
  const isOwner = members.find((m) => m.user_id === user?.id)?.role === "owner";
  const availableFriendsForAdd = friends.filter((f) => !memberIds.has(f.user_id));

  // ═══════════ CHAT VIEW ═══════════
  if (selectedChat) {
    return (
      <div className="min-h-screen min-h-[100dvh] relative flex flex-col">
        <header className="sticky top-0 z-20 flex items-center gap-3 px-4 py-3 border-b border-primary/10 bg-background/95 backdrop-blur">
          <Button variant="ghost" size="icon" onClick={() => setSelectedChat(null)}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="text-sm font-bold truncate">{selectedChat.title}</h1>
            <p className="text-xs text-muted-foreground">{members.length} membres</p>
          </div>
          <div className="flex gap-1">
            {isOwner && (
              <Button variant="ghost" size="icon" onClick={() => setShowAddMember(true)}>
                <UserPlus className="h-4 w-4" />
              </Button>
            )}
            <Button variant="ghost" size="icon" className="text-destructive/60 hover:text-destructive" onClick={() => { if (confirm("Quitter ce groupe ?")) leaveMut.mutate(); }}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 pb-36 space-y-2 relative z-10">
          {msgsLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : messages.length === 0 ? (
            <p className="text-center text-muted-foreground text-sm py-12">Aucun message encore</p>
          ) : (
            messages.map((m) => {
              const isMine = m.sender_id === user!.id;
              return (
                <div key={m.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[75%] rounded-2xl px-3.5 py-2 ${isMine ? "bg-primary text-primary-foreground rounded-br-md" : "bg-muted rounded-bl-md"}`}>
                    {!isMine && (
                      <p className="text-[10px] font-semibold mb-0.5 flex items-center gap-1">
                        {m.username} <UserRoleBadge role={m.role} isPremium={m.is_premium} />
                      </p>
                    )}
                    <p className="text-sm whitespace-pre-wrap break-words">{m.body}</p>
                    <span className={`text-[10px] block text-right mt-0.5 ${isMine ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                      {formatTime(m.created_at)}
                    </span>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border/40 bg-background/95 backdrop-blur p-3 pb-[max(0.75rem,calc(env(safe-area-inset-bottom)+0.75rem))] flex gap-2">
          <Input
            value={messageBody}
            onChange={(e) => setMessageBody(e.target.value)}
            placeholder="Message..."
            className="flex-1"
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && messageBody.trim()) { e.preventDefault(); sendMut.mutate(); } }}
          />
          <Button size="icon" disabled={!messageBody.trim() || sendMut.isPending} onClick={() => sendMut.mutate()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>

        {/* Add member dialog */}
        <Dialog open={showAddMember} onOpenChange={setShowAddMember}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Ajouter un membre</DialogTitle>
            </DialogHeader>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {availableFriendsForAdd.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Tous vos amis sont déjà membres</p>
              ) : (
                availableFriendsForAdd.map((f) => (
                  <button
                    key={f.user_id}
                    onClick={() => addMemberMut.mutate(f.user_id)}
                    className="w-full text-left rounded-lg border border-border/50 bg-card p-3 hover:border-primary/40 transition-colors flex items-center gap-3"
                    disabled={addMemberMut.isPending}
                  >
                    <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                      <Users className="h-4 w-4 text-primary" />
                    </div>
                    <span className="text-sm font-medium">{f.username}</span>
                  </button>
                ))
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // ═══════════ LIST VIEW ═══════════
  return (
    <div className="min-h-screen min-h-[100dvh] relative flex flex-col">
      <header className="sticky top-0 z-20 flex items-center gap-3 px-4 py-3 border-b border-primary/10 bg-background/95 backdrop-blur">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-sm font-bold flex-1">Groupes</h1>
        <Button variant="outline" size="sm" className="gap-1" onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4" /> Créer
        </Button>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-1 relative z-10">
        {chatsLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : chats.length === 0 ? (
          <p className="text-center text-muted-foreground text-sm py-12">Aucun groupe pour le moment</p>
        ) : (
          chats.map((chat) => (
            <button
              key={chat.id}
              onClick={() => setSelectedChat(chat)}
              className="w-full text-left rounded-xl border border-border/50 bg-card/80 p-3 hover:border-primary/40 transition-colors flex items-center gap-3"
            >
              <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="font-semibold text-sm truncate block">{chat.title}</span>
                {chat.last_message_at && (
                  <span className="text-[10px] text-muted-foreground">{formatTime(chat.last_message_at)}</span>
                )}
              </div>
            </button>
          ))
        )}
      </div>

      {/* Create dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nouveau groupe</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Nom du groupe"
            />
            <div>
              <p className="text-sm font-medium mb-2">Ajouter des amis</p>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {friends.map((f) => (
                  <button
                    key={f.user_id}
                    onClick={() => {
                      setSelectedFriendIds((prev) => {
                        const n = new Set(prev);
                        n.has(f.user_id) ? n.delete(f.user_id) : n.add(f.user_id);
                        return n;
                      });
                    }}
                    className={`w-full text-left rounded-lg border p-2 flex items-center gap-2 transition-colors ${
                      selectedFriendIds.has(f.user_id) ? "border-primary bg-primary/10" : "border-border/50 bg-card"
                    }`}
                  >
                    <div className="h-7 w-7 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                      <Users className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <span className="text-sm">{f.username}</span>
                    {selectedFriendIds.has(f.user_id) && <span className="ml-auto text-primary text-xs">✓</span>}
                  </button>
                ))}
              </div>
            </div>
            <Button
              onClick={() => createMut.mutate()}
              disabled={!newTitle.trim() || selectedFriendIds.size === 0 || createMut.isPending}
              className="w-full"
            >
              {createMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Créer le groupe"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default GroupChats;
