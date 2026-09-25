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
      return { ok: false, error: { code: 'NOT_AUTHORIZED' } };
    }
    return { ok: true, session };
  }

  return {
    bus,
    log,
    register(input) {
      const result = registerAccount(input);
      if (result.ok) {
        bus.emit('user:registered', result.user);
      }
      return result;
    },
    login(username) {
      const result = login(username);
      if (result.ok) {
        bus.emit('user:login', result.user);
      }
      return result;
    },
    addContact(contact) {
      const auth = requireUser();
      if (!auth.ok) {
        return auth;
      }
      const result = addContact(auth.session.userId, contact);
      if (result.ok) {
        bus.emit('contact:added', result.contact);
      }
      return result;
    },
    listContacts() {
      const auth = requireUser();
      if (!auth.ok) {
        return [];
      }
      return listContacts(auth.session.userId);
    },
    saveProfile(patch) {
      const auth = requireUser();
      if (!auth.ok) {
        return auth;
      }
      const result = updateProfile(auth.session.userId, patch);
      if (result.ok) {
        bus.emit('profile:updated', result.profile);
      }
      return result;
    },
    send(text, chatId = 'c_demo') {
      const auth = requireUser();
      if (!auth.ok) {
        return auth;
      }
      const result = sendMessage({
        chatId,
        authorId: auth.session.userId,
        text,
      });
      if (result.ok) {
        bus.emit('message:sent', result.message);
      }
      return result;
    },
    react(messageId, type) {
      const auth = requireUser();
      if (!auth.ok) {
        return auth;
      }
      const result = addReaction({
        messageId,
        userId: auth.session.userId,
        type,
      });
      if (result.ok) {
        bus.emit('reaction:added', { messageId, type });
      }
      return result;
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
