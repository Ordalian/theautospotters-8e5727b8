import { supabase } from "@/integrations/supabase/client";

export async function trackFeature(feature: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("feature_usage").insert({ user_id: user.id, feature } as any);
}
