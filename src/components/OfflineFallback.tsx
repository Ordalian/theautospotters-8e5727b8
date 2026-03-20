import { useState, useEffect } from "react";
import { WifiOff, RefreshCw } from "lucide-react";

export function OfflineBanner() {
  const [offline, setOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const goOffline = () => setOffline(true);
    const goOnline = () => setOffline(false);
    window.addEventListener("offline", goOffline);
    window.addEventListener("online", goOnline);
    return () => {
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online", goOnline);
    };
  }, []);

  if (!offline) return null;

  return (
    <div className="sticky top-0 z-[60] w-full bg-destructive/90 text-destructive-foreground backdrop-blur-sm">
      <div className="flex items-center justify-center gap-2 px-4 py-2">
        <WifiOff className="h-4 w-4" />
        <p className="text-xs font-medium">Hors ligne — certaines fonctions sont indisponibles</p>
        <button
          onClick={() => window.location.reload()}
          className="ml-2 p-1 rounded hover:bg-white/10 transition-colors"
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
