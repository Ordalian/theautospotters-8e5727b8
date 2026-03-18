import { useState, useEffect, useRef, useMemo } from "react";
import { useLanguage } from "@/i18n/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { trackFeature } from "@/hooks/useTrackFeature";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, Send, Loader2, User, Plus, X, Trash2, Search, Check, CheckCheck, Ban, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { resizeImage } from "@/lib/imageUtils";
import UserRoleBadge from "@/components/UserRoleBadge";
import { useUserRole } from "@/hooks/useUserRole";

type ProfileInfo = { user_id: string; username: string; avatar_url: string | null; role?: string | null; is_premium?: boolean };
type Friend = ProfileInfo;
type ConvStatus = "accepted" | "pending" | "blocked" | "friend";
type Conversation = Friend & {
  last_message?: string;
  last_at?: string;
  last_sender_id?: string;
  unread_count: number;
  convStatus: ConvStatus;
  has_incoming: boolean;
  has_outgoing: boolean;
};
type DM = { id: string; sender_id: string; receiver_id: string; body: string; created_at: string; read_at: string | null; image_url: string | null; video_url: string | null };
type DmConvStatus = { user_id: string; other_user_id: string; status: string };

interface DirectMessagesProps {
  onBack: () => void;
}

const MAX_VIDEO_SIZE = 15 * 1024 * 1024;
const MAX_VIDEO_DURATION = 15;

