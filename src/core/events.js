/**
 * Шина событий: модули не вызывают друг друга напрямую.
 */

export function createEventBus() {
  const listeners = new Map();

  function on(event, handler) {
    if (!listeners.has(event)) {
      listeners.set(event, new Set());
    }
    listeners.get(event).add(handler);
    return () => listeners.get(event)?.delete(handler);
  }

  function emit(event, payload) {
    const set = listeners.get(event);
    if (!set) {
      return 0;
    }
    for (const handler of set) {
      handler(payload);
    }
    return set.size;
  }

  return { on, emit };
}
