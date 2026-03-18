import { getSafeLocalStorage } from "@/lib/browserStorage";

// Bump this value each time a new patch note is added
export const LATEST_PATCH_VERSION = "0.3";

const STORAGE_KEY = "last_seen_patch";

export function hasUnreadPatchNotes(): boolean {
  const seen = getSafeLocalStorage().getItem(STORAGE_KEY);
  return seen !== LATEST_PATCH_VERSION;
}

export function markPatchNotesRead(): void {
  getSafeLocalStorage().setItem(STORAGE_KEY, LATEST_PATCH_VERSION);
}
