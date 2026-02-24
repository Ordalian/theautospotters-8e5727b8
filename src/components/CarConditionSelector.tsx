import { type CarCondition } from "@/lib/carRatings";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/i18n/LanguageContext";

interface CarConditionSelectorProps {
  value: CarCondition;
  onChange: (condition: CarCondition) => void;
}

export function CarConditionSelector({ value, onChange }: CarConditionSelectorProps) {
  const { t } = useLanguage();

  const conditions: { value: CarCondition; labelKey: string; emoji: string; points: number }[] = [
    { value: "wreck", labelKey: "condition_wreck", emoji: "💥", points: 1 },
    { value: "bad", labelKey: "condition_bad", emoji: "😢", points: 2 },
    { value: "good", labelKey: "condition_good", emoji: "👍", points: 3 },
    { value: "well_kept", labelKey: "condition_well_kept", emoji: "✨", points: 4 },
    { value: "pristine", labelKey: "condition_pristine", emoji: "💎", points: 5 },
  ];

  return (
    <div className="space-y-2">
      {conditions.map((condition) => (
        <button
          key={condition.value}
          type="button"
          onClick={() => onChange(condition.value)}
          className={cn(
            "w-full flex items-center justify-between rounded-xl border px-4 py-3 text-sm font-medium transition-all",
            value === condition.value
              ? "border-primary bg-primary/10 text-primary"
              : "border-border bg-secondary/30 text-muted-foreground hover:border-muted-foreground/30"
          )}
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">{condition.emoji}</span>
            <div className="text-left">
              <div className="font-semibold">{t[condition.labelKey] as string}</div>
              <div className="text-xs opacity-70">+{condition.points} {t.condition_quality as string}</div>
            </div>
          </div>
          {value === condition.value && <Check className="h-4 w-4" />}
        </button>
      ))}
    </div>
  );
}
