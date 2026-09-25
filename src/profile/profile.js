/**
 * Профиль: отображаемое имя и тема оформления.
 */

import { loadJson, saveJson } from '../core/storage.js';

const KEY = 'rosema.profiles';

export function getProfile(userId) {
  const db = loadJson(KEY, {});
  return (
    db[userId] ?? {
      displayName: '',
      theme: 'light',
      about: '',
    }
  );
}

export function updateProfile(userId, patch) {
  if (!userId) {
    return { ok: false, error: { code: 'USER_REQUIRED' } };
  }
  const db = loadJson(KEY, {});
  const next = { ...getProfile(userId), ...patch, updatedAt: new Date().toISOString() };
  db[userId] = next;
  saveJson(KEY, db);
  return { ok: true, profile: next };
}
