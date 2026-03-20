import { useState, useEffect } from "react";
import { X, Download, Share, Smartphone, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/i18n/LanguageContext";
import { isStandalone, isIOSSafari, isFirefox, type BeforeInstallPromptEvent } from "@/lib/pwaUtils";

export default function InstallPrompt() {
  const { t } = useLanguage();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showManualPrompt, setShowManualPrompt] = useState<"ios" | "firefox" | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (isStandalone() || localStorage.getItem("pwa-install-dismissed")) return;

    if (isIOSSafari()) {
      setShowManualPrompt("ios");
      return;
    }
    if (isFirefox()) {
      setShowManualPrompt("firefox");
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
    dismiss();
  };

  const dismiss = () => {
    setDismissed(true);
    setDeferredPrompt(null);
    setShowManualPrompt(null);
    localStorage.setItem("pwa-install-dismissed", "1");
  };

  if (dismissed || (!deferredPrompt && !showManualPrompt)) return null;

  const instructions =
    showManualPrompt === "ios"
      ? (t.pwa_install_ios as string)
      : showManualPrompt === "firefox"
        ? (t.pwa_install_firefox as string)
        : (t.pwa_install_desc as string);

  return (
    <div className="sticky top-0 z-50 w-full border-b border-border bg-card/95 backdrop-blur-sm">
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
          <Smartphone className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm truncate">{t.pwa_install_title as string}</p>
          <p className="text-xs text-muted-foreground line-clamp-1">{instructions}</p>
        </div>

        {showManualPrompt === "ios" ? (
          <Share className="h-4 w-4 text-muted-foreground shrink-0" />
        ) : showManualPrompt === "firefox" ? (
          <MoreVertical className="h-4 w-4 text-muted-foreground shrink-0" />
        ) : (
          <Button size="sm" className="gap-1.5 shrink-0" onClick={handleInstall}>
            <Download className="h-3.5 w-3.5" />
            {t.pwa_install_btn as string}
          </Button>
        )}

        <button onClick={dismiss} className="text-muted-foreground hover:text-foreground p-1 shrink-0">
          <X className="h-4 w-4" />
        </button>
      </div>

      {showManualPrompt && (
        <div className="px-4 pb-3 -mt-1">
          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            {showManualPrompt === "ios" ? (
              <>
                <Share className="h-3.5 w-3.5 shrink-0" />
                {t.pwa_install_ios_steps as string}
              </>
            ) : (
              <>
                <MoreVertical className="h-3.5 w-3.5 shrink-0" />
                {t.pwa_install_firefox_steps as string}
              </>
            )}
          </p>
        </div>
      )}
    </div>
  );
}
