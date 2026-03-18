import { supabase } from "@/integrations/supabase/client";

const PRIVATE_BUCKETS = ["dm-media", "car-photos"];

export function isPrivateStorageUrl(url: string | null | undefined): boolean {
  if (!url || typeof url !== "string") return false;
  return PRIVATE_BUCKETS.some((b) => url.includes(`/object/public/${b}/`) || url.includes(`/${b}/`));
}

const cache = new Map<string, { url: string; expires: number }>();
const CACHE_TTL_MS = 50 * 60 * 1000; // 50 min (signed URL lasts 1h)

export async function getSignedMediaUrl(storageUrl: string): Promise<string> {
  if (!isPrivateStorageUrl(storageUrl)) return storageUrl;
  const cached = cache.get(storageUrl);
  if (cached && cached.expires > Date.now()) return cached.url;

  const { data, error } = await supabase.functions.invoke("get-signed-media-url", {
    body: { url: storageUrl },
  });

  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  const signed = data?.url;
  if (!signed) throw new Error("No signed URL returned");

  cache.set(storageUrl, { url: signed, expires: Date.now() + CACHE_TTL_MS });
  return signed;
}
