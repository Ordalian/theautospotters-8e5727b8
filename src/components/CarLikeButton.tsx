import { useState } from "react";
import { Heart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

interface CarLikeButtonProps {
  carId: string;
  ownerId: string; // car owner's user_id
  size?: "sm" | "md";
  showCount?: boolean;
  className?: string;
}

export function CarLikeButton({ carId, ownerId, size = "md", showCount = true, className }: CarLikeButtonProps) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);

  // Don't show on own cars
  if (!user || user.id === ownerId) return null;

  const { data: liked = false } = useQuery({
    queryKey: ["car-like", carId, user.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("car_likes")
        .select("id")
        .eq("car_id", carId)
        .eq("user_id", user!.id)
        .maybeSingle();
      return !!data;
    },
    staleTime: 2 * 60 * 1000,
  });

  const { data: likeCount = 0 } = useQuery({
    queryKey: ["car-like-count", carId],
    queryFn: async () => {
      const { count } = await supabase
        .from("car_likes")
        .select("id", { count: "exact", head: true })
        .eq("car_id", carId);
      return count ?? 0;
    },
    staleTime: 2 * 60 * 1000,
  });

  const toggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (busy || !user) return;
    setBusy(true);
    try {
      if (liked) {
        await supabase.from("car_likes").delete().eq("car_id", carId).eq("user_id", user.id);
      } else {
        await supabase.from("car_likes").insert({ car_id: carId, user_id: user.id });
      }
      qc.invalidateQueries({ queryKey: ["car-like", carId] });
      qc.invalidateQueries({ queryKey: ["car-like-count", carId] });
    } finally {
      setBusy(false);
    }
  };

  const iconSize = size === "sm" ? "h-4 w-4" : "h-5 w-5";

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      className={cn(
        "inline-flex items-center gap-1 rounded-full transition-all active:scale-90",
        size === "sm" ? "px-2 py-1 text-xs" : "px-3 py-1.5 text-sm",
        liked
          ? "text-red-500"
          : "text-muted-foreground hover:text-red-400",
        className
      )}
      aria-label={liked ? "Unlike" : "Like"}
    >
      <Heart
        className={cn(iconSize, "transition-all", liked && "fill-red-500")}
      />
      {showCount && likeCount > 0 && (
        <span className="font-medium">{likeCount}</span>
      )}
    </button>
  );
}
