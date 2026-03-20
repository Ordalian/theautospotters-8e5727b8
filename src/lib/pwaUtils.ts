/**
 * Shared PWA / browser-detection utilities.
 * Single source of truth — import from here instead of defining locally.
 */

/** Event fired by Chrome/Edge before showing the native install prompt. */
export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/** True when the app is running in standalone / installed mode. */
export function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as any).standalone === true
  );
}

/** True when running on iOS Safari (not Chrome/Firefox on iOS). */
export function isIOSSafari(): boolean {
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) &&
    !(window as any).MSStream &&
    /^((?!chrome|android).)*safari/i.test(navigator.userAgent)
  );
}

/** True when running in Firefox desktop or Android. */
export function isFirefox(): boolean {
  return /firefox/i.test(navigator.userAgent);
}