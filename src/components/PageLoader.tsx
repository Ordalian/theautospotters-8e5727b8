import { Loader2 } from "lucide-react";

/**
 * Full-screen centered loading spinner.
 * Single source of truth — reused across App, Home, and individual pages.
 */
export function PageLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );
}