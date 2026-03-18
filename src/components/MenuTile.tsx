import { cn } from "@/lib/utils";

export type MenuTileBadgeVariant = "gold" | "red" | "blue" | "muted";

interface MenuTileProps {
  icon: string;
  title: string;
  subtitle: string;
  badge?: string;
  badgeVariant?: MenuTileBadgeVariant;
  onClick: () => void;
  disabled?: boolean;
}

const BADGE_CLASSES: Record<MenuTileBadgeVariant, string> = {
  gold: "bg-amber-500/20 text-amber-400 border border-amber-500/40",
  red: "bg-red-500/20 text-red-400 border border-red-500/40",
  blue: "bg-blue-500/20 text-blue-400 border border-blue-500/40",
  muted: "bg-zinc-700 text-zinc-400 border border-zinc-600",
};

export function MenuTile({
  icon,
  title,
  subtitle,
  badge,
  badgeVariant = "gold",
  onClick,
  disabled = false,
}: MenuTileProps) {
  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={cn(
        "relative flex w-full flex-col rounded-2xl border bg-gradient-to-br from-zinc-900 to-zinc-800 p-6 text-left shadow-lg transition-all duration-200",
        "border-amber-500/30 hover:border-amber-500/70 hover:shadow-[0_0_28px_rgba(245,158,11,0.12)]",
        "h-40 md:h-48",
        disabled && "cursor-not-allowed opacity-50 hover:scale-100 hover:shadow-lg hover:border-amber-500/30",
        !disabled && "hover:scale-[1.02] cursor-pointer"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-4xl leading-none">{icon}</span>
        {badge && (
          <span
            className={cn(
              "shrink-0 text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full",
              BADGE_CLASSES[badgeVariant]
            )}
          >
            {badge}
          </span>
        )}
      </div>
      <div className="mt-auto pt-4">
        <h2 className="text-lg font-bold uppercase tracking-wider text-foreground">
          {title}
        </h2>
        <p className="text-sm text-muted-foreground mt-0.5 whitespace-pre-line">
          {subtitle}
        </p>
      </div>
    </button>
  );
}
