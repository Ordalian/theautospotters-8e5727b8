

## Plan: Add new utility and hook files

Three new files to create in the project:

1. **`src/lib/pwaUtils.ts`** — Shared PWA/browser-detection utilities (`isStandalone`, `isIOSSafari`, `isFirefox`, `BeforeInstallPromptEvent` interface)
2. **`src/hooks/useAutoRotate.ts`** — Hook that rotates an index on a fixed interval
3. **`src/hooks/useClickOutside.ts`** — Hook that detects clicks outside a ref element

Note: `useClickOutside-2.ts` is identical to `useClickOutside.ts`, so only one copy will be created.

No other files need updating — existing imports of these utilities (e.g. `isStandalone` from `pushNotifications`, `isFirefox` inline checks) can be migrated to use `pwaUtils.ts` in a follow-up if desired.

