import { useState, useEffect, useRef } from "react";
import { useLanguage } from "@/i18n/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, Send, Loader2, User, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { resizeImage } from "@/lib/imageUtils";

type Friend = { user_id: string; username: string; avatar_url: string | null };
type Conversation = Friend & { last_message?: string; last_at?: string; unread_count: number };
type DM = { id: string; sender_id: string; receiver_id: string; body: string; created_at: string; read_at: string | null; image_url: string | null; video_url: string | null };

interface DirectMessagesProps {
  onBack: () => void;
}

const MAX_VIDEO_SIZE = 15 * 1024 * 1024; // 15MB
const MAX_VIDEO_DURATION = 15; // seconds

const DirectMessages = ({ onBack }: DirectMessagesProps) => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
  const [messageBody, setMessageBody] = useState("");
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<"image" | "video" | null>(null);
  const [uploading, setUploading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
          const preview = m.image_url ? "📷 Photo" : m.video_url ? "🎥 Vidéo" : m.body;
          convMap.set(friendId, { last_message: preview, last_at: m.created_at, unread_count: 0 });
        }
        if (m.receiver_id === user!.id && !m.read_at) {
          const c = convMap.get(friendId)!;
          c.unread_count++;
        }
      });

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
          qc.invalidateQueries({ queryKey: ["dm_unread_count"] });
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
          qc.invalidateQueries({ queryKey: ["dm_unread_count"] });
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  // Media handling
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
      // Check duration
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
    // Reset input
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

  // Full-screen image viewer
  const [viewingImage, setViewingImage] = useState<string | null>(null);

  // Chat view
  if (selectedFriend) {
    return (
      <div className="min-h-screen relative flex flex-col">
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
                    <p className={`text-[10px] mt-0.5 ${isMine ? "text-primary-foreground/60" : "text-muted-foreground"}`}>{formatTime(m.created_at)}</p>
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

        <div className="sticky bottom-0 z-20 p-3 border-t border-border/40 bg-background/95 backdrop-blur flex gap-2 items-end">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            className="hidden"
            onChange={handleFileSelect}
          />
          <Button variant="ghost" size="icon" className="shrink-0" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
            <ImagePlus className="h-5 w-5" />
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
