import { useState, useEffect } from "react";
import { useLanguage } from "@/i18n/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Hash, Plus, Send, MessageSquare, Loader2, ChevronLeft, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";


type Channel = { id: string; name: string; slug: string; description: string | null; sort_order: number };
type Topic = { id: string; channel_id: string; user_id: string; title: string; body: string; created_at: string; username?: string; reply_count?: number };
type Reply = { id: string; topic_id: string; user_id: string; body: string; created_at: string; username?: string };

const Messaging = () => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const qc = useQueryClient();

  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [showNewTopic, setShowNewTopic] = useState(false);
  const [newTopicTitle, setNewTopicTitle] = useState("");
  const [newTopicBody, setNewTopicBody] = useState("");
  const [replyBody, setReplyBody] = useState("");

  // Unread topic_reply notifications
  const { data: unreadNotifs = [] } = useQuery({
    queryKey: ["msg_notifications", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("notifications")
        .select("id, data, read_at")
        .eq("user_id", user!.id)
        .eq("type", "topic_reply")
        .is("read_at", null)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  // Channels
  const { data: channels = [] } = useQuery({
    queryKey: ["channels"],
    queryFn: async () => {
      const { data } = await supabase.from("channels").select("*").order("sort_order");
      return (data || []) as Channel[];
    },
  });

  // Topics for selected channel
  const { data: topics = [], isLoading: topicsLoading } = useQuery({
    queryKey: ["channel_topics", selectedChannel?.id],
    queryFn: async () => {
      const { data: topicsData } = await supabase
        .from("channel_topics")
        .select("*")
        .eq("channel_id", selectedChannel!.id)
        .order("created_at", { ascending: false });
      if (!topicsData || topicsData.length === 0) return [];
      const userIds = [...new Set(topicsData.map((t) => t.user_id))];
      const { data: profiles } = await supabase.from("profiles").select("user_id, username").in("user_id", userIds);
      const profileMap = new Map(profiles?.map((p) => [p.user_id, p.username]) || []);
      // Get reply counts
      const topicIds = topicsData.map((t) => t.id);
      const { data: replies } = await supabase.from("channel_replies").select("topic_id").in("topic_id", topicIds);
      const countMap = new Map<string, number>();
      (replies || []).forEach((r) => countMap.set(r.topic_id, (countMap.get(r.topic_id) || 0) + 1));
      return topicsData.map((t) => ({ ...t, username: profileMap.get(t.user_id) || (t as any).anonymous, reply_count: countMap.get(t.id) || 0 })) as Topic[];
    },
    enabled: !!selectedChannel,
  });

  // Replies for selected topic
  const { data: replies = [], isLoading: repliesLoading } = useQuery({
    queryKey: ["channel_replies", selectedTopic?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("channel_replies")
        .select("*")
        .eq("topic_id", selectedTopic!.id)
        .order("created_at", { ascending: true });
      if (!data || data.length === 0) return [];
      const userIds = [...new Set(data.map((r) => r.user_id))];
      const { data: profiles } = await supabase.from("profiles").select("user_id, username").in("user_id", userIds);
      const profileMap = new Map(profiles?.map((p) => [p.user_id, p.username]) || []);
      return data.map((r) => ({ ...r, username: profileMap.get(r.user_id) || null })) as Reply[];
    },
    enabled: !!selectedTopic,
  });

  const createTopicMut = useMutation({
    mutationFn: async () => {
      await supabase.from("channel_topics").insert({
        channel_id: selectedChannel!.id,
        user_id: user!.id,
        title: newTopicTitle.trim(),
        body: newTopicBody.trim(),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["channel_topics", selectedChannel?.id] });
      setShowNewTopic(false);
      setNewTopicTitle("");
      setNewTopicBody("");
    },
  });

  const createReplyMut = useMutation({
    mutationFn: async () => {
      await supabase.from("channel_replies").insert({
        topic_id: selectedTopic!.id,
        user_id: user!.id,
        body: replyBody.trim(),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["channel_replies", selectedTopic?.id] });
      qc.invalidateQueries({ queryKey: ["channel_topics", selectedChannel?.id] });
      setReplyBody("");
    },
  });

  // Mark notifications as read when opening a topic
  const markTopicRead = async (topicId: string) => {
    const toMark = unreadNotifs.filter((n) => {
      const d = n.data as any;
      return d?.topic_id === topicId;
    });
    if (toMark.length > 0) {
      await supabase
        .from("notifications")
        .update({ read_at: new Date().toISOString() })
        .in("id", toMark.map((n) => n.id));
      qc.invalidateQueries({ queryKey: ["msg_notifications"] });
    }
  };

  const formatDate = (d: string) => {
    const date = new Date(d);
    return date.toLocaleDateString(undefined, { day: "numeric", month: "short" }) + " " + date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  };

  // Reply thread view
  if (selectedTopic) {
    return (
      <div className="min-h-screen relative flex flex-col">
        <header className="sticky top-0 z-20 flex items-center gap-3 px-4 py-3 border-b border-primary/10 bg-background/95 backdrop-blur">
          <Button variant="ghost" size="icon" onClick={() => setSelectedTopic(null)}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="text-sm font-bold truncate">{selectedTopic.title}</h1>
            <p className="text-xs text-muted-foreground">par {selectedTopic.username || t.anonymous as string}</p>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto p-4 space-y-3 relative z-10">
          {/* Original post */}
          <div className="rounded-xl border border-primary/20 bg-card/90 p-4">
            <p className="text-xs text-muted-foreground mb-1">{selectedTopic.username || t.anonymous as string} • {formatDate(selectedTopic.created_at)}</p>
            <p className="text-sm whitespace-pre-wrap">{selectedTopic.body}</p>
          </div>
          {repliesLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : (
            replies.map((r) => (
              <div key={r.id} className="rounded-lg border border-border/40 bg-card/70 p-3 ml-4">
                <p className="text-xs text-muted-foreground mb-1">{r.username || t.anonymous as string} • {formatDate(r.created_at)}</p>
                <p className="text-sm whitespace-pre-wrap">{r.body}</p>
              </div>
            ))
          )}
        </div>
        <div className="sticky bottom-0 z-20 p-3 border-t border-border/40 bg-background/95 backdrop-blur flex gap-2">
          <Input
            value={replyBody}
            onChange={(e) => setReplyBody(e.target.value)}
            placeholder={t.msg_reply_placeholder as string}
            className="flex-1"
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && replyBody.trim()) { e.preventDefault(); createReplyMut.mutate(); } }}
          />
          <Button size="icon" disabled={!replyBody.trim() || createReplyMut.isPending} onClick={() => createReplyMut.mutate()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  // Topics list view
  if (selectedChannel) {
    return (
      <div className="min-h-screen relative flex flex-col">
        <header className="sticky top-0 z-20 flex items-center gap-3 px-4 py-3 border-b border-primary/10 bg-background/95 backdrop-blur">
          <Button variant="ghost" size="icon" onClick={() => { setSelectedChannel(null); setShowNewTopic(false); }}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="text-sm font-bold flex items-center gap-1.5"><Hash className="h-4 w-4 text-primary" />{selectedChannel.name}</h1>
            {selectedChannel.description && <p className="text-xs text-muted-foreground truncate">{selectedChannel.description}</p>}
          </div>
          <Button size="sm" variant="outline" onClick={() => setShowNewTopic(true)} className="shrink-0">
            <Plus className="h-4 w-4 mr-1" />{t.msg_new_topic as string}
          </Button>
        </header>
        <div className="flex-1 overflow-y-auto p-4 space-y-2 relative z-10">
          {showNewTopic && (
            <div className="rounded-xl border border-primary/30 bg-card/90 p-4 space-y-3 mb-4">
              <Input value={newTopicTitle} onChange={(e) => setNewTopicTitle(e.target.value)} placeholder={t.msg_topic_title as string} />
              <textarea
                value={newTopicBody}
                onChange={(e) => setNewTopicBody(e.target.value)}
                placeholder={t.msg_topic_body as string}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[80px] resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              <div className="flex gap-2 justify-end">
                <Button variant="ghost" size="sm" onClick={() => setShowNewTopic(false)}>{t.cancel as string}</Button>
                <Button size="sm" disabled={!newTopicTitle.trim() || createTopicMut.isPending} onClick={() => createTopicMut.mutate()}>
                  {t.msg_publish as string}
                </Button>
              </div>
            </div>
          )}
          {topicsLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : topics.length === 0 ? (
            <p className="text-center text-muted-foreground text-sm py-12">{t.msg_no_topics as string}</p>
          ) : (
            topics.map((topic) => (
              <button
                key={topic.id}
                onClick={() => { markTopicRead(topic.id); setSelectedTopic(topic); }}
                className={`w-full text-left rounded-xl border bg-card/80 p-4 hover:border-primary/40 transition-colors ${unreadNotifs.some((n) => (n.data as any)?.topic_id === topic.id) ? "border-primary/50 ring-1 ring-primary/20" : "border-border/50"}`}
              >
                <h3 className="font-semibold text-sm flex items-center gap-1.5">
                  {unreadNotifs.some((n) => (n.data as any)?.topic_id === topic.id) && <span className="h-2 w-2 rounded-full bg-primary shrink-0" />}
                  {topic.title}
                </h3>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{topic.body}</p>
                <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                  <span>{topic.username || t.anonymous as string}</span>
                  <span>•</span>
                  <span>{formatDate(topic.created_at)}</span>
                  <span className="flex items-center gap-1 ml-auto"><MessageSquare className="h-3 w-3" />{topic.reply_count || 0}</span>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    );
  }

  // Channel list view
  return (
    <div className="min-h-screen relative">
      <header className="sticky top-0 z-20 flex items-center gap-3 px-6 py-3 border-b border-primary/10 bg-background/95 backdrop-blur">
        <div className="relative">
          <MessageSquare className="h-5 w-5 text-primary" />
          {unreadNotifs.length > 0 && (
            <span className="absolute -top-1.5 -right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground px-0.5">
              {unreadNotifs.length > 99 ? "99+" : unreadNotifs.length}
            </span>
          )}
        </div>
        <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">{t.msg_title as string}</h1>
      </header>
      <div className="p-5 max-w-2xl mx-auto relative z-10 space-y-2">
        {channels.map((ch) => (
          <button
            key={ch.id}
            onClick={() => setSelectedChannel(ch)}
            className="w-full text-left rounded-xl border border-border/50 bg-card/80 p-4 hover:border-primary/40 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center gap-3"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15 shrink-0">
              <Hash className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-bold text-sm">{ch.name}</h3>
              {ch.description && <p className="text-xs text-muted-foreground truncate">{ch.description}</p>}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default Messaging;
