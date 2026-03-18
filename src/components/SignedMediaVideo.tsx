import { useSignedMediaUrl } from "@/hooks/useSignedMediaUrl";

interface SignedMediaVideoProps extends React.VideoHTMLAttributes<HTMLVideoElement> {
  src: string | null | undefined;
}

export function SignedMediaVideo({ src, ...props }: SignedMediaVideoProps) {
  const { resolvedUrl, isLoading } = useSignedMediaUrl(src);

  if (!src) return null;
  if (isLoading || !resolvedUrl) return null; // or a placeholder
  return <video {...props} src={resolvedUrl} />;
}
