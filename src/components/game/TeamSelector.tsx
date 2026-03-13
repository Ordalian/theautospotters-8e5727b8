import { useState } from "react";
import { useLanguage } from "@/i18n/LanguageContext";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const TEAMS = [
  { color: "blue", label: "Blue", hex: "#3b82f6", bg: "bg-blue-500", ring: "ring-blue-400" },
  { color: "red", label: "Red", hex: "#ef4444", bg: "bg-red-500", ring: "ring-red-400" },
  { color: "green", label: "Green", hex: "#22c55e", bg: "bg-green-500", ring: "ring-green-400" },
  { color: "black", label: "Black", hex: "#1e1e1e", bg: "bg-zinc-800", ring: "ring-zinc-500" },
] as const;

export type TeamColor = "blue" | "red" | "green" | "black";

interface TeamSelectorProps {
  userId: string;
  onTeamSelected: (team: TeamColor) => void;
}

export function TeamSelector({ userId, onTeamSelected }: TeamSelectorProps) {
  const { t } = useLanguage();
  const [selected, setSelected] = useState<TeamColor | null>(null);
  const [saving, setSaving] = useState(false);

  const handleConfirm = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ team_color: selected } as any)
        .eq("user_id", userId);
      if (error) throw error;
      onTeamSelected(selected);
    } catch (e) {
      toast.error((e as Error)?.message ?? "Error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm p-4">
      <div className="max-w-sm w-full rounded-2xl border border-border bg-card p-6 space-y-6 shadow-2xl">
        <div className="text-center space-y-2">
          <h2 className="text-xl font-bold text-foreground">
            {t.wdom_choose_team as string}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t.wdom_choose_team_desc as string}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {TEAMS.map((team) => (
            <button
              key={team.color}
              type="button"
              onClick={() => setSelected(team.color)}
              className={`relative flex flex-col items-center justify-center gap-2 rounded-xl border-2 p-5 transition-all ${
                selected === team.color
                  ? `border-primary ${team.ring} ring-2 scale-105`
                  : "border-border hover:border-muted-foreground/50"
              }`}
            >
              <div
                className={`h-12 w-12 rounded-full ${team.bg} shadow-lg`}
                style={{ boxShadow: `0 0 20px ${team.hex}40` }}
              />
              <span className="text-sm font-bold text-foreground">{team.label}</span>
            </button>
          ))}
        </div>

        <Button
          className="w-full"
          disabled={!selected || saving}
          onClick={handleConfirm}
        >
          {saving ? (t.loading as string) : (t.confirm as string)}
        </Button>

        <p className="text-[10px] text-muted-foreground text-center">
          {t.wdom_choose_team_warning as string}
        </p>
      </div>
    </div>
  );
}

export { TEAMS };
