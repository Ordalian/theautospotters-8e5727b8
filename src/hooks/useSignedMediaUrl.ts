import { useQuery } from "@tanstack/react-query";
import { getSignedMediaUrl, isPrivateStorageUrl } from "@/lib/signedMediaUrl";

export function useSignedMediaUrl(url: string | null | undefined) {
  const isPrivate = isPrivateStorageUrl(url);
  const { data: resolvedUrl, isLoading, error } = useQuery({
    queryKey: ["signed-media-url", url ?? ""],
    queryFn: () => getSignedMediaUrl(url!),
    enabled: !!url && isPrivate,
    staleTime: 50 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });

  if (!url) return { resolvedUrl: null, isLoading: false, error: null };
  if (!isPrivate) return { resolvedUrl: url, isLoading: false, error: null };
  return {
    resolvedUrl: resolvedUrl ?? null,
    isLoading,
    error: error ?? null,
  };
}
