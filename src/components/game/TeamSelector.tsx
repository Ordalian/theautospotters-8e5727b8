import { useState } from "react";
import { useLanguage } from "@/i18n/LanguageContext";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const TEAMS = [
  { color: "blue", label: "Blue", hex: "#3b82f6", bg: "bg-blue-500", ring: "ring-blue-400" },
  { color: "red", label: "Red", hex: "#ef4444", bg: "bg-red-500", ring: "ring-red-400" },
  { color: "green", label: "Green", hex: "#22c55e", bg: "bg-green-500", ring: "ring-green-400" },
  { color: "purple", label: "Purple", hex: "#a855f7", bg: "bg-purple-500", ring: "ring-purple-400" },
] as const;

export type TeamColor = "blue" | "red" | "green" | "purple";

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/90 backdrop-blur-xl p-4">
      <div className="max-w-sm w-full rounded-2xl glass-panel p-6 space-y-6 animate-scale-in">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-heading text-foreground">
            {t.wdom_choose_team as string}
          </h2>
          <p className="text-sm text-muted-foreground font-sans normal-case">
            {t.wdom_choose_team_desc as string}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {TEAMS.map((team) => (
            <button
              key={team.color}
              type="button"
              onClick={() => setSelected(team.color)}
              className={`relative flex flex-col items-center justify-center gap-3 rounded-xl glass-panel-sm p-5 transition-all duration-300 ${
                selected === team.color
                  ? `ring-2 ${team.ring} scale-105 glass-glow-sm`
                  : "hover:scale-[1.02]"
              }`}
            >
              <div
                className={`h-14 w-14 rounded-full shadow-lg`}
                style={{
                  background: team.hex,
                  boxShadow: selected === team.color
                    ? `0 0 24px ${team.hex}60`
                    : `0 4px 12px ${team.hex}30`,
                }}
              />
              <span className="text-sm font-heading text-foreground">{team.label}</span>
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

        <p className="text-[10px] text-muted-foreground text-center font-sans normal-case">
          {t.wdom_choose_team_warning as string}
        </p>
      </div>
    </div>
  );
}

export { TEAMS };