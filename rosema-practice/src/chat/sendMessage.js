/**
 * Отправка сообщения: валидация входа + переход draft → sending → delivered.
 * Соответствует диаграмме деятельности / sequence.
 */

import { createMessage, applyMessageEvent, MessageState } from '../models/message.js';

const MAX_TEXT = 4000;

export function validateOutgoing({ chatId, authorId, text }) {
  if (!chatId) {
    return { ok: false, code: 'CHAT_REQUIRED' };
  }
  if (!authorId) {
    return { ok: false, code: 'AUTHOR_REQUIRED' };
  }
  if (typeof text !== 'string' || text.trim() === '') {
    return { ok: false, code: 'TEXT_REQUIRED' };
  }
  if (text.length > MAX_TEXT) {
    return { ok: false, code: 'TEXT_TOO_LONG' };
  }
  return { ok: true };
}

export function sendMessage(input, { failNetwork = false } = {}) {
  const check = validateOutgoing(input);
  if (!check.ok) {
    return { ok: false, error: check };
  }

  let current = createMessage(input);
  const sending = applyMessageEvent(current, 'send');
  if (!sending.ok) {
    return sending;
  }
  current = sending.message;

  if (failNetwork) {
    return applyMessageEvent(current, 'timeout');
  }

  const delivered = applyMessageEvent(current, 'ack');
  return delivered;
}

export { MessageState };
