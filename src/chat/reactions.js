/**
 * Реакции на сообщение: один пользователь — одна реакция.
 */

import { loadJson, saveJson } from '../core/storage.js';

const KEY = 'rosema.reactions';
const ALLOWED = new Set(['like', 'heart', 'fire', 'laugh']);

export function addReaction({ messageId, userId, type }) {
  if (!messageId || !userId) {
    return { ok: false, error: { code: 'REACTION_TARGET_REQUIRED' } };
  }
  if (!ALLOWED.has(type)) {
    return { ok: false, error: { code: 'REACTION_UNKNOWN' } };
  }
  const db = loadJson(KEY, {});
  const list = (db[messageId] ?? []).filter((r) => r.userId !== userId);
  list.push({ userId, type, at: new Date().toISOString() });
  db[messageId] = list;
  saveJson(KEY, db);
  return { ok: true, reactions: list };
}

export function listReactions(messageId) {
  const db = loadJson(KEY, {});
  return db[messageId] ?? [];
}
