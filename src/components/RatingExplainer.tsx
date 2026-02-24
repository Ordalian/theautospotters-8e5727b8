import { Info } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { RarityBadge } from "@/components/RarityBadge";
import { QualityBadge } from "@/components/QualityBadge";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/i18n/LanguageContext";

interface RatingExplainerProps {
  rarityLevel: number;
  qualityLevel: number;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function RatingExplainer({ rarityLevel, qualityLevel, size = "sm", className }: RatingExplainerProps) {
  const { t } = useLanguage();

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex items-center gap-2 rounded-lg border-0 bg-transparent p-0 text-left outline-none focus:ring-2 focus:ring-primary/30",
            className
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <RarityBadge level={rarityLevel} size={size} />
          <QualityBadge level={qualityLevel} size={size} />
          <Info className="h-3.5 w-3.5 text-muted-foreground shrink-0" aria-hidden />
        </button>
      </DialogTrigger>
      <DialogContent
        className="max-w-sm"
        onClick={(e) => e.stopPropagation()}
        onPointerDownOutside={(e) => e.stopPropagation()}
      >
        <DialogHeader>
          <DialogTitle className="text-base">{t.rating_system_title as string}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm text-muted-foreground">
          <p>{t.rating_rarity_explanation as string}</p>
          <p>{t.rating_quality_explanation as string}</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
