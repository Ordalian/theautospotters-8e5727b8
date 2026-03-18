import { useSignedMediaUrl } from "@/hooks/useSignedMediaUrl";
import { Loader2 } from "lucide-react";

interface SignedMediaImgProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string | null | undefined;
}

export function SignedMediaImg({ src, alt = "", ...props }: SignedMediaImgProps) {
  const { resolvedUrl, isLoading } = useSignedMediaUrl(src);

  if (!src) return null;
  if (isLoading || !resolvedUrl) {
    return (
      <div className={props.className} style={{ ...props.style, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--muted)" }}>
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }
  return <img {...props} src={resolvedUrl} alt={alt} />;
}
