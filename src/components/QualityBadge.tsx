import { Wrench } from "lucide-react";

interface QualityBadgeProps {
  level: number; // 1-8
  showLabel?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function QualityBadge({ level, showLabel = false, size = "md", className = "" }: QualityBadgeProps) {
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

  // Color based on quality level
  const getColor = () => {
    if (level >= 7) return "text-emerald-500"; // Excellent quality
    if (level >= 5) return "text-blue-500"; // Good quality
    if (level >= 3) return "text-orange-500"; // Average quality
    return "text-red-500"; // Poor quality
  };

  const getLabel = () => {
    if (level >= 7) return "Excellent";
    if (level >= 5) return "Good";
    if (level >= 3) return "Average";
    return "Poor";
  };

  return (
    <div className={`inline-flex items-center ${sizeClasses[size]} font-semibold ${getColor()} ${className}`}>
      <Wrench className={iconSizes[size]} />
      <span>{level}</span>
      {showLabel && <span className="ml-1 font-normal opacity-80">{getLabel()}</span>}
    </div>
  );
}
