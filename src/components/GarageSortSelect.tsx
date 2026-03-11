import { useState, useRef, useEffect } from "react";
import { SlidersHorizontal, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/i18n/LanguageContext";

export type GarageSortOption = "newest" | "oldest" | "brand" | "group";

interface GarageSortSelectProps {
  value: GarageSortOption;
  onChange: (value: GarageSortOption) => void;
}

const GarageSortSelect = ({ value, onChange }: GarageSortSelectProps) => {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", handler);
    return () => document.removeEventListener("pointerdown", handler);
  }, [open]);

  const options: { value: GarageSortOption; label: string }[] = [
    { value: "newest", label: t.sort_newest as string },
    { value: "oldest", label: t.sort_oldest as string },
    { value: "brand", label: t.sort_brand as string },
    { value: "group", label: t.sort_group as string },
  ];

  return (
    <div className="relative" ref={ref}>
      <Button
        variant="outline"
        size="icon"
        className="shrink-0"
        aria-label={t.sort_placeholder as string}
        onClick={() => setOpen((v) => !v)}
      >
        <SlidersHorizontal className="h-5 w-5" />
      </Button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 min-w-[160px] rounded-xl border border-border bg-popover p-1 shadow-lg animate-in fade-in-0 zoom-in-95">
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => { onChange(opt.value); setOpen(false); }}
              className="flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              {opt.label}
              {value === opt.value && <Check className="h-4 w-4 text-primary" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default GarageSortSelect;
