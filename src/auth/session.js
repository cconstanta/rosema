/**
 * Сессия пользователя: регистрация + вход. Данные в storage.
 */

import { registerUser } from '../validation/register.js';
import { loadJson, saveJson } from '../core/storage.js';

const USERS_KEY = 'rosema.users';
const SESSION_KEY = 'rosema.session';

function loadUsers() {
  return loadJson(USERS_KEY, []);
}

export function registerAccount(input) {
  const users = loadUsers();
  const taken = new Set(users.map((u) => u.username.toLowerCase()));
  const result = registerUser(input, taken);
  if (!result.ok) {
    return result;
  }
  const user = { ...result.user, id: `u_${users.length + 1}` };
  users.push(user);
  saveJson(USERS_KEY, users);
  saveJson(SESSION_KEY, { userId: user.id, username: user.username });
  return { ok: true, user };
}

export function login(username) {
  const user = loadUsers().find((u) => u.username === username);
  if (!user) {
    return { ok: false, error: { code: 'USER_NOT_FOUND' } };
  }
  saveJson(SESSION_KEY, { userId: user.id, username: user.username });
  return { ok: true, user };
}

export function currentSession() {
  return loadJson(SESSION_KEY, null);
}

export function logout() {
  saveJson(SESSION_KEY, null);
}
