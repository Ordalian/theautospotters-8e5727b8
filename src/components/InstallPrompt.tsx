import { useState, useEffect } from "react";
import { X, Download, Share, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/i18n/LanguageContext";
import { isStandalone } from "@/lib/pushNotifications";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function InstallPrompt() {
  const { t } = useLanguage();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIOSPrompt, setShowIOSPrompt] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (isStandalone()) return;
    if (localStorage.getItem("pwa-install-dismissed")) return;

    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

    if (isIOS && isSafari) {
      setShowIOSPrompt(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") setDeferredPrompt(null);
    setDismissed(true);
    localStorage.setItem("pwa-install-dismissed", "1");
  };

  const handleDismiss = () => {
    setDismissed(true);
    setDeferredPrompt(null);
    setShowIOSPrompt(false);
    localStorage.setItem("pwa-install-dismissed", "1");
  };

  if (dismissed || (!deferredPrompt && !showIOSPrompt)) return null;

  return (
    <div className="sticky top-0 z-50 w-full border-b border-border bg-card/95 backdrop-blur-sm">
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
          <Smartphone className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm truncate">{t.pwa_install_title as string}</p>
          <p className="text-xs text-muted-foreground line-clamp-1">
            {showIOSPrompt
              ? (t.pwa_install_ios as string)
              : (t.pwa_install_desc as string)}
          </p>
        </div>
        {showIOSPrompt ? (
          <p className="text-xs text-muted-foreground flex items-center gap-1 shrink-0">
            <Share className="h-3.5 w-3.5" />
          </p>
        ) : (
          <Button size="sm" className="gap-1.5 shrink-0" onClick={handleInstall}>
            <Download className="h-3.5 w-3.5" />
            {t.pwa_install_btn as string}
          </Button>
        )}
        <button onClick={handleDismiss} className="text-muted-foreground hover:text-foreground p-1 shrink-0">
          <X className="h-4 w-4" />
        </button>
      </div>
      {showIOSPrompt && (
        <div className="px-4 pb-3 -mt-1">
          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Share className="h-3.5 w-3.5 shrink-0" />
            {t.pwa_install_ios_steps as string}
          </p>
        </div>
      )}
    </div>
  );
}
