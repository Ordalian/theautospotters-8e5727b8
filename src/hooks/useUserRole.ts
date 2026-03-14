import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export type UserRole = "user" | "admin" | "founder" | "map_marker";

interface UserRoleData {
  role: UserRole;
  is_premium: boolean;
  isFounder: boolean;
  isAdmin: boolean;
  isStaff: boolean; // founder OR admin
  isMapMarker: boolean;
  canManagePois: boolean; // map_marker OR admin OR founder
}

export function useUserRole(): UserRoleData & { loading: boolean } {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["my-role", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("role, is_premium")
        .eq("user_id", user!.id)
        .maybeSingle();
      return {
        role: ((data as any)?.role ?? "user") as UserRole,
        is_premium: (data as any)?.is_premium ?? false,
      };
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  const role = data?.role ?? "user";
  const is_premium = data?.is_premium ?? false;

  return {
    role,
    is_premium,
    isFounder: role === "founder",
    isAdmin: role === "admin",
    isStaff: role === "founder" || role === "admin",
    isMapMarker: role === "map_marker",
    canManagePois: role === "map_marker" || role === "admin" || role === "founder",
    loading: isLoading,
  };
}
