import { get, set, del } from "idb-keyval";
import type { PersistedClient, Persister } from "@tanstack/react-query-persist-client";

const IDB_KEY = "tqs-react-query-cache";

/**
 * IndexedDB-based persister for React Query.
 * Falls back silently when IndexedDB is unavailable in restricted preview contexts.
 */
export function createIDBPersister(): Persister {
  return {
    persistClient: async (client: PersistedClient) => {
      try {
        await set(IDB_KEY, client);
      } catch {
        // Ignore storage failures and keep the app running without persistence.
      }
    },
    restoreClient: async () => {
      try {
        return await get<PersistedClient>(IDB_KEY);
      } catch {
        return undefined;
      }
    },
    removeClient: async () => {
      try {
        await del(IDB_KEY);
      } catch {
        // Ignore storage failures and keep the app running without persistence.
      }
    },
  };
}
