/**
 * Жизненный цикл Message (диаграмма состояний).
 */

export const MessageState = {
  DRAFT: 'draft',
  SENDING: 'sending',
  DELIVERED: 'delivered',
  NETWORK_ERROR: 'network_error',
  READ: 'read',
  DELETED: 'deleted',
};

const TRANSITIONS = {
  [MessageState.DRAFT]: {
    send: MessageState.SENDING,
    delete: MessageState.DELETED,
  },
  [MessageState.SENDING]: {
    ack: MessageState.DELIVERED,
    timeout: MessageState.NETWORK_ERROR,
    delete: MessageState.DELETED,
  },
  [MessageState.NETWORK_ERROR]: {
    retry: MessageState.SENDING,
    delete: MessageState.DELETED,
  },
  [MessageState.DELIVERED]: {
    read: MessageState.READ,
    delete: MessageState.DELETED,
  },
  [MessageState.READ]: {
    delete: MessageState.DELETED,
  },
  [MessageState.DELETED]: {},
};

export function createMessage({ chatId, authorId, text = '', type = 'text' }) {
  return {
    id: crypto.randomUUID(),
    chatId,
    authorId,
    text,
    type,
    state: MessageState.DRAFT,
    createdAt: new Date().toISOString(),
  };
}

export function applyMessageEvent(message, event) {
  const next = TRANSITIONS[message.state]?.[event];
  if (!next) {
    return {
      ok: false,
      error: `Нельзя выполнить «${event}» из состояния «${message.state}»`,
    };
  }
  return { ok: true, message: { ...message, state: next } };
}
