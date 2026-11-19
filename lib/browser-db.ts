/**
 * Tiny IndexedDB key/value store for the browser. Used for data too large for localStorage
 * (e.g. 10,000 uploaded cards with their 50 loads each). Every call resolves, never throws:
 * reads give null and writes give false when IndexedDB is unavailable (private mode, blocked).
 */
const DB_NAME = "voc-artificial-lift";
const STORE = "kv";

function open(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
      req.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

function run<T>(
  mode: IDBTransactionMode,
  fn: (s: IDBObjectStore) => IDBRequest,
  fallback: T,
  map: (r: unknown) => T,
): Promise<T> {
  return open().then(
    (db) =>
      new Promise<T>((resolve) => {
        if (!db) return resolve(fallback);
        try {
          const tx = db.transaction(STORE, mode);
          const req = fn(tx.objectStore(STORE));
          let result = fallback;
          req.onsuccess = () => {
            result = map(req.result);
          };
          tx.oncomplete = () => {
            db.close();
            resolve(result);
          };
          tx.onerror = tx.onabort = () => {
            db.close();
            resolve(fallback);
          };
        } catch {
          db.close();
          resolve(fallback);
        }
      }),
  );
}

export const idbGet = <T>(key: string) =>
  run<T | null>("readonly", (s) => s.get(key), null, (r) =>
    r === undefined ? null : (r as T),
  );

export const idbSet = (key: string, value: unknown) =>
  run<boolean>("readwrite", (s) => s.put(value, key), false, () => true);

export const idbDelete = (key: string) =>
  run<boolean>("readwrite", (s) => s.delete(key), false, () => true);
