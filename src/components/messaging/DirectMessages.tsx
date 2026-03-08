import { useState, useEffect, useRef } from "react";
import { useLanguage } from "@/i18n/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, Send, Loader2, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Friend = { user_id: string; username: string; avatar_url: string | null };
type Conversation = Friend & { last_message?: string; last_at?: string; unread_count: number };
type DM = { id: string; sender_id: string; receiver_id: string; body: string; created_at: string; read_at: string | null };

interface DirectMessagesProps {
  onBack: () => void;
}

const DirectMessages = ({ onBack }: DirectMessagesProps) => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
  const [messageBody, setMessageBody] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Get accepted friends
  const { data: friends = [] } = useQuery({
    queryKey: ["dm_friends", user?.id],
    queryFn: async () => {
      const { data: friendships } = await supabase
        .from("friendships")
        .select("requester_id, addressee_id")
        .eq("status", "accepted")
        .or(`requester_id.eq.${user!.id},addressee_id.eq.${user!.id}`);
      if (!friendships || friendships.length === 0) return [];
      const friendIds = friendships.map((f) =>
        f.requester_id === user!.id ? f.addressee_id : f.requester_id
      );
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, username, avatar_url")
        .in("user_id", friendIds);
      return (profiles || []) as Friend[];
    },
    enabled: !!user,
  });

  // Get conversations with last message & unread count
  const { data: conversations = [], isLoading: convsLoading } = useQuery({
    queryKey: ["dm_conversations", user?.id, friends],
    queryFn: async () => {
      if (friends.length === 0) return [];
      const { data: messages } = await supabase
        .from("direct_messages")
        .select("*")
        .or(`sender_id.eq.${user!.id},receiver_id.eq.${user!.id}`)
        .order("created_at", { ascending: false });

      const convMap = new Map<string, { last_message: string; last_at: string; unread_count: number }>();
      (messages || []).forEach((m: any) => {
        const friendId = m.sender_id === user!.id ? m.receiver_id : m.sender_id;
        if (!convMap.has(friendId)) {
          convMap.set(friendId, { last_message: m.body, last_at: m.created_at, unread_count: 0 });
        }
        if (m.receiver_id === user!.id && !m.read_at) {
          const c = convMap.get(friendId)!;
          c.unread_count++;
        }
      });

      // Build conversations: friends with messages first, then others
      const result: Conversation[] = friends.map((f) => {
        const conv = convMap.get(f.user_id);
        return { ...f, last_message: conv?.last_message, last_at: conv?.last_at, unread_count: conv?.unread_count || 0 };
      });
      result.sort((a, b) => {
        if (a.last_at && b.last_at) return new Date(b.last_at).getTime() - new Date(a.last_at).getTime();
        if (a.last_at) return -1;
        if (b.last_at) return 1;
        return (a.username || "").localeCompare(b.username || "");
      });
      return result;
    },
    enabled: !!user && friends.length > 0,
  });

  // Messages for selected conversation
  const { data: messages = [], isLoading: msgsLoading } = useQuery({
    queryKey: ["dm_messages", user?.id, selectedFriend?.user_id],
    queryFn: async () => {
      const { data } = await supabase
        .from("direct_messages")
        .select("*")
        .or(
          `and(sender_id.eq.${user!.id},receiver_id.eq.${selectedFriend!.user_id}),and(sender_id.eq.${selectedFriend!.user_id},receiver_id.eq.${user!.id})`
        )
        .order("created_at", { ascending: true });
      return (data || []) as DM[];
    },
    enabled: !!user && !!selectedFriend,
  });

  // Mark messages as read when opening conversation
  useEffect(() => {
    if (!selectedFriend || !user || messages.length === 0) return;
    const unread = messages.filter((m) => m.receiver_id === user.id && !m.read_at);
    if (unread.length > 0) {
      supabase
        .from("direct_messages")
        .update({ read_at: new Date().toISOString() })
        .in("id", unread.map((m) => m.id))
        .then(() => {
          qc.invalidateQueries({ queryKey: ["dm_conversations"] });
        });
    }
  }, [messages, selectedFriend, user]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Realtime subscription
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("dm_realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "direct_messages" }, (payload) => {
        const msg = payload.new as any;
        if (msg.sender_id === user.id || msg.receiver_id === user.id) {
          qc.invalidateQueries({ queryKey: ["dm_messages"] });
          qc.invalidateQueries({ queryKey: ["dm_conversations"] });
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const sendMut = useMutation({
    mutationFn: async () => {
      await supabase.from("direct_messages").insert({
        sender_id: user!.id,
        receiver_id: selectedFriend!.user_id,
        body: messageBody.trim(),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dm_messages", user?.id, selectedFriend?.user_id] });
      qc.invalidateQueries({ queryKey: ["dm_conversations"] });
      setMessageBody("");
    },
  });

  const formatTime = (d: string) => {
    const date = new Date(d);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / 86400000);
    if (diffDays === 0) return date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
    if (diffDays < 7) return date.toLocaleDateString(undefined, { weekday: "short" }) + " " + date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
    return date.toLocaleDateString(undefined, { day: "numeric", month: "short" });
  };

  // Chat view
  if (selectedFriend) {
    return (
      <div className="min-h-screen relative flex flex-col">
        <header className="sticky top-0 z-20 flex items-center gap-3 px-4 py-3 border-b border-primary/10 bg-background/95 backdrop-blur">
          <Button variant="ghost" size="icon" onClick={() => setSelectedFriend(null)}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {selectedFriend.avatar_url ? (
              <img src={selectedFriend.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover" />
            ) : (
              <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center"><User className="h-4 w-4 text-primary" /></div>
            )}
            <h1 className="text-sm font-bold truncate">{selectedFriend.username}</h1>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto p-4 space-y-2 relative z-10">
          {msgsLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : messages.length === 0 ? (
            <p className="text-center text-muted-foreground text-sm py-12">{t.dm_no_messages as string}</p>
          ) : (
            messages.map((m) => {
              const isMine = m.sender_id === user!.id;
              return (
                <div key={m.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[75%] rounded-2xl px-3.5 py-2 ${isMine ? "bg-primary text-primary-foreground rounded-br-md" : "bg-muted rounded-bl-md"}`}>
                    <p className="text-sm whitespace-pre-wrap break-words">{m.body}</p>
                    <p className={`text-[10px] mt-0.5 ${isMine ? "text-primary-foreground/60" : "text-muted-foreground"}`}>{formatTime(m.created_at)}</p>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>
        <div className="sticky bottom-0 z-20 p-3 border-t border-border/40 bg-background/95 backdrop-blur flex gap-2">
          <Input
            value={messageBody}
            onChange={(e) => setMessageBody(e.target.value)}
            placeholder={t.dm_placeholder as string}
            className="flex-1"
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && messageBody.trim()) { e.preventDefault(); sendMut.mutate(); } }}
          />
          <Button size="icon" disabled={!messageBody.trim() || sendMut.isPending} onClick={() => sendMut.mutate()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  // Conversation list
  return (
    <div className="min-h-screen relative flex flex-col">
      <header className="sticky top-0 z-20 flex items-center gap-3 px-4 py-3 border-b border-primary/10 bg-background/95 backdrop-blur">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-sm font-bold">{t.dm_title as string}</h1>
      </header>
      <div className="flex-1 overflow-y-auto p-4 space-y-1 relative z-10">
        {convsLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : conversations.length === 0 ? (
          <p className="text-center text-muted-foreground text-sm py-12">{t.dm_no_friends as string}</p>
        ) : (
          conversations.map((conv) => (
            <button
              key={conv.user_id}
              onClick={() => setSelectedFriend(conv)}
              className="w-full text-left rounded-xl border border-border/50 bg-card/80 p-3 hover:border-primary/40 transition-colors flex items-center gap-3"
            >
              {conv.avatar_url ? (
                <img src={conv.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover shrink-0" />
              ) : (
                <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                  <User className="h-5 w-5 text-primary" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm truncate">{conv.username}</span>
                  {conv.last_at && <span className="text-[10px] text-muted-foreground shrink-0 ml-2">{formatTime(conv.last_at)}</span>}
                </div>
                {conv.last_message && (
                  <p className="text-xs text-muted-foreground truncate mt-0.5">{conv.last_message}</p>
                )}
              </div>
              {conv.unread_count > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground px-1 shrink-0">
                  {conv.unread_count}
                </span>
              )}
            </button>
          ))
        )}
      </div>
    </div>
  );
};

export default DirectMessages;
