import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sendMessage } from '../src/chat/sendMessage.js';
import { MessageState } from '../src/models/message.js';

test('отправка переводит сообщение в delivered', () => {
  const res = sendMessage({
    chatId: 'chat-1',
    authorId: 'user-1',
    text: 'привет',
  });
  assert.equal(res.ok, true);
  assert.equal(res.message.state, MessageState.DELIVERED);
});

test('пустой текст отклоняется', () => {
  const res = sendMessage({ chatId: 'chat-1', authorId: 'user-1', text: '  ' });
  assert.equal(res.ok, false);
  assert.equal(res.error.code, 'TEXT_REQUIRED');
});

test('сбой сети даёт network_error', () => {
  const res = sendMessage(
    { chatId: 'chat-1', authorId: 'user-1', text: 'пинг' },
    { failNetwork: true },
  );
  assert.equal(res.ok, true);
  assert.equal(res.message.state, MessageState.NETWORK_ERROR);
});
