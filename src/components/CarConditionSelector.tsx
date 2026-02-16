import { type CarCondition } from "@/lib/carRatings";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface CarConditionSelectorProps {
  value: CarCondition;
  onChange: (condition: CarCondition) => void;
}

const conditions: { value: CarCondition; label: string; emoji: string; points: number }[] = [
  { value: "wreck", label: "Wreck", emoji: "💥", points: 1 },
  { value: "bad", label: "Bad", emoji: "😢", points: 2 },
  { value: "good", label: "Good", emoji: "👍", points: 3 },
  { value: "well_kept", label: "Well Kept", emoji: "✨", points: 4 },
  { value: "pristine", label: "Pristine", emoji: "💎", points: 5 },
];

export function CarConditionSelector({ value, onChange }: CarConditionSelectorProps) {
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
              <div className="font-semibold">{condition.label}</div>
              <div className="text-xs opacity-70">+{condition.points} quality</div>
            </div>
          </div>
          {value === condition.value && <Check className="h-4 w-4" />}
        </button>
      ))}
    </div>
  );
}
