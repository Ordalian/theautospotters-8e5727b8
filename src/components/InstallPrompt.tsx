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
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-md animate-in fade-in duration-300">
      <div className="relative mx-4 w-full max-w-sm rounded-3xl border border-border bg-card p-8 shadow-2xl text-center space-y-6 animate-in zoom-in-95 slide-in-from-bottom-4 duration-500">
        {/* Close */}
        <button
          onClick={handleDismiss}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors p-1"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Icon */}
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10">
          <Smartphone className="h-10 w-10 text-primary" />
        </div>

        {/* Title & description */}
        <div className="space-y-2">
          <h2 className="text-2xl font-bold tracking-tight">
            {t.pwa_install_title as string}
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {showIOSPrompt
              ? (t.pwa_install_ios as string)
              : (t.pwa_install_desc as string)}
          </p>
        </div>

        {/* Action */}
        {showIOSPrompt ? (
          <div className="rounded-xl bg-secondary/50 p-4">
            <p className="text-sm text-muted-foreground flex items-center justify-center gap-2">
              <Share className="h-4 w-4 shrink-0" />
              {t.pwa_install_ios_steps as string}
            </p>
          </div>
        ) : (
          <Button size="lg" className="w-full gap-2 text-base" onClick={handleInstall}>
            <Download className="h-5 w-5" />
            {t.pwa_install_btn as string}
          </Button>
        )}

        {/* Dismiss link */}
        <button
          onClick={handleDismiss}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {t.pwa_install_dismiss as string}
        </button>
      </div>
    </div>
  );
}
