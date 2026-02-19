/**
 * Appel direct à l’Edge Function car-api avec la clé anon (évite le 401 JWT).
 */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export async function callCarApi<T>(body: object): Promise<T> {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/car-api`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
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