const DirectMessages = ({ onBack }: DirectMessagesProps) => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { isFounder, isAdmin } = useUserRole();
  const qc = useQueryClient();
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
  const [messageBody, setMessageBody] = useState("");
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<"image" | "video" | null>(null);
  const [uploading, setUploading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ─── Friends ───
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
        .from("profiles_public")
        .select("user_id, username, avatar_url, role, is_premium")
        .in("user_id", friendIds);
      return (profiles || []) as Friend[];
    },
    enabled: !!user,
  });

  const friendIdSet = useMemo(() => new Set(friends.map((f) => f.user_id)), [friends]);

  // ─── DM conversation statuses (accept/block) ───
  const { data: convStatuses = [] } = useQuery({
    queryKey: ["dm_conv_statuses", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("dm_conversation_status")
        .select("user_id, other_user_id, status")
        .eq("user_id", user!.id);
      return (data || []) as DmConvStatus[];
    },
    enabled: !!user,
  });

  const convStatusMap = useMemo(() => {
    const m = new Map<string, string>();
    convStatuses.forEach((s) => m.set(s.other_user_id, s.status));
    return m;
  }, [convStatuses]);

  const getConvStatus = (otherId: string): ConvStatus => {
    if (friendIdSet.has(otherId)) return "friend";
    return (convStatusMap.get(otherId) as ConvStatus) || "pending";
  };

  // ─── Conversations (ONLY from actual messages) ───
  const { data: conversations = [], isLoading: convsLoading } = useQuery({
    queryKey: ["dm_conversations", user?.id, friends, convStatuses],
    queryFn: async () => {
      const { data: messages } = await supabase
        .from("direct_messages")
        .select("id, sender_id, receiver_id, body, created_at, read_at, image_url, video_url")
        .or(`sender_id.eq.${user!.id},receiver_id.eq.${user!.id}`)
        .order("created_at", { ascending: false });

      if (!messages || messages.length === 0) return [];

      const convMap = new Map<string, {
        last_message: string;
        last_at: string;
        last_sender_id: string;
        unread_count: number;
        has_incoming: boolean;
        has_outgoing: boolean;
      }>();

      messages.forEach((m) => {
        const otherId = m.sender_id === user!.id ? m.receiver_id : m.sender_id;
        const entry = convMap.get(otherId);

        if (!entry) {
          const preview = m.image_url ? "📷 Photo" : m.video_url ? "🎥 Vidéo" : m.body;
          convMap.set(otherId, {
            last_message: preview,
            last_at: m.created_at,
            last_sender_id: m.sender_id,
            unread_count: m.receiver_id === user!.id && !m.read_at ? 1 : 0,
            has_incoming: m.receiver_id === user!.id,
            has_outgoing: m.sender_id === user!.id,
          });
          return;
        }

        if (m.receiver_id === user!.id && !m.read_at) {
          entry.unread_count += 1;
        }
        if (m.receiver_id === user!.id) entry.has_incoming = true;
        if (m.sender_id === user!.id) entry.has_outgoing = true;
      });

      const friendMap = new Map(friends.map((f) => [f.user_id, f]));
      const partnerIds = [...convMap.keys()];

      const missingIds = partnerIds.filter((id) => !friendMap.has(id));
      const extraProfiles = new Map<string, ProfileInfo>();
      if (missingIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles_public")
          .select("user_id, username, avatar_url, role, is_premium")
          .in("user_id", missingIds);
        (profiles || []).forEach((p: any) => extraProfiles.set(p.user_id, p));
      }

      const result: Conversation[] = [];
      for (const id of partnerIds) {
        const profile = friendMap.get(id) || extraProfiles.get(id);
        if (!profile) continue;
        const status = getConvStatus(id);
        if (status === "blocked") continue;
        const conv = convMap.get(id)!;
        result.push({
          ...profile,
          last_message: conv.last_message,
          last_at: conv.last_at,
          last_sender_id: conv.last_sender_id,
          unread_count: conv.unread_count,
          convStatus: status,
          has_incoming: conv.has_incoming,
          has_outgoing: conv.has_outgoing,
        });
      }

      result.sort((a, b) => {
        if (a.last_at && b.last_at) return new Date(b.last_at).getTime() - new Date(a.last_at).getTime();
        return 0;
      });
      return result;
    },
    enabled: !!user,
  });

  // Split conversations into active and pending requests
  const activeConversations = useMemo(
    () => conversations.filter((c) => c.convStatus === "friend" || c.convStatus === "accepted" || (c.convStatus === "pending" && c.last_sender_id === user?.id)),
    [conversations, user?.id]
  );
  const pendingRequests = useMemo(
    () => conversations.filter((c) => c.convStatus === "pending" && c.last_sender_id !== user?.id),
    [conversations, user?.id]
  );

  // ─── Messages for selected conversation ───
  const selectedConvStatus = selectedFriend ? getConvStatus(selectedFriend.user_id) : "friend";
  const isConversationAccepted = selectedConvStatus === "friend" || selectedConvStatus === "accepted";

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

  // ─── Mark as read ONLY if conversation is accepted ───
  useEffect(() => {
    if (!selectedFriend || !user || messages.length === 0) return;
    if (!isConversationAccepted) return;
    const unread = messages.filter((m) => m.receiver_id === user.id && !m.read_at);
    if (unread.length > 0) {
      supabase
        .from("direct_messages")
        .update({ read_at: new Date().toISOString() })
        .in("id", unread.map((m) => m.id))
        .then(() => {
          qc.invalidateQueries({ queryKey: ["dm_conversations"] });
          qc.invalidateQueries({ queryKey: ["dm_unread_count"] });
          qc.invalidateQueries({ queryKey: ["dm_messages", user.id, selectedFriend.user_id] });
        });
    }
  }, [messages, selectedFriend, user, isConversationAccepted]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ─── Realtime ───
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("dm_realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "direct_messages" }, (payload) => {
        const msg = (payload.new || payload.old) as any;
        if (msg?.sender_id === user.id || msg?.receiver_id === user.id) {
          qc.invalidateQueries({ queryKey: ["dm_messages"] });
          qc.invalidateQueries({ queryKey: ["dm_conversations"] });
          qc.invalidateQueries({ queryKey: ["dm_unread_count"] });
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  // ─── Accept / Block conversation ───
  const acceptConversation = async (otherId: string) => {
    const existing = convStatusMap.get(otherId);
    if (existing) {
      await supabase
        .from("dm_conversation_status")
        .update({ status: "accepted", updated_at: new Date().toISOString() } as any)
        .eq("user_id", user!.id)
        .eq("other_user_id", otherId);
    } else {
      await supabase.from("dm_conversation_status").insert({
        user_id: user!.id,
        other_user_id: otherId,
        status: "accepted",
      } as any);
    }
    qc.invalidateQueries({ queryKey: ["dm_conv_statuses"] });
    qc.invalidateQueries({ queryKey: ["dm_conversations"] });
    const unread = messages.filter((m) => m.receiver_id === user!.id && !m.read_at);
    if (unread.length > 0) {
      await supabase
        .from("direct_messages")
        .update({ read_at: new Date().toISOString() })
        .in("id", unread.map((m) => m.id));
      qc.invalidateQueries({ queryKey: ["dm_messages"] });
      qc.invalidateQueries({ queryKey: ["dm_unread_count"] });
    }
  };

  const blockConversation = async (otherId: string) => {
    const existing = convStatusMap.get(otherId);
    if (existing) {
      await supabase
        .from("dm_conversation_status")
        .update({ status: "blocked", updated_at: new Date().toISOString() } as any)
        .eq("user_id", user!.id)
        .eq("other_user_id", otherId);
    } else {
      await supabase.from("dm_conversation_status").insert({
        user_id: user!.id,
        other_user_id: otherId,
        status: "blocked",
      } as any);
    }
    qc.invalidateQueries({ queryKey: ["dm_conv_statuses"] });
    qc.invalidateQueries({ queryKey: ["dm_conversations"] });
    setSelectedFriend(null);
  };

  // ─── Media handling ───
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type.startsWith("image/")) {
      setMediaFile(file);
      setMediaType("image");
      setMediaPreview(URL.createObjectURL(file));
    } else if (file.type.startsWith("video/")) {
      if (file.size > MAX_VIDEO_SIZE) {
        alert(t.dm_video_too_large as string);
        return;
      }
      const video = document.createElement("video");
      video.preload = "metadata";
      video.onloadedmetadata = () => {
        URL.revokeObjectURL(video.src);
        if (video.duration > MAX_VIDEO_DURATION) {
          alert(t.dm_video_too_long as string);
          return;
        }
        setMediaFile(file);
        setMediaType("video");
        setMediaPreview(URL.createObjectURL(file));
      };
      video.src = URL.createObjectURL(file);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const clearMedia = () => {
    if (mediaPreview) URL.revokeObjectURL(mediaPreview);
    setMediaFile(null);
    setMediaPreview(null);
    setMediaType(null);
  };

  const uploadMedia = async (file: File, type: "image" | "video"): Promise<string> => {
    let uploadFile = file;
    if (type === "image") {
      const base64 = await resizeImage(file, 1200, 0.8);
      const res = await fetch(base64);
      const blob = await res.blob();
      uploadFile = new File([blob], file.name, { type: "image/jpeg" });
    }
    const ext = type === "image" ? "jpg" : file.name.split(".").pop() || "mp4";
    const path = `${user!.id}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("dm-media").upload(path, uploadFile);
    if (error) throw error;
    const { data: urlData } = supabase.storage.from("dm-media").getPublicUrl(path);
    return urlData.publicUrl;
  };

  const sendMut = useMutation({
    mutationFn: async () => {
      setUploading(true);
      let image_url: string | null = null;
      let video_url: string | null = null;
      if (mediaFile && mediaType === "image") {
        image_url = await uploadMedia(mediaFile, "image");
      } else if (mediaFile && mediaType === "video") {
        video_url = await uploadMedia(mediaFile, "video");
      }
      await supabase.from("direct_messages").insert({
        sender_id: user!.id,
        receiver_id: selectedFriend!.user_id,
        body: messageBody.trim() || (image_url ? "📷" : video_url ? "🎥" : ""),
        image_url,
        video_url,
      } as any);
    },
    onSuccess: () => {
      trackFeature("dm_sent");
      qc.invalidateQueries({ queryKey: ["dm_messages", user?.id, selectedFriend?.user_id] });
      qc.invalidateQueries({ queryKey: ["dm_conversations"] });
      setMessageBody("");
      clearMedia();
      setUploading(false);
    },
    onError: () => {
      setUploading(false);
    },
  });

  const canSend = (messageBody.trim() || mediaFile) && !uploading && !sendMut.isPending;

  const formatTime = (d: string) => {
    const date = new Date(d);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / 86400000);
    if (diffDays === 0) return date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
    if (diffDays < 7) return date.toLocaleDateString(undefined, { weekday: "short" }) + " " + date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
    return date.toLocaleDateString(undefined, { day: "numeric", month: "short" });
  };

  // ─── Search ───
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery.trim()), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { data: searchResults = [], isLoading: searchLoading } = useQuery({
    queryKey: ["dm_search_users", debouncedSearch],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles_public")
        .select("user_id, username, avatar_url, role, is_premium")
        .neq("user_id", user!.id)
        .ilike("username", `%${debouncedSearch}%`)
        .limit(15);
      return (data || []) as ProfileInfo[];
    },
    enabled: !!user && debouncedSearch.length >= 2,
    staleTime: 10_000,
  });

  // ─── Full-screen image viewer ───
  const [viewingImage, setViewingImage] = useState<string | null>(null);

  // ═══════════════════════════════════════
  //  CHAT VIEW
  // ═══════════════════════════════════════
  if (selectedFriend) {
    const isPending = selectedConvStatus === "pending";
    const lastMessage = messages[messages.length - 1];
    const lastMessageIsMine = lastMessage?.sender_id === user!.id;

    return (
      <div className="min-h-screen min-h-[100dvh] relative flex flex-col">
        <header className="sticky top-0 z-20 flex items-center gap-3 px-4 py-3 border-b border-primary/10 bg-background/95 backdrop-blur">
          <Button variant="ghost" size="icon" onClick={() => { setSelectedFriend(null); clearMedia(); }}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {selectedFriend.avatar_url ? (
              <img src={selectedFriend.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover" />
            ) : (
              <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center"><User className="h-4 w-4 text-primary" /></div>
            )}
            <h1 className="text-sm font-bold truncate flex items-center gap-1">{selectedFriend.username} <UserRoleBadge role={selectedFriend.role} isPremium={selectedFriend.is_premium} /></h1>
          </div>
        </header>

        {/* Pending request banner */}
        {isPending && messages.length > 0 && !lastMessageIsMine && (
          <div className="px-4 py-3 bg-amber-500/10 border-b border-amber-500/20 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{t.dm_request_title as string || "Demande de message"}</p>
              <p className="text-xs text-muted-foreground">{t.dm_request_desc as string || "Acceptez pour que vos réponses et confirmations de lecture soient visibles."}</p>
            </div>
            <div className="flex gap-2 shrink-0">
              <Button size="sm" variant="outline" className="gap-1 text-destructive border-destructive/30 hover:bg-destructive/10" onClick={() => blockConversation(selectedFriend.user_id)}>
                <Ban className="h-3.5 w-3.5" /> {t.dm_block as string || "Bloquer"}
              </Button>
              <Button size="sm" className="gap-1" onClick={() => acceptConversation(selectedFriend.user_id)}>
                <UserCheck className="h-3.5 w-3.5" /> {t.dm_accept as string || "Accepter"}
              </Button>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4 pb-36 space-y-2 relative z-10">
          {msgsLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : messages.length === 0 ? (
            <p className="text-center text-muted-foreground text-sm py-12">{t.dm_no_messages as string}</p>
          ) : (
            messages.map((m) => {
              const isMine = m.sender_id === user!.id;
              return (
                <div key={m.id} className={`flex ${isMine ? "justify-end" : "justify-start"} group`}>
                  <div className={`max-w-[75%] rounded-2xl px-3.5 py-2 relative ${isMine ? "bg-primary text-primary-foreground rounded-br-md" : "bg-muted rounded-bl-md"}`}>
                    {(isFounder || (isAdmin && !isMine && (!selectedFriend?.role || selectedFriend.role === "user"))) && (
                      <button
                        type="button"
                        onClick={async () => {
                          if (!confirm("Supprimer ce message ?")) return;
                          await supabase.from("direct_messages").delete().eq("id", m.id);
                          qc.invalidateQueries({ queryKey: ["dm_messages"] });
                          qc.invalidateQueries({ queryKey: ["dm_conversations"] });
                        }}
                        className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-destructive text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                    {m.image_url && (
                      <button onClick={() => setViewingImage(m.image_url)} className="block mb-1 rounded-lg overflow-hidden">
                        <img src={m.image_url} alt="" className="max-w-full max-h-48 rounded-lg object-cover" loading="lazy" />
                      </button>
                    )}
                    {m.video_url && (
                      <div className="mb-1 rounded-lg overflow-hidden relative">
                        <video src={m.video_url} controls className="max-w-full max-h-48 rounded-lg" preload="metadata" />
                      </div>
                    )}
                    {m.body && m.body !== "📷" && m.body !== "🎥" && (
                      <p className="text-sm whitespace-pre-wrap break-words">{m.body}</p>
                    )}
                    <div className={`flex items-center gap-1 mt-0.5 ${isMine ? "justify-end" : ""}`}>
                      <span className={`text-[10px] ${isMine ? "text-primary-foreground/60" : "text-muted-foreground"}`}>{formatTime(m.created_at)}</span>
                      {isMine && (
                        m.read_at
                          ? <CheckCheck className="h-3.5 w-3.5 text-blue-400" />
                          : <Check className={`h-3.5 w-3.5 ${isMine ? "text-primary-foreground/50" : "text-muted-foreground"}`} />
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Media preview */}
        {mediaPreview && (
          <div className="px-3 pt-2 relative z-20 bg-background/95">
            <div className="relative inline-block rounded-lg overflow-hidden border border-border">
              {mediaType === "image" ? (
                <img src={mediaPreview} alt="" className="h-20 w-auto rounded-lg object-cover" />
              ) : (
                <video src={mediaPreview} className="h-20 w-auto rounded-lg object-cover" />
              )}
              <button onClick={clearMedia} className="absolute top-1 right-1 rounded-full bg-background/80 p-1">
                <X className="h-3 w-3" />
              </button>
            </div>
          </div>
        )}

        {/* Input bar */}
        {(isConversationAccepted || (isPending && messages.length > 0 && lastMessageIsMine) || messages.length === 0) && (
          <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border/40 bg-background/95 backdrop-blur p-3 pb-[max(0.75rem,calc(env(safe-area-inset-bottom)+0.75rem))] flex gap-2 items-end">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              className="hidden"
              onChange={handleFileSelect}
            />
            <Button variant="ghost" size="icon" className="shrink-0" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
              <Plus className="h-5 w-5" />
            </Button>
            <Input
              value={messageBody}
              onChange={(e) => setMessageBody(e.target.value)}
              placeholder={t.dm_placeholder as string}
              className="flex-1"
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && canSend) { e.preventDefault(); sendMut.mutate(); } }}
            />
            <Button size="icon" disabled={!canSend} onClick={() => sendMut.mutate()}>
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        )}

        {/* Pending: receiver can't send until accepted */}
        {isPending && messages.length > 0 && !lastMessageIsMine && (
          <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border/40 bg-background/95 backdrop-blur p-3 pb-[max(0.75rem,calc(env(safe-area-inset-bottom)+0.75rem))] text-center">
            <p className="text-xs text-muted-foreground">{t.dm_accept_to_reply as string || "Acceptez la conversation pour répondre"}</p>
          </div>
        )}

        {/* Image viewer overlay */}
        {viewingImage && (
          <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center" onClick={() => setViewingImage(null)}>
            <img src={viewingImage} alt="" className="max-w-full max-h-full object-contain" />
            <button onClick={() => setViewingImage(null)} className="absolute top-4 right-4 rounded-full bg-background/50 p-2">
              <X className="h-5 w-5 text-foreground" />
            </button>
          </div>
        )}
      </div>
    );
  }

  // ═══════════════════════════════════════
  //  CONVERSATION LIST
  // ═══════════════════════════════════════

  const renderConversationRow = (p: Conversation) => (
    <button
      key={p.user_id}
      onClick={() => setSelectedFriend(p)}
      className="w-full text-left rounded-xl border border-border/50 bg-card/80 p-3 hover:border-primary/40 transition-colors flex items-center gap-3"
    >
      {p.avatar_url ? (
        <img src={p.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover shrink-0" />
      ) : (
        <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
          <User className="h-5 w-5 text-primary" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-sm truncate flex items-center gap-1">
            {p.username} <UserRoleBadge role={p.role} isPremium={p.is_premium} />
          </span>
          {p.last_at && <span className="text-[10px] text-muted-foreground shrink-0 ml-2">{formatTime(p.last_at)}</span>}
        </div>
        {p.last_message && (
          <p className="text-xs text-muted-foreground truncate mt-0.5">{p.last_message}</p>
        )}
      </div>
      {p.unread_count > 0 && (
        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground px-1 shrink-0">
          {p.unread_count}
        </span>
      )}
    </button>
  );

  const renderSearchRow = (p: ProfileInfo) => (
    <button
      key={p.user_id}
      onClick={() => setSelectedFriend(p)}
      className="w-full text-left rounded-xl border border-border/50 bg-card/80 p-3 hover:border-primary/40 transition-colors flex items-center gap-3"
    >
      {p.avatar_url ? (
        <img src={p.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover shrink-0" />
      ) : (
        <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
          <User className="h-5 w-5 text-primary" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <span className="font-semibold text-sm truncate flex items-center gap-1">
          {p.username} <UserRoleBadge role={p.role} isPremium={p.is_premium} />
        </span>
      </div>
    </button>
  );

  const isSearching = searchQuery.trim().length >= 2;

  return (
    <div className="min-h-screen min-h-[100dvh] relative flex flex-col">
      <header className="sticky top-0 z-20 flex flex-col gap-2 px-4 py-3 border-b border-primary/10 bg-background/95 backdrop-blur">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-sm font-bold">{t.dm_title as string}</h1>
        </div>
        {/* Search bar to start new conversations */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t.dm_search_placeholder as string || "Rechercher un utilisateur..."}
            className="pl-9 pr-8"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} className="absolute right-2.5 top-1/2 -translate-y-1/2">
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          )}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 relative z-10">
        {isSearching ? (
          <>
            {searchLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
            ) : searchResults.length === 0 ? (
              <p className="text-center text-muted-foreground text-sm py-12">{t.dm_no_search_results as string || "Aucun utilisateur trouvé"}</p>
            ) : (
              searchResults.map((p) => renderSearchRow(p))
            )}
          </>
        ) : (
          <>
            {/* Pending conversation requests */}
            {pendingRequests.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 px-1">
                  <div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                  <p className="text-xs font-semibold uppercase tracking-wider text-amber-500">
                    {t.dm_pending_requests as string || "Demandes de conversation"} ({pendingRequests.length})
                  </p>
                </div>
                {pendingRequests.map((conv) => (
                  <div key={conv.user_id} className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 flex items-center gap-3">
                    <button onClick={() => setSelectedFriend(conv)} className="flex items-center gap-3 min-w-0 flex-1 text-left">
                      {conv.avatar_url ? (
                        <img src={conv.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover shrink-0" />
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                          <User className="h-5 w-5 text-primary" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <span className="font-semibold text-sm truncate flex items-center gap-1">
                          {conv.username} <UserRoleBadge role={conv.role} isPremium={conv.is_premium} />
                        </span>
                        {conv.last_message && (
                          <p className="text-xs text-muted-foreground truncate">{conv.last_message}</p>
                        )}
                      </div>
                    </button>
                    <div className="flex gap-1.5 shrink-0">
                      <Button size="icon" variant="outline" className="h-8 w-8 text-destructive border-destructive/30 hover:bg-destructive/10" onClick={() => blockConversation(conv.user_id)}>
                        <Ban className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="icon" className="h-8 w-8" onClick={() => acceptConversation(conv.user_id)}>
                        <UserCheck className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Active conversations */}
            {convsLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
            ) : activeConversations.length === 0 && pendingRequests.length === 0 ? (
              <div className="text-center py-12 space-y-2">
                <p className="text-muted-foreground text-sm">{t.dm_no_conversations as string || "Aucune conversation"}</p>
                <p className="text-xs text-muted-foreground">{t.dm_search_to_start as string || "Utilisez la barre de recherche pour démarrer une conversation"}</p>
              </div>
            ) : (
              <div className="space-y-1">
                {activeConversations.map((conv) => renderConversationRow(conv))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default DirectMessages;
