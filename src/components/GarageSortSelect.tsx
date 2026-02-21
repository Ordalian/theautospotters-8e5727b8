import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type GarageSortOption = "newest" | "oldest" | "brand" | "group";

interface GarageSortSelectProps {
  value: GarageSortOption;
  onChange: (value: GarageSortOption) => void;
}

const GarageSortSelect = ({ value, onChange }: GarageSortSelectProps) => (
  <Select value={value} onValueChange={(v) => onChange(v as GarageSortOption)}>
    <SelectTrigger className="w-[160px] h-9 text-sm bg-secondary/30">
      <SelectValue placeholder="Trier..." />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="newest">Plus récents</SelectItem>
      <SelectItem value="oldest">Plus anciens</SelectItem>
      <SelectItem value="brand">Par marque</SelectItem>
      <SelectItem value="group">Par groupe</SelectItem>
    </SelectContent>
  </Select>
);

export default GarageSortSelect;
