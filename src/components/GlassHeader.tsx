import { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

interface GlassHeaderProps {
  title: string;
  subtitle?: string;
  backTo?: string;
  rightContent?: ReactNode;
  children?: ReactNode;
}

export function GlassHeader({ title, subtitle, backTo, rightContent, children }: GlassHeaderProps) {
  const navigate = useNavigate();

  return (
    <header
      className="glass-header sticky top-0 z-30 px-4 py-3"
      style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}
    >
      <div className="flex items-center justify-between gap-3 max-w-2xl mx-auto">
        {backTo ? (
          <button
            onClick={() => navigate(backTo)}
            className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
        ) : (
          <div className="w-5" />
        )}

        <div className="flex-1 text-center min-w-0">
          <h1 className="text-lg font-bold text-foreground truncate font-heading">{title}</h1>
          {subtitle && <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{subtitle}</p>}
        </div>

        <div className="shrink-0 flex items-center gap-1">{rightContent ?? <div className="w-5" />}</div>
      </div>
      {children}
    </header>
  );
}
