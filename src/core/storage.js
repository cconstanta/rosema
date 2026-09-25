/**
 * Обёртка над localStorage с запасным хранилищем в памяти (Node / тесты).
 */

function createMemoryStore() {
  const map = new Map();
  return {
    getItem(key) {
      return map.has(key) ? map.get(key) : null;
    },
    setItem(key, value) {
      map.set(key, String(value));
    },
    removeItem(key) {
      map.delete(key);
    },
  };
}

const backend =
  typeof globalThis.localStorage === 'undefined'
    ? createMemoryStore()
    : globalThis.localStorage;

export function loadJson(key, fallback) {
  const raw = backend.getItem(key);
  if (!raw) {
    return fallback;
  }
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function saveJson(key, value) {
  backend.setItem(key, JSON.stringify(value));
  return value;
}

export function remove(key) {
  backend.removeItem(key);
}

export function resetStore() {
  for (const key of ['rosema.users', 'rosema.session', 'rosema.contacts', 'rosema.profiles', 'rosema.reactions']) {
    backend.removeItem(key);
  }
}
