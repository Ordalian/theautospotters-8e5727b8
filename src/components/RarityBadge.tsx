import { Settings } from "lucide-react";

interface RarityBadgeProps {
  level: number; // 1-10
  showLabel?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function RarityBadge({ level, showLabel = false, size = "md", className = "" }: RarityBadgeProps) {
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

  // Color based on rarity level
  const getColor = () => {
    if (level >= 9) return "text-yellow-500"; // Legendary/Ultra Rare
    if (level >= 7) return "text-purple-500"; // Very Rare/Super Rare
    if (level >= 5) return "text-blue-500"; // Rare/Uncommon
    if (level >= 3) return "text-green-500"; // Fairly Common
    return "text-gray-500"; // Common
  };

  const getLabel = () => {
    if (level >= 9) return "Legendary";
    if (level === 8) return "Super Rare";
    if (level === 7) return "Very Rare";
    if (level === 6) return "Rare";
    if (level >= 4) return "Uncommon";
    if (level === 3) return "Fairly Common";
    return "Common";
  };

  return (
    <div className={`inline-flex items-center ${sizeClasses[size]} font-semibold ${getColor()} ${className}`}>
      <Settings className={iconSizes[size]} />
      <span>{level}</span>
      {showLabel && <span className="ml-1 font-normal opacity-80">{getLabel()}</span>}
    </div>
  );
}
