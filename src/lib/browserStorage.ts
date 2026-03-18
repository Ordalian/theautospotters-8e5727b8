const STORAGE_TEST_KEY = "__lovable_storage_probe__";

type StorageKind = "localStorage" | "sessionStorage";

function createMemoryStorage(): Storage {
  const store = new Map<string, string>();

  return {
    get length() {
      return store.size;
    },
    clear() {
      store.clear();
    },
    getItem(key: string) {
      return store.has(key) ? store.get(key)! : null;
    },
    key(index: number) {
      return Array.from(store.keys())[index] ?? null;
    },
    removeItem(key: string) {
      store.delete(key);
    },
    setItem(key: string, value: string) {
      store.set(String(key), String(value));
    },
  } as Storage;
}

const memoryLocalStorage = createMemoryStorage();
const memorySessionStorage = createMemoryStorage();

function getMemoryStorage(kind: StorageKind): Storage {
  return kind === "localStorage" ? memoryLocalStorage : memorySessionStorage;
}

function canUseStorage(kind: StorageKind): boolean {
  if (typeof window === "undefined") return false;

  try {
    const storage = window[kind];
    storage.setItem(STORAGE_TEST_KEY, "1");
    storage.removeItem(STORAGE_TEST_KEY);
    return true;
  } catch {
    return false;
  }
}

function getSafeStorage(kind: StorageKind): Storage {
  if (typeof window === "undefined") return getMemoryStorage(kind);

  return canUseStorage(kind) ? window[kind] : getMemoryStorage(kind);
}

function installStorageFallback(kind: StorageKind) {
  if (typeof window === "undefined" || canUseStorage(kind)) return;

  const fallback = getMemoryStorage(kind);

  try {
    Object.defineProperty(window, kind, {
      configurable: true,
      enumerable: true,
      value: fallback,
    });
  } catch {
    try {
      (window as Window & Record<StorageKind, Storage>)[kind] = fallback;
    } catch {
      // Ignore: callers can still use getSafeStorage()
    }
  }
}

export function installBrowserStorageFallbacks() {
  installStorageFallback("localStorage");
  installStorageFallback("sessionStorage");
}

export function getSafeLocalStorage(): Storage {
  return getSafeStorage("localStorage");
}

export function getSafeSessionStorage(): Storage {
  return getSafeStorage("sessionStorage");
}
