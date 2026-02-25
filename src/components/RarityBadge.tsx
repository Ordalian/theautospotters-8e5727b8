import { Settings } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";

interface RarityBadgeProps {
  level: number; // 1-10
  showLabel?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const RARITY_COLORS: Record<number, string> = {
  1: "text-zinc-500",
  2: "text-zinc-400",
  3: "text-slate-400",
  4: "text-green-600",
  5: "text-emerald-500",
  6: "text-cyan-500",
  7: "text-blue-500",
  8: "text-violet-500",
  9: "text-amber-500",
  10: "text-yellow-400",
};

export function RarityBadge({ level, showLabel = false, size = "md", className = "" }: RarityBadgeProps) {
  const { t } = useLanguage();
  const l = Math.max(1, Math.min(10, Math.round(level)));
  const sizeClasses = {
    sm: "text-xs gap-1",
    md: "text-sm gap-1.5",
    lg: "text-base gap-2",
  };
  const iconSizes = {
    sm: "h-3 w-3",
    md: "h-4 w-4",
    lg: "h-5 w-5",
  };
  const color = RARITY_COLORS[l] ?? "text-muted-foreground";
  const labelKey = `rarity_label_${l}` as keyof typeof t;
  const label = (t[labelKey] as string) ?? String(l);

  return (
    <div className={`inline-flex items-center ${sizeClasses[size]} font-semibold ${color} ${className}`}>
      <Settings className={iconSizes[size]} />
      <span>{l}</span>
      {showLabel && <span className="ml-1 font-normal opacity-80">{label}</span>}
    </div>
  );
}
