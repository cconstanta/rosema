import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';
import { resetStore } from '../src/core/storage.js';
import { ValidationError } from '../src/core/exceptions.js';

test('пустая регистрация не роняет приложение', () => {
  resetStore();
  const app = createApp();
  const res = app.register({});
  assert.equal(res.ok, false);
  assert.equal(res.error.code, 'VALIDATION_ERROR');
});

test('неизвестная реакция без падения', () => {
  resetStore();
  const app = createApp();
  app.register({ username: 'rose_ex', password: 'Pass1234', passwordConfirm: 'Pass1234' });
  const sent = app.send('текст');
  const react = app.react(sent.message.id, 'boom');
  assert.equal(react.ok, false);
  assert.equal(react.error.code, 'REACTION_UNKNOWN');
});

test('ValidationError — наследник Error', () => {
  const err = new ValidationError('пусто');
  assert.equal(err instanceof Error, true);
  assert.equal(err.code, 'VALIDATION_ERROR');
});
