import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/i18n/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Plus, Send, Loader2, ChevronRight, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import UserRoleBadge from "@/components/UserRoleBadge";
import { toast } from "sonner";

interface Ticket {
  id: string;
  subject: string;
  body: string;
  status: string;
  created_at: string;
}

interface TicketReply {
  id: string;
  user_id: string;
  body: string;
  created_at: string;
  username?: string;
  role?: string;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

const Support = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useLanguage();
  const qc = useQueryClient();

  const [showNewTicket, setShowNewTicket] = useState(false);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [creating, setCreating] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [replyBody, setReplyBody] = useState("");
  const [sending, setSending] = useState(false);

  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ["my-tickets", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("support_tickets")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      return (data ?? []) as Ticket[];
    },
    enabled: !!user,
    staleTime: 30_000,
  });

  const { data: replies = [], isLoading: repliesLoading } = useQuery({
    queryKey: ["my-ticket-replies", selectedTicket?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("support_replies")
        .select("*")
        .eq("ticket_id", selectedTicket!.id)
        .order("created_at", { ascending: true });
      if (!data?.length) return [];
      const userIds = [...new Set(data.map((r: any) => r.user_id))];
      const { data: profiles } = await supabase.from("profiles_public").select("user_id, username, role").in("user_id", userIds);
      const pMap = new Map(profiles?.map((p: any) => [p.user_id, { username: p.username, role: p.role }]) || []);
      return data.map((r: any) => ({ ...r, username: pMap.get(r.user_id)?.username || null, role: pMap.get(r.user_id)?.role || "user" })) as TicketReply[];
    },
    enabled: !!selectedTicket,
    staleTime: 15_000,
  });

  const handleCreate = async () => {
    if (!subject.trim() || !body.trim() || !user) return;
    setCreating(true);
    try {
      const { error } = await supabase.from("support_tickets").insert({
        user_id: user.id,
        subject: subject.trim(),
        body: body.trim(),
      } as any);
      if (error) throw error;
      toast.success("Ticket envoyé !");
      setSubject("");
      setBody("");
      setShowNewTicket(false);
      qc.invalidateQueries({ queryKey: ["my-tickets", user.id] });
    } catch (e: any) {
      toast.error(e?.message ?? "Erreur");
    } finally {
      setCreating(false);
    }
  };

  const handleReply = async () => {
    if (!replyBody.trim() || !selectedTicket || !user) return;
    setSending(true);
    try {
      await supabase.from("support_replies").insert({
        ticket_id: selectedTicket.id,
        user_id: user.id,
        body: replyBody.trim(),
      } as any);
      setReplyBody("");
      qc.invalidateQueries({ queryKey: ["my-ticket-replies", selectedTicket.id] });
    } catch (e: any) {
      toast.error(e?.message ?? "Erreur");
    } finally {
      setSending(false);
    }
  };

  // ─── Ticket detail view ───
  if (selectedTicket) {
    return (
      <div className="min-h-screen min-h-[100dvh] bg-background flex flex-col">
        <header className="sticky top-0 z-20 flex items-center gap-3 px-4 py-4 border-b border-border/50 bg-background/95 backdrop-blur">
          <Button variant="ghost" size="icon" onClick={() => setSelectedTicket(null)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="text-sm font-bold truncate">{selectedTicket.subject}</h1>
            <p className="text-xs text-muted-foreground">{formatDate(selectedTicket.created_at)}</p>
          </div>
          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full shrink-0 ${
            selectedTicket.status === "open" ? "bg-amber-500/20 text-amber-500" :
            selectedTicket.status === "replied" ? "bg-blue-500/20 text-blue-500" :
            "bg-muted text-muted-foreground"
          }`}>
            {selectedTicket.status === "open" ? "En attente" : selectedTicket.status === "replied" ? "Répondu" : "Fermé"}
          </span>
        </header>

        <div className="flex-1 overflow-y-auto p-4 pb-28 space-y-3">
          <div className="rounded-xl border border-border/50 bg-card p-4">
            <p className="text-sm whitespace-pre-wrap">{selectedTicket.body}</p>
          </div>

          {repliesLoading ? (
            <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : (
            replies.map((r) => {
              const isStaff = r.role === "founder" || r.role === "admin";
              return (
                <div key={r.id} className={`rounded-xl border p-3 ${isStaff ? "border-primary/30 bg-primary/5 ml-4" : "border-border/40 bg-card mr-4"}`}>
                  <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                    {isStaff ? "Support" : "Vous"}
                    <UserRoleBadge role={r.role} />
                    · {formatDate(r.created_at)}
                  </p>
                  <p className="text-sm whitespace-pre-wrap">{r.body}</p>
                </div>
              );
            })
          )}
        </div>

        {selectedTicket.status !== "closed" && (
          <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border/40 bg-background/95 backdrop-blur p-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] flex gap-2">
            <Input
              value={replyBody}
              onChange={(e) => setReplyBody(e.target.value)}
              placeholder="Répondre..."
              className="flex-1"
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && replyBody.trim()) { e.preventDefault(); handleReply(); } }}
            />
            <Button size="icon" disabled={!replyBody.trim() || sending} onClick={handleReply}>
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        )}
      </div>
    );
  }

  // ─── New ticket form ───
  if (showNewTicket) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-20 flex items-center gap-3 px-4 py-4 border-b border-border/50 bg-background/95 backdrop-blur">
          <Button variant="ghost" size="icon" onClick={() => setShowNewTicket(false)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold">Nouveau message</h1>
        </header>
        <div className="p-4 max-w-lg mx-auto space-y-4">
          <div>
            <label className="text-sm font-medium mb-1.5 block">Sujet</label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="De quoi s'agit-il ?" />
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Message</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Décrivez votre demande..."
              rows={6}
              className="flex w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
            />
          </div>
          <Button className="w-full h-12 text-base font-bold rounded-xl gap-2" disabled={!subject.trim() || !body.trim() || creating} onClick={handleCreate}>
            {creating ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
            Envoyer
          </Button>
        </div>
      </div>
    );
  }

  // ─── Ticket list ───
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 flex items-center gap-3 px-4 py-4 border-b border-border/50 bg-background/95 backdrop-blur">
        <Button variant="ghost" size="icon" onClick={() => navigate("/profile")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-bold flex-1">Support</h1>
      </header>

      <div className="p-4 max-w-lg mx-auto space-y-3">
        <Button className="w-full h-12 text-base font-bold rounded-xl gap-2" onClick={() => setShowNewTicket(true)}>
          <Plus className="h-5 w-5" /> Contacter le support
        </Button>

        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : tickets.length === 0 ? (
          <div className="flex flex-col items-center py-12 text-center">
            <MessageSquare className="h-12 w-12 text-muted-foreground/20 mb-3" />
            <p className="text-muted-foreground text-sm">Aucun ticket. Contactez-nous si vous avez une question !</p>
          </div>
        ) : (
          tickets.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setSelectedTicket(t)}
              className="w-full text-left rounded-xl border border-border/50 bg-card p-3 hover:border-primary/30 transition-colors"
            >
              <div className="flex items-center justify-between mb-1">
                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                  t.status === "open" ? "bg-amber-500/20 text-amber-500" :
                  t.status === "replied" ? "bg-blue-500/20 text-blue-500" :
                  "bg-muted text-muted-foreground"
                }`}>
                  {t.status === "open" ? "En attente" : t.status === "replied" ? "Répondu" : "Fermé"}
                </span>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
              <h3 className="font-semibold text-sm truncate">{t.subject}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">{formatDate(t.created_at)}</p>
            </button>
          ))
        )}
      </div>
    </div>
  );
};

export default Support;
