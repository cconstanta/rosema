/**
 * Правила регистрации Rosemа (Т1–Т5 занятия № 9).
 */

const USERNAME_RE = /^[A-Za-z][A-Za-z0-9_]{3,19}$/;
const HAS_LETTER = /[A-Za-z]/;
const HAS_DIGIT = /\d/;

export function validateUsername(username, taken = new Set()) {
  if (typeof username !== 'string' || username.trim() === '') {
    return { ok: false, code: 'USERNAME_REQUIRED', classId: 'EK-4' };
  }
  if (username.length < 4) {
    return { ok: false, code: 'USERNAME_TOO_SHORT', classId: 'EK-2' };
  }
  if (username.length > 20) {
    return { ok: false, code: 'USERNAME_TOO_LONG', classId: 'EK-3' };
  }
  if (!USERNAME_RE.test(username)) {
    return { ok: false, code: 'USERNAME_FORMAT', classId: 'EK-5' };
  }
  if (taken.has(username.toLowerCase())) {
    return { ok: false, code: 'USERNAME_TAKEN', classId: 'EK-6' };
  }
  return { ok: true, classId: 'EK-1' };
}

export function validatePassword(password) {
  if (typeof password !== 'string' || password === '') {
    return { ok: false, code: 'PASSWORD_REQUIRED', classId: 'EK-10' };
  }
  if (password.length < 8) {
    return { ok: false, code: 'PASSWORD_TOO_SHORT', classId: 'EK-8' };
  }
  if (password.length > 20) {
    return { ok: false, code: 'PASSWORD_TOO_LONG', classId: 'EK-9' };
  }
  if (!HAS_LETTER.test(password) || !HAS_DIGIT.test(password)) {
    return { ok: false, code: 'PASSWORD_WEAK', classId: 'EK-11' };
  }
  return { ok: true, classId: 'EK-7' };
}

export function validatePasswordConfirm(password, confirm) {
  if (password !== confirm) {
    return { ok: false, code: 'PASSWORD_MISMATCH', classId: 'EK-13' };
  }
  return { ok: true, classId: 'EK-12' };
}

export function registerUser({ username, password, passwordConfirm }, taken = new Set()) {
  const name = validateUsername(username, taken);
  if (!name.ok) {
    return { ok: false, error: name };
  }
  const pass = validatePassword(password);
  if (!pass.ok) {
    return { ok: false, error: pass };
  }
  const confirm = validatePasswordConfirm(password, passwordConfirm);
  if (!confirm.ok) {
    return { ok: false, error: confirm };
  }
  return {
    ok: true,
    user: {
      username,
      createdAt: new Date().toISOString(),
    },
  };
}
