/**
 * Список контактов текущего пользователя.
 */

import { loadJson, saveJson } from '../core/storage.js';

const KEY = 'rosema.contacts';

function all() {
  return loadJson(KEY, {});
}

export function listContacts(userId) {
  return all()[userId] ?? [];
}

export function addContact(userId, contact) {
  if (!contact?.username) {
    return { ok: false, error: { code: 'CONTACT_REQUIRED' } };
  }
  const db = all();
  const list = db[userId] ?? [];
  if (list.some((c) => c.username === contact.username)) {
    return { ok: false, error: { code: 'CONTACT_EXISTS' } };
  }
  const item = { username: contact.username, addedAt: new Date().toISOString() };
  db[userId] = [...list, item];
  saveJson(KEY, db);
  return { ok: true, contact: item };
}
