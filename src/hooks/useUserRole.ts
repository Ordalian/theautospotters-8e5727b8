import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export type UserRole = "user" | "admin" | "founder";

interface UserRoleData {
  role: UserRole;
  is_premium: boolean;
  is_map_marker: boolean;
  isFounder: boolean;
  isAdmin: boolean;
  isStaff: boolean; // founder OR admin
  isMapMarker: boolean;
  canManagePois: boolean; // is_map_marker OR admin OR founder
}

export function useUserRole(): UserRoleData & { loading: boolean } {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["my-role", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("role, is_premium, is_map_marker")
        .eq("user_id", user!.id)
        .maybeSingle();
      return {
        role: ((data as any)?.role ?? "user") as UserRole,
        is_premium: (data as any)?.is_premium ?? false,
        is_map_marker: (data as any)?.is_map_marker ?? false,
      };
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  const role = ((data?.role as string) === "map_marker" ? "user" : data?.role) ?? "user";
  const is_premium = data?.is_premium ?? false;
  const is_map_marker = data?.is_map_marker ?? false;

  return {
    role,
    is_premium,
    is_map_marker,
    isFounder: role === "founder",
    isAdmin: role === "admin",
    isStaff: role === "founder" || role === "admin",
    isMapMarker: is_map_marker,
    canManagePois: is_map_marker || role === "admin" || role === "founder",
    loading: isLoading,
  };
}
