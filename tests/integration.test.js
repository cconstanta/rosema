import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';
import { resetStore } from '../src/core/storage.js';

test('интеграция: регистрация → контакт → сообщение → реакция', () => {
  resetStore();
  const app = createApp();
  const reg = app.register({
    username: 'rose_int',
    password: 'Pass1234',
    passwordConfirm: 'Pass1234',
  });
  assert.equal(reg.ok, true);

  const contact = app.addContact({ username: 'artyukhin' });
  assert.equal(contact.ok, true);

  const profile = app.saveProfile({ displayName: 'Kostya', theme: 'dark' });
  assert.equal(profile.ok, true);

  const sent = app.send('интеграционный ping');
  assert.equal(sent.ok, true);
  assert.equal(sent.message.state, 'delivered');

  const react = app.react(sent.message.id, 'like');
  assert.equal(react.ok, true);

  assert.ok(app.log.includes(`registered:rose_int`));
  assert.ok(app.log.some((line) => line.startsWith('sent:')));
});

test('интеграция: без сессии сообщение отклоняется', () => {
  resetStore();
  const app = createApp();
  const sent = app.send('нет сессии');
  assert.equal(sent.ok, false);
  assert.equal(sent.error.code, 'NOT_AUTHORIZED');
});
