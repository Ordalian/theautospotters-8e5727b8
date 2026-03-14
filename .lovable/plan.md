

# Fix Build Errors + Add React Query Persistence (Local Caching)

## 1. Fix Build Errors

**Problem**: The `CardCondition` type includes `"destroyed"` but several `Record<CardCondition, ...>` objects are missing the `destroyed` key.

**Files to fix** (add `destroyed` entry to each Record):

- **`src/lib/boardMovement.ts`** — Two records (`BOARD_CONDITION_MODIFIERS` line 13, `mod` line 30): add `destroyed: 0`
- **`src/lib/cardImageUtils.ts`** — `CONDITION_IMAGE_FILTERS` line 33: add `destroyed: "saturate(0) brightness(0.5)"`
- **`src/pages/CardGame.tsx`** — `CONDITION_RANK` line 76: add `destroyed: -1`
- **`src/hooks/useUserRole.ts`** — line 39 compares `data?.role` to `"map_marker"` but `UserRole` type doesn't include it. Fix: cast or widen the comparison to avoid TS2367 (e.g. `(data?.role as string) === "map_marker"`)

## 2. Add Local Data Caching via React Query Persistence

**Goal**: Cache query data in IndexedDB so the app renders instantly from local cache on repeat visits, then revalidates in the background.

**Steps**:

1. **Install packages**: `@tanstack/react-query-persist-client` and `idb-keyval` (lightweight IndexedDB wrapper)

2. **Create `src/lib/queryPersistence.ts`**:
   - Create an IndexedDB-based persister using `createSyncStoragePersister` or the async `experimental_createPersister` with `idb-keyval`
   - Export the persister instance

3. **Update `src/App.tsx`**:
   - Wrap `QueryClientProvider` with `PersistQueryClientProvider` from `@tanstack/react-query-persist-client`
   - Set `QueryClient` default `gcTime` to 24 hours (so cached data survives across sessions)
   - Pass the persister to the provider

This means all existing `useQuery` calls (garage, cards, profiles, leaderboard, etc.) will automatically be cached locally with zero changes to individual components.

