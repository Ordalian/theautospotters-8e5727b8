import { useState, useRef, lazy, Suspense } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useLanguage } from "@/i18n/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Hash, Plus, Send, MessageSquare, Loader2, ChevronLeft, Bell, BellOff, Mail, Trash2, Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useUserRole } from "@/hooks/useUserRole";

const DirectMessages = lazy(() => import("@/components/messaging/DirectMessages"));
import UserRoleBadge from "@/components/UserRoleBadge";

type Channel = { id: string; name: string; slug: string; description: string | null; sort_order: number };
type Topic = { id: string; channel_id: string; user_id: string; title: string; body: string; created_at: string; username?: string; reply_count?: number; role?: string | null; is_premium?: boolean };
type Reply = { id: string; topic_id: string; user_id: string; body: string; created_at: string; username?: string; role?: string | null; is_premium?: boolean };

const MYMEMORY_API = "https://api.mymemory.translated.net/get";

const Messaging = () => {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const { isStaff, isFounder, isAdmin } = useUserRole();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [showNewTopic, setShowNewTopic] = useState(false);
  const [newTopicTitle, setNewTopicTitle] = useState("");
  const [newTopicBody, setNewTopicBody] = useState("");
  const [replyBody, setReplyBody] = useState("");
  const [showDMs, setShowDMs] = useState(false);
  const [translatedMap, setTranslatedMap] = useState<Record<string, string>>({});
  const [showTranslatedIds, setShowTranslatedIds] = useState<Set<string>>(new Set());
  const [translatingId, setTranslatingId] = useState<string | null>(null);

  const translateMessage = async (id: string, text: string) => {
    if (!text.trim()) return;
    const sourceLang = language === "fr" ? "en" : "fr";
    const langpair = `${sourceLang}|${language}`;
    setTranslatingId(id);
    try {
      const res = await fetch(`${MYMEMORY_API}?q=${encodeURIComponent(text)}&langpair=${langpair}`);
      const data = await res.json();
      const translated = data?.responseData?.translatedText;
      if (translated) {
        setTranslatedMap((m) => ({ ...m, [id]: translated }));
        setShowTranslatedIds((s) => new Set(s).add(id));
      }
    } catch {
      // ignore
    } finally {
      setTranslatingId(null);
    }
  };

  // Swipe right to go back to home (only on channel list view)
  const swipeRef = useRef({ startX: 0, startY: 0, locked: null as "h" | "v" | null, delta: 0 });
  const onSwipeStart = (e: React.TouchEvent) => {
    swipeRef.current = { startX: e.touches[0].clientX, startY: e.touches[0].clientY, locked: null, delta: 0 };
  };
  const onSwipeMove = (e: React.TouchEvent) => {
    const dx = e.touches[0].clientX - swipeRef.current.startX;
    const dy = e.touches[0].clientY - swipeRef.current.startY;
    if (!swipeRef.current.locked && (Math.abs(dx) > 10 || Math.abs(dy) > 10)) {
      swipeRef.current.locked = Math.abs(dx) > Math.abs(dy) ? "h" : "v";
    }
    if (swipeRef.current.locked === "h") swipeRef.current.delta = dx;
  };
  const onSwipeEnd = () => {
    if (!selectedChannel && !selectedTopic && !showDMs && swipeRef.current.locked === "h" && swipeRef.current.delta > 80) {
      navigate("/home");
    }
  };

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
      const { data: profiles } = await supabase.from("profiles_public").select("user_id, username, role, is_premium").in("user_id", userIds);
      const profileMap = new Map(profiles?.map((p: any) => [p.user_id, { username: p.username, role: p.role, is_premium: p.is_premium }]) || []);
      const topicIds = topicsData.map((t) => t.id);
      const { data: replies } = await supabase.from("channel_replies").select("topic_id").in("topic_id", topicIds);
      const countMap = new Map<string, number>();
      (replies || []).forEach((r) => countMap.set(r.topic_id, (countMap.get(r.topic_id) || 0) + 1));
      return topicsData.map((t) => ({ ...t, username: profileMap.get(t.user_id)?.username || (t as any).anonymous, role: profileMap.get(t.user_id)?.role ?? null, is_premium: profileMap.get(t.user_id)?.is_premium ?? false, reply_count: countMap.get(t.id) || 0 })) as Topic[];
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
      const { data: profiles } = await supabase.from("profiles_public").select("user_id, username, role, is_premium").in("user_id", userIds);
      const profileMap = new Map(profiles?.map((p: any) => [p.user_id, { username: p.username, role: p.role, is_premium: p.is_premium }]) || []);
      return data.map((r) => ({ ...r, username: profileMap.get(r.user_id)?.username || null, role: profileMap.get(r.user_id)?.role ?? null, is_premium: profileMap.get(r.user_id)?.is_premium ?? false })) as Reply[];
    },
    enabled: !!selectedTopic,
  });

  // Channel subscriptions
  const { data: channelSubscriptions = [] } = useQuery({
    queryKey: ["channel_subs", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("channel_subscriptions")
        .select("channel_id")
        .eq("user_id", user!.id);
      return (data || []).map((s: any) => s.channel_id);
    },
    enabled: !!user,
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

  const deleteTopicMut = useMutation({
    mutationFn: async (topicId: string) => {
      await supabase.from("channel_replies").delete().eq("topic_id", topicId);
      await supabase.from("channel_topics").delete().eq("id", topicId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["channel_topics", selectedChannel?.id] });
      setSelectedTopic(null);
    },
  });

  const deleteReplyMut = useMutation({
    mutationFn: async (replyId: string) => {
      await supabase.from("channel_replies").delete().eq("id", replyId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["channel_replies", selectedTopic?.id] });
      qc.invalidateQueries({ queryKey: ["channel_topics", selectedChannel?.id] });
    },
  });

  const isSubscribed = selectedChannel ? channelSubscriptions.includes(selectedChannel.id) : false;

  const toggleSubscription = useMutation({
    mutationFn: async () => {
      if (isSubscribed) {
        await supabase.from("channel_subscriptions").delete().eq("user_id", user!.id).eq("channel_id", selectedChannel!.id);
      } else {
        await supabase.from("channel_subscriptions").insert({ user_id: user!.id, channel_id: selectedChannel!.id } as any);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["channel_subs", user?.id] });
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

  // DM view
  if (showDMs) {
    return (
      <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>}>
        <DirectMessages onBack={() => setShowDMs(false)} />
      </Suspense>
    );
  }

  // Reply thread view
  if (selectedTopic) {
    return (
      <div className="min-h-screen min-h-[100dvh] relative flex flex-col">
        <header className="sticky top-0 z-20 flex items-center gap-3 px-4 py-3 border-b border-primary/10 bg-background/95 backdrop-blur">
          <Button variant="ghost" size="icon" onClick={() => setSelectedTopic(null)}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="text-sm font-bold truncate">{selectedTopic.title}</h1>
            <p className="text-xs text-muted-foreground flex items-center gap-1">par {selectedTopic.username || t.anonymous as string} <UserRoleBadge role={selectedTopic.role} isPremium={selectedTopic.is_premium} /></p>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto p-4 pb-36 space-y-3 relative z-10">
          <div className="rounded-xl border border-primary/20 bg-card/90 p-4">
            <div className="flex items-center justify-between mb-1 flex-wrap gap-x-2 gap-y-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <p className="text-xs text-muted-foreground flex items-center gap-1">{selectedTopic.username || t.anonymous as string} <UserRoleBadge role={selectedTopic.role} isPremium={selectedTopic.is_premium} /> • {formatDate(selectedTopic.created_at)}</p>
                <button
                  type="button"
                  className="text-xs text-primary hover:underline flex items-center gap-0.5 shrink-0"
                  onClick={() => {
                    const id = `topic-${selectedTopic.id}`;
                    if (showTranslatedIds.has(id)) {
                      setShowTranslatedIds((s) => { const n = new Set(s); n.delete(id); return n; });
                    } else if (translatedMap[id]) {
                      setShowTranslatedIds((s) => new Set(s).add(id));
                    } else {
                      translateMessage(id, selectedTopic.body);
                    }
                  }}
                  disabled={translatingId === `topic-${selectedTopic.id}`}
                >
                  {translatingId === `topic-${selectedTopic.id}` ? <Loader2 className="h-3 w-3 animate-spin" /> : <Languages className="h-3 w-3" />}
                  <span className="ml-0.5">{showTranslatedIds.has(`topic-${selectedTopic.id}`) ? (t.msg_original as string) : (t.msg_translate as string)}</span>
                </button>
              </div>
              {(selectedTopic.user_id === user?.id || isFounder || (isAdmin && (!selectedTopic.role || selectedTopic.role === "user"))) && (
                <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive/60 hover:text-destructive" onClick={() => { if (confirm("Supprimer ce sujet et toutes ses réponses ?")) deleteTopicMut.mutate(selectedTopic.id); }}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
            <p className="text-sm whitespace-pre-wrap">
              {showTranslatedIds.has(`topic-${selectedTopic.id}`) && translatedMap[`topic-${selectedTopic.id}`]
                ? translatedMap[`topic-${selectedTopic.id}`]
                : selectedTopic.body}
            </p>
          </div>
          {repliesLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : (
            replies.map((r) => {
              const replyKey = `reply-${r.id}`;
              return (
                <div key={r.id} className="rounded-lg border border-border/40 bg-card/70 p-3 ml-4">
                  <div className="flex items-center justify-between mb-1 flex-wrap gap-x-2 gap-y-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="text-xs text-muted-foreground flex items-center gap-1">{r.username || t.anonymous as string} <UserRoleBadge role={r.role} isPremium={r.is_premium} /> • {formatDate(r.created_at)}</p>
                      <button
                        type="button"
                        className="text-xs text-primary hover:underline flex items-center gap-0.5 shrink-0"
                        onClick={() => {
                          if (showTranslatedIds.has(replyKey)) {
                            setShowTranslatedIds((s) => { const n = new Set(s); n.delete(replyKey); return n; });
                          } else if (translatedMap[replyKey]) {
                            setShowTranslatedIds((s) => new Set(s).add(replyKey));
                          } else {
                            translateMessage(replyKey, r.body);
                          }
                        }}
                        disabled={translatingId === replyKey}
                      >
                        {translatingId === replyKey ? <Loader2 className="h-3 w-3 animate-spin" /> : <Languages className="h-3 w-3" />}
                        <span className="ml-0.5">{showTranslatedIds.has(replyKey) ? (t.msg_original as string) : (t.msg_translate as string)}</span>
                      </button>
                    </div>
                    {(r.user_id === user?.id || isFounder || (isAdmin && (!r.role || r.role === "user"))) && (
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive/60 hover:text-destructive" onClick={() => { if (confirm("Supprimer cette réponse ?")) deleteReplyMut.mutate(r.id); }}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                  <p className="text-sm whitespace-pre-wrap">
                    {showTranslatedIds.has(replyKey) && translatedMap[replyKey] ? translatedMap[replyKey] : r.body}
                  </p>
                </div>
              );
            })
          )}
        </div>
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border/40 bg-background/95 backdrop-blur p-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] flex gap-2">
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

  // Topics list view (with bell)
  if (selectedChannel) {
    return (
      <div className="min-h-screen min-h-[100dvh] relative flex flex-col">
        <header className="sticky top-0 z-20 flex items-center gap-3 px-4 py-3 border-b border-primary/10 bg-background/95 backdrop-blur">
          <Button variant="ghost" size="icon" onClick={() => { setSelectedChannel(null); setShowNewTopic(false); }}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="text-sm font-bold flex items-center gap-1.5"><Hash className="h-4 w-4 text-primary" />{selectedChannel.name}</h1>
            {selectedChannel.description && <p className="text-xs text-muted-foreground truncate">{selectedChannel.description}</p>}
          </div>
          <Button
            size="icon"
            variant={isSubscribed ? "default" : "ghost"}
            className="shrink-0"
            onClick={() => toggleSubscription.mutate()}
            disabled={toggleSubscription.isPending}
            title={isSubscribed ? (t.notif_channel_unsubscribe as string) : (t.notif_channel_subscribe as string)}
          >
            {isSubscribed ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4 text-muted-foreground" />}
          </Button>
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
                  <span className="flex items-center gap-1">{topic.username || t.anonymous as string} <UserRoleBadge role={topic.role} isPremium={topic.is_premium} /></span>
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
    <div
      className="min-h-screen min-h-[100dvh] relative"
      onTouchStart={onSwipeStart}
      onTouchMove={onSwipeMove}
      onTouchEnd={onSwipeEnd}
    >
      <header className="sticky top-0 z-20 flex items-center justify-between px-6 py-3 border-b border-primary/10 bg-background/95 backdrop-blur">
        <Link
          to="/home"
          className="flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors"
        >
          <ChevronLeft className="h-4 w-4 animate-[nudge-left_2s_ease-in-out_infinite]" />
          <span className="text-xs font-medium">{t.dash_home as string}</span>
        </Link>
        <div className="flex items-center gap-2">
          <div className="relative">
            <MessageSquare className="h-5 w-5 text-primary" />
            {unreadNotifs.length > 0 && (
              <span className="absolute -top-1.5 -right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground px-0.5">
                {unreadNotifs.length > 99 ? "99+" : unreadNotifs.length}
              </span>
            )}
          </div>
          <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">{t.msg_title as string}</h1>
        </div>
      </header>
      <div className="p-5 max-w-2xl mx-auto relative z-10 space-y-2">
        {/* DM Tile */}
        <button
          onClick={() => setShowDMs(true)}
          className="w-full text-left rounded-xl border border-primary/30 bg-gradient-to-r from-primary/10 to-primary/5 p-4 hover:border-primary/50 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center gap-3 mb-3"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/20 shrink-0">
            <Mail className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-bold text-sm">{t.msg_messages as string}</h3>
            <p className="text-xs text-muted-foreground">{t.msg_messages_desc as string}</p>
          </div>
        </button>
        {channels.map((ch) => {
          const slugKey = ch.slug.replace(/-/g, "_");
          const nameKey = `channel_${slugKey}_name` as keyof typeof t;
          const descKey = `channel_${slugKey}_desc` as keyof typeof t;
          const displayName = typeof t[nameKey] === "string" ? (t[nameKey] as string) : ch.name;
          const displayDesc = typeof t[descKey] === "string" ? (t[descKey] as string) : ch.description;
          return (
            <button
              key={ch.id}
              onClick={() => setSelectedChannel(ch)}
              className="w-full text-left rounded-xl border border-border/50 bg-card/80 p-4 hover:border-primary/40 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center gap-3"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15 shrink-0">
                <Hash className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-bold text-sm">{displayName}</h3>
                {(displayDesc ?? ch.description) && (
                  <p className="text-xs text-muted-foreground truncate">{displayDesc ?? ch.description ?? ""}</p>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default Messaging;
