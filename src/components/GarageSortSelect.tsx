import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLanguage } from "@/i18n/LanguageContext";

export type GarageSortOption = "newest" | "oldest" | "brand" | "group";

interface GarageSortSelectProps {
  value: GarageSortOption;
  onChange: (value: GarageSortOption) => void;
}

const GarageSortSelect = ({ value, onChange }: GarageSortSelectProps) => {
  const { t } = useLanguage();
  return (
    <Select value={value} onValueChange={(v) => onChange(v as GarageSortOption)}>
      <SelectTrigger className="w-[160px] h-9 text-sm bg-secondary/30">
        <SelectValue placeholder={t.sort_placeholder as string} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="newest">{t.sort_newest as string}</SelectItem>
        <SelectItem value="oldest">{t.sort_oldest as string}</SelectItem>
        <SelectItem value="brand">{t.sort_brand as string}</SelectItem>
        <SelectItem value="group">{t.sort_group as string}</SelectItem>
      </SelectContent>
    </Select>
  );
};

export default GarageSortSelect;
