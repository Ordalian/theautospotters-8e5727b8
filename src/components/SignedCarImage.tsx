import { ImgHTMLAttributes, ReactNode, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type SignedCarImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> & {
  src: string | null;
  bucket?: string;
  fallback?: ReactNode;
  expiresIn?: number;
};

function extractStoragePath(source: string, bucket: string): string | null {
  if (!source || source.startsWith("data:") || source.startsWith("blob:")) return null;

  if (!source.startsWith("http://") && !source.startsWith("https://")) {
    return source.replace(new RegExp(`^${bucket}/`), "").replace(/^\/+/, "") || null;
  }

  try {
    const url = new URL(source);
    const markers = [
      `/storage/v1/object/public/${bucket}/`,
      `/storage/v1/object/sign/${bucket}/`,
      `/storage/v1/render/image/public/${bucket}/`,
    ];

    for (const marker of markers) {
      const idx = url.pathname.indexOf(marker);
      if (idx >= 0) {
        const path = url.pathname.slice(idx + marker.length);
        return decodeURIComponent(path) || null;
      }
    }
  } catch {
    return null;
  }

  return null;
}

export default function SignedCarImage({
  src,
  alt,
  bucket = "car-photos",
  fallback = null,
  expiresIn = 60 * 60,
  onError,
  ...imgProps
}: SignedCarImageProps) {
  const storagePath = useMemo(() => (src ? extractStoragePath(src, bucket) : null), [src, bucket]);
  const [resolvedSrc, setResolvedSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const resolveSrc = async () => {
      setFailed(false);

      if (!src) {
        setResolvedSrc(null);
        return;
      }

      if (!storagePath) {
        setResolvedSrc(src);
        return;
      }

      const { data, error } = await supabase.storage.from(bucket).createSignedUrl(storagePath, expiresIn);

      if (cancelled) return;
      if (error || !data?.signedUrl) {
        setResolvedSrc(src);
        return;
      }

      setResolvedSrc(data.signedUrl);
    };

    void resolveSrc();

    return () => {
      cancelled = true;
    };
  }, [src, storagePath, bucket, expiresIn]);

  if (!src || !resolvedSrc || failed) {
    return <>{fallback}</>;
  }

  return (
    <img
      {...imgProps}
      src={resolvedSrc}
      alt={alt}
      onError={(event) => {
        setFailed(true);
        onError?.(event);
      }}
    />
  );
}
