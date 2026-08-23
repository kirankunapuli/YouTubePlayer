/**
 * Test setup: Node 22+ exposes an experimental `localStorage` global that
 * shadows jsdom's implementation (and is undefined without --localstorage-file).
 * Stub a working in-memory localStorage so useLocalStorage works in tests.
 */

if (globalThis.localStorage == null) {
  const store = new Map();

  globalThis.localStorage = {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => {
      store.set(key, String(value));
    },
    removeItem: (key) => {
      store.delete(key);
    },
    clear: () => {
      store.clear();
    },
    key: (index) => Array.from(store.keys())[index] ?? null,
    get length() {
      return store.size;
    },
  };
}
