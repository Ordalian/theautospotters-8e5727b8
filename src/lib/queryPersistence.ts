import { get, set, del } from "idb-keyval";
import type { PersistedClient, Persister } from "@tanstack/react-query-persist-client";

export const IDB_QUERY_CACHE_KEY = "tqs-react-query-cache";

/**
 * IndexedDB-based persister for React Query.
 * Stores the entire query cache locally so the app renders instantly on repeat visits.
 */
export function createIDBPersister(): Persister {
  return {
    persistClient: async (client: PersistedClient) => {
      await set(IDB_QUERY_CACHE_KEY, client);
    },
    restoreClient: async () => {
      return await get<PersistedClient>(IDB_QUERY_CACHE_KEY);
    },
    removeClient: async () => {
      await del(IDB_QUERY_CACHE_KEY);
    },
  };
}

/** Clears persisted React Query cache (e.g. when a tryout user leaves so no data persists locally). */
export async function clearPersistedQueryCache(): Promise<void> {
  await del(IDB_QUERY_CACHE_KEY);
}
