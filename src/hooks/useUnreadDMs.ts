import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

export function useUnreadDMs() {
  const { user } = useAuth();

  const { data: count = 0 } = useQuery({
    queryKey: ["dm_unread_count", user?.id],
    queryFn: async () => {
      const { count } = await supabase
        .from("direct_messages")
        .select("*", { count: "exact", head: true })
        .eq("receiver_id", user!.id)
        .is("read_at", null);
      return count ?? 0;
    },
    enabled: !!user,
    refetchInterval: 30000,
  });

  return count;
}
