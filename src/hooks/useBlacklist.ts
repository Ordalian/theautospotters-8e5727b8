import { useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface BlacklistEntry {
  id: string;
  user_id: string;
  blacklisted_user_id: string;
  created_at: string;
  username?: string | null;
}

const BLACKLIST_24H_MS = 24 * 60 * 60 * 1000;

export function canUnblacklist(createdAt: string): boolean {
  return Date.now() - new Date(createdAt).getTime() >= BLACKLIST_24H_MS;
}

export function unblacklistCooldownMs(createdAt: string): number {
  const end = new Date(createdAt).getTime() + BLACKLIST_24H_MS;
  return Math.max(0, end - Date.now());
}

export function useBlacklist(userId: string | undefined) {
  const qc = useQueryClient();

  const { data: myBlacklistRows = [], isLoading } = useQuery({
    queryKey: ["user_blacklist", userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data } = await supabase
        .from("user_blacklist")
        .select("id, user_id, blacklisted_user_id, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      return (data || []) as { id: string; user_id: string; blacklisted_user_id: string; created_at: string }[];
    },
    enabled: !!userId,
  });

  const { data: blacklistedMeIds = [] } = useQuery({
    queryKey: ["user_blacklist_me", userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data } = await supabase
        .from("user_blacklist")
        .select("user_id")
        .eq("blacklisted_user_id", userId);
      return (data || []).map((r) => r.user_id);
    },
    enabled: !!userId,
  });

  const blacklistedByMeSet = useMemo(
    () => new Set(myBlacklistRows.map((r) => r.blacklisted_user_id)),
    [myBlacklistRows]
  );
  const blacklistedMeSet = useMemo(() => new Set(blacklistedMeIds), [blacklistedMeIds]);

  const isBlacklisted = useMemo(
    () => (otherId: string) => blacklistedByMeSet.has(otherId) || blacklistedMeSet.has(otherId),
    [blacklistedByMeSet, blacklistedMeSet]
  );

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["user_blacklist", userId] });
    qc.invalidateQueries({ queryKey: ["user_blacklist_me", userId] });
  };

  return {
    myBlacklistRows,
    blacklistedByMeSet,
    blacklistedMeSet,
    isBlacklisted,
    isLoading,
    invalidate,
  };
}
