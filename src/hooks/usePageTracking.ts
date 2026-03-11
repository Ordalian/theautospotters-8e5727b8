import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export function usePageTracking() {
  const { user } = useAuth();
  const location = useLocation();
  const currentView = useRef<{ id: string; enteredAt: number } | null>(null);

  useEffect(() => {
    if (!user) return;

    const finishPrevious = async () => {
      const prev = currentView.current;
      if (prev) {
        const duration = Date.now() - prev.enteredAt;
        await supabase
          .from("page_views")
          .update({ duration_ms: duration } as any)
          .eq("id", prev.id);
      }
    };

    const recordView = async () => {
      await finishPrevious();
      const { data } = await supabase
        .from("page_views")
        .insert({ user_id: user.id, page: location.pathname } as any)
        .select("id")
        .single();
      if (data) {
        currentView.current = { id: data.id, enteredAt: Date.now() };
      }
    };

    recordView();

    return () => {
      // fire-and-forget duration update on unmount / route change
      const prev = currentView.current;
      if (prev) {
        const duration = Date.now() - prev.enteredAt;
        supabase
          .from("page_views")
          .update({ duration_ms: duration } as any)
          .eq("id", prev.id);
        currentView.current = null;
      }
    };
  }, [location.pathname, user]);
}
