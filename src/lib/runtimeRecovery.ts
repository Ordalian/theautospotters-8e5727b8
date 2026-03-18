const RECOVERY_STORAGE_KEY = "lovable-runtime-recovery-at";
const RECOVERY_QUERY_PARAM = "__lovable_recover";
const RECOVERY_WINDOW_MS = 15_000;

const RECOVERABLE_PATTERNS = [
  "failed to fetch dynamically imported module",
  "error loading dynamically imported module",
  "importing a module script failed",
  "loading chunk",
  "chunkloaderror",
  "unable to preload css",
  "dynamically imported module",
  "module script failed",
];

export function normalizeRuntimeErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string") return message;
  }

  try {
    return JSON.stringify(error);
  } catch {
    return "Unknown runtime error";
  }
}

export function isRecoverableChunkError(error: unknown): boolean {
  const message = normalizeRuntimeErrorMessage(error).toLowerCase();
  return RECOVERABLE_PATTERNS.some((pattern) => message.includes(pattern));
}

export function reloadForRuntimeRecovery(): boolean {
  if (typeof window === "undefined") return false;

  const now = Date.now();
  const lastRecoveryAt = Number(window.sessionStorage.getItem(RECOVERY_STORAGE_KEY) ?? 0);

  if (lastRecoveryAt && now - lastRecoveryAt < RECOVERY_WINDOW_MS) {
    return false;
  }

  window.sessionStorage.setItem(RECOVERY_STORAGE_KEY, String(now));

  const url = new URL(window.location.href);
  url.searchParams.set(RECOVERY_QUERY_PARAM, String(now));
  window.location.replace(url.toString());
  return true;
}

export function cleanupRuntimeRecoveryUrl() {
  if (typeof window === "undefined") return;

  const url = new URL(window.location.href);
  if (!url.searchParams.has(RECOVERY_QUERY_PARAM)) return;

  url.searchParams.delete(RECOVERY_QUERY_PARAM);
  window.history.replaceState(window.history.state, "", url.toString());
}
