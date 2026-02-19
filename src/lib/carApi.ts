/**
 * Call the car-api Edge Function with the user's auth token.
 */

import { supabase } from "@/integrations/supabase/client";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

export async function callCarApi<T>(body: object): Promise<T> {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData?.session?.access_token;

  if (!token) {
    throw new Error("You must be logged in to use this feature.");
  }

  const res = await fetch(`${SUPABASE_URL}/functions/v1/car-api`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const msg = (data as { error?: string })?.error || res.statusText || "Erreur car-api";
    throw new Error(msg);
  }

  if ((data as { error?: string })?.error) {
    throw new Error((data as { error: string }).error);
  }

  return data as T;
}
