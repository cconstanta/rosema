import { test } from 'node:test';
import assert from 'node:assert/strict';
import { registerUser } from '../src/validation/register.js';

const taken = new Set(['taken_user']);

test('TC-01 успешная регистрация', () => {
  const res = registerUser(
    { username: 'rose_01', password: 'Pass1234', passwordConfirm: 'Pass1234' },
    taken,
  );
  assert.equal(res.ok, true);
  assert.equal(res.user.username, 'rose_01');
});

test('TC-02 слишком короткое имя', () => {
  const res = registerUser(
    { username: 'ros', password: 'Pass1234', passwordConfirm: 'Pass1234' },
    taken,
  );
  assert.equal(res.ok, false);
  assert.equal(res.error.code, 'USERNAME_TOO_SHORT');
});

test('TC-03 имя на нижней границе', () => {
  const res = registerUser(
    { username: 'rose', password: 'Pass1234', passwordConfirm: 'Pass1234' },
    taken,
  );
  assert.equal(res.ok, true);
});

test('TC-04 слишком длинное имя', () => {
  const res = registerUser(
    {
      username: 'rose_user_123456789ab',
      password: 'Pass1234',
      passwordConfirm: 'Pass1234',
    },
    taken,
  );
  assert.equal(res.ok, false);
  assert.equal(res.error.code, 'USERNAME_TOO_LONG');
});

test('TC-07 занятое имя', () => {
  const res = registerUser(
    { username: 'taken_user', password: 'Pass1234', passwordConfirm: 'Pass1234' },
    taken,
  );
  assert.equal(res.ok, false);
  assert.equal(res.error.code, 'USERNAME_TAKEN');
});
