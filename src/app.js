/**
 * Точка входа Rosemа: поднимает модули и связывает их через шину событий.
 */

import { createEventBus } from './core/events.js';
import { loadJson } from './core/storage.js';
import { registerAccount, login, currentSession } from './auth/session.js';
import { addContact, listContacts } from './contacts/contacts.js';
import { updateProfile, getProfile } from './profile/profile.js';
import { sendMessage } from './chat/sendMessage.js';
import { addReaction, listReactions } from './chat/reactions.js';
import { AuthError, RosemaError, ValidationError } from './core/exceptions.js';

const SCREENS = ['register', 'login', 'contacts', 'profile', 'chat'];

function guard(action) {
  try {
    return action();
  } catch (error) {
    if (error instanceof RosemaError) {
      return { ok: false, error: { code: error.code, message: error.message } };
    }
    return { ok: false, error: { code: 'UNKNOWN', message: 'Произошла неизвестная ошибка' } };
  }
}

export function createApp() {
  const bus = createEventBus();
  const log = [];

  bus.on('user:registered', (user) => log.push(`registered:${user.username}`));
  bus.on('user:login', (user) => log.push(`login:${user.username}`));
  bus.on('message:sent', (msg) => log.push(`sent:${msg.id}`));
  bus.on('reaction:added', (payload) => log.push(`react:${payload.type}`));

  function requireUser() {
    const session = currentSession();
    if (!session) {
      throw new AuthError('Войдите, чтобы продолжить');
    }
    return session;
  }

  return {
    bus,
    log,
    screens: SCREENS,
    register(input) {
      return guard(() => {
        if (!input?.username) {
          throw new ValidationError('Укажите имя пользователя');
        }
        const result = registerAccount(input);
        if (result.ok) {
          bus.emit('user:registered', result.user);
          bus.emit('screen', 'chat');
        }
        return result;
      });
    },
    login(username) {
      return guard(() => {
        const result = login(username);
        if (result.ok) {
          bus.emit('user:login', result.user);
          bus.emit('screen', 'chat');
        }
        return result;
      });
    },
    addContact(contact) {
      return guard(() => {
        const session = requireUser();
        const result = addContact(session.userId, contact);
        if (result.ok) {
          bus.emit('contact:added', result.contact);
        }
        return result;
      });
    },
    listContacts() {
      return guard(() => listContacts(requireUser().userId));
    },
    saveProfile(patch) {
      return guard(() => {
        const session = requireUser();
        const result = updateProfile(session.userId, patch);
        if (result.ok) {
          bus.emit('profile:updated', result.profile);
        }
        return result;
      });
    },
    send(text, chatId = 'c_demo') {
      return guard(() => {
        const session = requireUser();
        const result = sendMessage({ chatId, authorId: session.userId, text });
        if (result.ok) {
          bus.emit('message:sent', result.message);
        }
        return result;
      });
    },
    react(messageId, type) {
      return guard(() => {
        const session = requireUser();
        const result = addReaction({ messageId, userId: session.userId, type });
        if (result.ok) {
          bus.emit('reaction:added', { messageId, type });
        }
        return result;
      });
    },
    snapshot() {
      return {
        session: currentSession(),
        profile: currentSession() ? getProfile(currentSession().userId) : null,
        contacts: currentSession() ? listContacts(currentSession().userId) : [],
        catalog: loadJson('rosema.users', []),
        lastReactions: listReactions,
      };
    },
  };
}

export function initApp() {
  const app = createApp();
  if (typeof document !== 'undefined') {
    document.dispatchEvent(new CustomEvent('rosema:ready', { detail: app }));
  }
  return app;
}

if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', initApp);
}
