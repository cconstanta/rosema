import {
  BOT_DELIVER_MS,
  BOT_REPLY_DELAY_MS,
  SECRET_MESSAGE_TTL_MS,
  SEND_SETTLE_MS,
} from "@/lib/rosema/constants";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import {
  CHANNEL_ID,
  type Chat,
  type Message,
  type MsgState,
  type Poll,
  type ReactionType,
  type Result,
  type Session,
  type Story,
  type ThemeName,
  type User,
  type WallpaperName,
  checkOutgoing,
  checkProfile,
  checkRegistration,
  createSeed,
  fail,
  userById,
} from "@/lib/rosema/logic";

type RosemaState = {
  users: User[];
  chats: Chat[];
  messages: Message[];
  contacts: Record<string, string[]>;
  stories: Story[];
  session: Session | null;
  activeChatId: string | null;
  simulateFailure: boolean;
  drafts: Record<string, string>;
  typing: { chatId: string; userId: string } | null;
  register: (input: { username: string; password: string; passwordConfirm: string }) => Result;
  login: (username: string, password: string) => Result;
  loginGuest: () => void;
  logout: () => void;
  setActiveChat: (id: string | null) => void;
  send: (text: string, replyToId?: string, image?: string) => Result;
  edit: (messageId: string, text: string) => Result;
  retry: (messageId: string) => Result;
  removeMessage: (messageId: string) => Result;
  react: (messageId: string, type: ReactionType) => Result;
  keep: (messageId: string) => Result;
  forward: (messageId: string, targetChatId: string) => Result;
  ensureSaved: () => void;
  setDraft: (chatId: string, text: string) => void;
  togglePin: (chatId: string) => void;
  toggleMute: (chatId: string) => void;
  renameChat: (chatId: string, title: string) => Result;
  addMember: (chatId: string, userId: string) => Result;
  removeMember: (chatId: string, userId: string) => Result;
  toggleArchive: (chatId: string) => void;
  markUnread: (chatId: string) => void;
  pinMessage: (messageId: string) => Result;
  deleteChat: (chatId: string) => Result;
  clearHistory: (chatId: string) => Result;
  createGroup: (title: string, memberIds: string[]) => Result;
  toggleBlock: (chatId: string) => Result;
  sendPoll: (question: string, options: string[]) => Result;
  vote: (messageId: string, option: number) => Result;
  sendVoice: (dataUrl: string, seconds: number) => Result;
  sendSticker: (sticker: string) => Result;
  sendFile: (name: string) => Result;
  scheduleSend: (text: string, delayMs: number) => Result;
  createChannel: (title: string) => Result;
  openSecret: (userId: string) => Result;
  postStory: (text: string) => Result;
  seeStory: (storyId: string) => void;
  sweep: () => void;
  ensureBot: () => void;
  ensureStories: () => void;
  addContact: (username: string) => Result;
  removeContact: (userId: string) => void;
  updateProfile: (patch: { displayName: string; about: string }) => Result;
  setTheme: (theme: ThemeName) => void;
  setAccent: (accent: string) => void;
  setWallpaper: (wallpaper: WallpaperName) => void;
  setSimulateFailure: (value: boolean) => void;
  markRead: (chatId: string) => void;
  openDirect: (userId: string) => Result;
};

const seed = createSeed();
const replyPending = new Set<string>();

function uid(prefix: string) {
  return `${prefix}_${crypto.randomUUID()}`;
}

function pushMessage(messages: Message[], message: Message) {
  return [...messages, message];
}

function botAnswer(text: string): string {
  const q = text.trim().toLowerCase();
  if (q.startsWith("/help")) return "Команды: /help, /time, /dice, /id";
  if (q.startsWith("/time")) return new Date().toLocaleString("ru-RU", { timeZone: "Europe/Vilnius" });
  if (q.startsWith("/dice")) return `🎲 ${1 + Math.floor(Math.random() * 6)}`;
  if (q.startsWith("/id")) return "Локальный бот Rosema. Сообщения не уходят с устройства.";
  return "Не понял команду. Напишите /help";
}

export const useRosema = create<RosemaState>()(
  persist(
    (set, get) => {
      function patchMessage(id: string, next: MsgState) {
        set((state) => ({
          messages: state.messages.map((message) =>
            message.id === id && message.state === "sending" ? { ...message, state: next } : message,
          ),
        }));
      }

      function ensureSavedChat(userId: string): string {
        const existing = get().chats.find((chat) => chat.saved && chat.memberIds.includes(userId));
        if (existing) return existing.id;
        const id = uid("c");
        const chat: Chat = {
          id,
          type: "direct",
          title: "Избранное",
          memberIds: [userId],
          saved: true,
        };
        set((state) => ({ chats: [...state.chats, chat] }));
        return id;
      }

      function queueReply(chatId: string, text: string, authorId: string) {
        const chat = get().chats.find((item) => item.id === chatId);
        if (!chat || chat.saved || chat.type === "channel") return;
        const botId = chat.memberIds.find((id) => id === "u_bot");
        if (!botId) return;
        if (replyPending.has(chatId)) return;
        replyPending.add(chatId);
        set({ typing: { chatId, userId: botId } });
        window.setTimeout(() => {
          replyPending.delete(chatId);
          const sourceId = get()
            .messages.filter((item) => item.chatId === chatId && item.authorId === authorId)
            .at(-1)?.id;
          const replyId = uid("m");
          const reply: Message = {
            id: replyId,
            chatId,
            authorId: botId,
            text: botAnswer(text),
            state: "sending",
            createdAt: new Date().toISOString(),
            reactions: [],
            replyToId: sourceId,
          };
          set((state) => ({ typing: null, messages: pushMessage(state.messages, reply) }));
          window.setTimeout(() => {
            set((state) => ({
              messages: state.messages.map((message) => {
                if (message.id === replyId && message.state === "sending") {
                  return { ...message, state: "delivered" as const };
                }
                if (message.chatId === chatId && message.authorId === authorId && message.state === "delivered") {
                  return { ...message, state: "read" as const };
                }
                return message;
              }),
            }));
          }, BOT_DELIVER_MS);
        }, BOT_REPLY_DELAY_MS);
      }

      function settleSend(messageId: string, chatId: string, authorId: string, text: string) {
        window.setTimeout(() => {
          const current = get().messages.find((message) => message.id === messageId);
          if (!current || current.state !== "sending") return;
          if (get().simulateFailure) {
            patchMessage(messageId, "network_error");
            return;
          }
          patchMessage(messageId, "delivered");
          const chat = get().chats.find((item) => item.id === chatId);
          if (chat?.secret) {
            const expiresAt = new Date(Date.now() + SECRET_MESSAGE_TTL_MS).toISOString();
            set((state) => ({
              messages: state.messages.map((message) => (message.id === messageId ? { ...message, expiresAt } : message)),
            }));
          }
          queueReply(chatId, text, authorId);
        }, SEND_SETTLE_MS);
      }

      function publishMedia(partial: Pick<Message, "text"> & Partial<Message>): Result {
        const session = get().session;
        if (!session || session.guest) return fail("NOT_AUTHORIZED");
        const chatId = get().activeChatId;
        const chat = chatId ? get().chats.find((item) => item.id === chatId) : undefined;
        if (!chatId || !chat) return fail("CHAT_REQUIRED");
        if (chat.blocked) return fail("BLOCKED");
        if (chat.type === "channel" && chat.adminId !== session.userId) return fail("CHANNEL_READONLY");
        if (chat.type !== "channel" && !chat.memberIds.includes(session.userId)) return fail("CHAT_REQUIRED");
        const message: Message = {
          id: uid("m"),
          chatId,
          authorId: session.userId,
          text: partial.text,
          state: "sending",
          createdAt: new Date().toISOString(),
          reactions: [],
          voice: partial.voice,
          voiceSec: partial.voiceSec,
          sticker: partial.sticker,
          fileName: partial.fileName,
        };
        set((state) => ({ messages: pushMessage(state.messages, message) }));
        settleSend(message.id, chatId, session.userId, partial.sticker || partial.fileName || "Голосовое");
        return { ok: true };
      }

      return {
        users: seed.users,
        chats: seed.chats,
        messages: seed.messages,
        contacts: seed.contacts,
        stories: [
          {
            id: "s_art_1",
            authorId: "u_art",
            text: "После пар сижу в кофейне на углу. Кто мимо — заходите.",
            tone: "lab",
            createdAt: new Date().toISOString(),
            seenBy: [],
          },
          {
            id: "s_art_2",
            authorId: "u_art",
            text: "Дождь. Если кто на остановке, напишите, подхвачу.",
            tone: "night",
            createdAt: new Date(Date.now() + 1000).toISOString(),
            seenBy: [],
          },
          {
            id: "s_rom_1",
            authorId: "u_roman",
            text: "Завтра консультация в 16:00, кабинет 214. Без записи.",
            tone: "paper",
            createdAt: new Date().toISOString(),
            seenBy: [],
          },
        ],
        session: { userId: "u_rose" },
        activeChatId: "c_group",
        simulateFailure: false,
        drafts: {},
        typing: null,

        register(input) {
          const taken = new Set(get().users.map((user) => user.username.toLowerCase()));
          const checked = checkRegistration(input, taken);
          if (!checked.ok) return checked;
          const id = uid("u");
          const user: User = {
            id,
            username: checked.username ?? input.username.trim(),
            password: input.password,
            displayName: checked.username ?? input.username.trim(),
            about: "",
            theme: "dark",
            role: "user",
            createdAt: new Date().toISOString(),
          };
          const savedId = uid("c");
          const saved: Chat = {
            id: savedId,
            type: "direct",
            title: "Избранное",
            memberIds: [id],
            saved: true,
          };
          const welcome: Message = {
            id: uid("m"),
            chatId: savedId,
            authorId: id,
            text: "Сюда можно кидать заметки себе.",
            state: "read",
            createdAt: new Date().toISOString(),
            reactions: [],
          };
          set((state) => ({
            users: [...state.users, user],
            chats: [...state.chats, saved],
            messages: pushMessage(state.messages, welcome),
            contacts: { ...state.contacts, [id]: [] },
            session: { userId: id },
            activeChatId: savedId,
          }));
          return { ok: true };
        },

        login(username, password) {
          const user = get().users.find((item) => item.username === username.trim());
          if (!user) return fail("USER_NOT_FOUND", "username");
          if (user.password !== password) return fail("BAD_PASSWORD", "password");
          const home =
            get().chats.find((chat) => chat.id === "c_group" && chat.memberIds.includes(user.id)) ??
            get().chats.find((chat) => chat.type !== "channel" && chat.memberIds.includes(user.id));
          set({ session: { userId: user.id }, activeChatId: home?.id ?? null });
          return { ok: true };
        },

        loginGuest() {
          set({ session: { userId: "guest", guest: true }, activeChatId: CHANNEL_ID });
        },

        logout() {
          set({ session: null, activeChatId: null });
        },

        setActiveChat(id) {
          set({ activeChatId: id });
        },

        send(text, replyToId, image) {
          const session = get().session;
          if (!session) return fail("NOT_AUTHORIZED");
          if (session.guest) return fail("GUEST_LIMIT");
          const chatId = get().activeChatId;
          if (!chatId) return fail("CHAT_REQUIRED");
          const chat = get().chats.find((item) => item.id === chatId);
          if (!chat) return fail("CHAT_REQUIRED");
          if (chat.blocked) return fail("BLOCKED");
          if (chat.type === "channel" && chat.adminId !== session.userId) return fail("CHANNEL_READONLY");
          if (chat.type !== "channel" && !chat.memberIds.includes(session.userId)) return fail("CHAT_REQUIRED");
          const caption = text.trim();
          if (!image || caption) {
            const checked = checkOutgoing(caption || text);
            if (!checked.ok) return checked;
          }
          const reply =
            replyToId && get().messages.some((item) => item.id === replyToId && item.chatId === chatId)
              ? replyToId
              : undefined;
          const message: Message = {
            id: uid("m"),
            chatId,
            authorId: session.userId,
            text: caption,
            image,
            state: "sending",
            createdAt: new Date().toISOString(),
            reactions: [],
            replyToId: reply,
          };
          set((state) => {
            const drafts = { ...(state.drafts ?? {}) };
            delete drafts[chatId];
            return { messages: pushMessage(state.messages, message), drafts };
          });
          settleSend(message.id, chatId, session.userId, message.text);
          return { ok: true };
        },

        edit(messageId, text) {
          const session = get().session;
          if (!session || session.guest) return fail("NOT_AUTHORIZED");
          const message = get().messages.find((item) => item.id === messageId);
          if (
            !message ||
            message.authorId !== session.userId ||
            message.state === "deleted" ||
            message.state === "sending" ||
            message.state === "network_error" ||
            message.forwardedFrom
          ) {
            return fail("EDIT_DENIED");
          }
          const checked = checkOutgoing(text);
          if (!checked.ok) return checked;
          set((state) => ({
            messages: state.messages.map((item) =>
              item.id === messageId ? { ...item, text: text.trim(), edited: true } : item,
            ),
          }));
          return { ok: true };
        },

        retry(messageId) {
          const session = get().session;
          if (!session || session.guest) return fail("NOT_AUTHORIZED");
          const message = get().messages.find((item) => item.id === messageId);
          if (!message || message.authorId !== session.userId || message.state !== "network_error") {
            return fail("RETRY_DENIED");
          }
          set((state) => ({
            messages: state.messages.map((item) =>
              item.id === messageId ? { ...item, state: "sending" as const } : item,
            ),
          }));
          settleSend(messageId, message.chatId, session.userId, message.text);
          return { ok: true };
        },

        removeMessage(messageId) {
          const session = get().session;
          if (!session || session.guest) return fail("NOT_AUTHORIZED");
          const message = get().messages.find((item) => item.id === messageId);
          if (!message || message.authorId !== session.userId || message.state === "deleted") {
            return fail("DELETE_DENIED");
          }
          set((state) => ({
            messages: state.messages.map((item) =>
              item.id === messageId ? { ...item, state: "deleted" as const, text: "", reactions: [] } : item,
            ),
          }));
          return { ok: true };
        },

        react(messageId, type) {
          const session = get().session;
          if (!session || session.guest) return fail("GUEST_LIMIT");
          const message = get().messages.find((item) => item.id === messageId);
          if (!message || message.state === "deleted" || message.state === "sending" || message.state === "network_error") {
            return fail("REACTION_EARLY");
          }
          set((state) => ({
            messages: state.messages.map((item) => {
              if (item.id !== messageId) return item;
              const mine = item.reactions.find((reaction) => reaction.userId === session.userId);
              const rest = item.reactions.filter((reaction) => reaction.userId !== session.userId);
              if (mine?.type === type) return { ...item, reactions: rest };
              return { ...item, reactions: [...rest, { userId: session.userId, type }] };
            }),
          }));
          return { ok: true };
        },

        keep(messageId) {
          const session = get().session;
          if (!session || session.guest) return fail("NOT_AUTHORIZED");
          const message = get().messages.find((item) => item.id === messageId);
          if (!message || message.state === "deleted" || (message.text.trim() === "" && !message.image)) {
            return fail("DELETE_DENIED");
          }
          const savedId = ensureSavedChat(session.userId);
          const copy: Message = {
            id: uid("m"),
            chatId: savedId,
            authorId: session.userId,
            text: message.text,
            image: message.image,
            state: "read",
            createdAt: new Date().toISOString(),
            reactions: [],
          };
          set((state) => ({ messages: pushMessage(state.messages, copy) }));
          return { ok: true };
        },

        forward(messageId, targetChatId) {
          const session = get().session;
          if (!session || session.guest) return fail("NOT_AUTHORIZED");
          const message = get().messages.find((item) => item.id === messageId);
          const chat = get().chats.find((item) => item.id === targetChatId);
          if (!message || message.state === "deleted" || !chat) return fail("CHAT_REQUIRED");
          if (chat.type === "channel" && chat.adminId !== session.userId) return fail("CHANNEL_READONLY");
          if (chat.type !== "channel" && !chat.memberIds.includes(session.userId)) return fail("CHAT_REQUIRED");
          const copy: Message = {
            id: uid("m"),
            chatId: targetChatId,
            authorId: session.userId,
            text: message.text,
            image: message.image,
            voice: message.voice,
            voiceSec: message.voiceSec,
            sticker: message.sticker,
            fileName: message.fileName,
            poll: message.poll,
            forwardedFrom: userById(get().users, message.authorId)?.displayName,
            state: "delivered",
            createdAt: new Date().toISOString(),
            reactions: [],
          };
          set((state) => ({ messages: pushMessage(state.messages, copy) }));
          return { ok: true };
        },

        ensureSaved() {
          const session = get().session;
          if (!session || session.guest) return;
          ensureSavedChat(session.userId);
        },

        setDraft(chatId, text) {
          set((state) => {
            const drafts = { ...(state.drafts ?? {}) };
            if (text.trim() === "") delete drafts[chatId];
            else drafts[chatId] = text;
            return { drafts };
          });
        },

        togglePin(chatId) {
          set((state) => ({
            chats: state.chats.map((chat) => (chat.id === chatId ? { ...chat, pinned: !chat.pinned } : chat)),
          }));
        },

        toggleMute(chatId) {
          set((state) => ({
            chats: state.chats.map((chat) => (chat.id === chatId ? { ...chat, muted: !chat.muted } : chat)),
          }));
        },

        renameChat(chatId, title) {
          const session = get().session;
          if (!session || session.guest) return fail("NOT_AUTHORIZED");
          const chat = get().chats.find((item) => item.id === chatId);
          if (!chat || chat.type === "direct" || !chat.memberIds.includes(session.userId)) return fail("CHAT_REQUIRED");
          if (chat.type === "channel" && chat.adminId !== session.userId) return fail("CHANNEL_READONLY");
          const next = title.trim();
          if (next.length < 1 || next.length > 40) return fail("DISPLAY_NAME");
          set((state) => ({
            chats: state.chats.map((item) => (item.id === chatId ? { ...item, title: next } : item)),
          }));
          return { ok: true };
        },

        addMember(chatId, userId) {
          const session = get().session;
          if (!session || session.guest) return fail("NOT_AUTHORIZED");
          const chat = get().chats.find((item) => item.id === chatId);
          if (!chat || chat.type !== "group" || !chat.memberIds.includes(session.userId)) return fail("CHAT_REQUIRED");
          if (!userById(get().users, userId)) return fail("CONTACT_UNKNOWN");
          if (chat.memberIds.includes(userId)) return fail("CONTACT_EXISTS");
          set((state) => ({
            chats: state.chats.map((item) =>
              item.id === chatId ? { ...item, memberIds: [...item.memberIds, userId] } : item,
            ),
          }));
          return { ok: true };
        },

        removeMember(chatId, userId) {
          const session = get().session;
          if (!session || session.guest) return fail("NOT_AUTHORIZED");
          const chat = get().chats.find((item) => item.id === chatId);
          if (!chat || chat.saved || chat.type === "direct" || !chat.memberIds.includes(session.userId)) {
            return fail("CHAT_REQUIRED");
          }
          const self = userId === session.userId;
          if (!self && chat.adminId !== session.userId) return fail("DELETE_DENIED");
          set((state) => ({
            chats: state.chats.map((item) =>
              item.id === chatId ? { ...item, memberIds: item.memberIds.filter((id) => id !== userId) } : item,
            ),
            activeChatId: self && state.activeChatId === chatId ? null : state.activeChatId,
          }));
          return { ok: true };
        },

        toggleArchive(chatId) {
          set((state) => ({
            chats: state.chats.map((chat) => (chat.id === chatId ? { ...chat, archived: !chat.archived } : chat)),
            activeChatId: state.activeChatId === chatId ? null : state.activeChatId,
          }));
        },

        markUnread(chatId) {
          set((state) => ({
            chats: state.chats.map((chat) => (chat.id === chatId ? { ...chat, forcedUnread: true } : chat)),
            activeChatId: state.activeChatId === chatId ? null : state.activeChatId,
          }));
        },

        pinMessage(messageId) {
          const session = get().session;
          if (!session || session.guest) return fail("NOT_AUTHORIZED");
          const message = get().messages.find((item) => item.id === messageId);
          if (!message || message.state === "deleted") return fail("CHAT_REQUIRED");
          set((state) => ({
            chats: state.chats.map((chat) =>
              chat.id === message.chatId
                ? { ...chat, pinnedMessageId: chat.pinnedMessageId === messageId ? undefined : messageId }
                : chat,
            ),
          }));
          return { ok: true };
        },

        deleteChat(chatId) {
          const session = get().session;
          if (!session || session.guest) return fail("NOT_AUTHORIZED");
          const chat = get().chats.find((item) => item.id === chatId);
          if (!chat || chat.saved) return fail("CHAT_REQUIRED");
          set((state) => ({
            chats: state.chats.filter((item) => item.id !== chatId),
            messages: state.messages.filter((item) => item.chatId !== chatId),
            activeChatId: state.activeChatId === chatId ? null : state.activeChatId,
          }));
          return { ok: true };
        },

        clearHistory(chatId) {
          const session = get().session;
          if (!session || session.guest) return fail("NOT_AUTHORIZED");
          set((state) => ({
            messages: state.messages.filter((item) => item.chatId !== chatId),
            chats: state.chats.map((chat) => (chat.id === chatId ? { ...chat, pinnedMessageId: undefined } : chat)),
          }));
          return { ok: true };
        },

        createGroup(title, memberIds) {
          const session = get().session;
          if (!session || session.guest) return fail("NOT_AUTHORIZED");
          const next = title.trim();
          if (next.length < 1 || next.length > 40) return fail("DISPLAY_NAME");
          const unique = [...new Set(memberIds.filter((id) => id !== session.userId && userById(get().users, id)))];
          if (unique.length === 0) return fail("CONTACT_REQUIRED");
          const chat: Chat = {
            id: uid("c"),
            type: "group",
            title: next,
            memberIds: [session.userId, ...unique],
            adminId: session.userId,
          };
          set((state) => ({ chats: [...state.chats, chat], activeChatId: chat.id }));
          return { ok: true };
        },

        toggleBlock(chatId) {
          const session = get().session;
          if (!session || session.guest) return fail("NOT_AUTHORIZED");
          const chat = get().chats.find((item) => item.id === chatId);
          if (!chat || chat.type !== "direct" || chat.saved) return fail("CHAT_REQUIRED");
          set((state) => ({
            chats: state.chats.map((item) => (item.id === chatId ? { ...item, blocked: !item.blocked } : item)),
          }));
          return { ok: true };
        },

        sendPoll(question, options) {
          const session = get().session;
          if (!session || session.guest) return fail("NOT_AUTHORIZED");
          const chatId = get().activeChatId;
          const chat = get().chats.find((item) => item.id === chatId);
          if (!chatId || !chat) return fail("CHAT_REQUIRED");
          if (chat.blocked) return fail("BLOCKED");
          if (chat.type === "channel" && chat.adminId !== session.userId) return fail("CHANNEL_READONLY");
          const clean = options.map((item) => item.trim()).filter(Boolean).slice(0, 4);
          const title = question.trim();
          if (title.length < 1 || clean.length < 2) return fail("TEXT_REQUIRED");
          const poll: Poll = { question: title, options: clean.map((text) => ({ text, voterIds: [] })) };
          const message: Message = {
            id: uid("m"),
            chatId,
            authorId: session.userId,
            text: title,
            state: "sending",
            createdAt: new Date().toISOString(),
            reactions: [],
            poll,
          };
          set((state) => ({ messages: pushMessage(state.messages, message) }));
          window.setTimeout(() => patchMessage(message.id, get().simulateFailure ? "network_error" : "delivered"), 700);
          return { ok: true };
        },

        vote(messageId, option) {
          const session = get().session;
          if (!session || session.guest) return fail("NOT_AUTHORIZED");
          const message = get().messages.find((item) => item.id === messageId);
          if (!message?.poll || option < 0 || option >= message.poll.options.length) return fail("CHAT_REQUIRED");
          set((state) => ({
            messages: state.messages.map((item) => {
              if (item.id !== messageId || !item.poll) return item;
              return {
                ...item,
                poll: {
                  ...item.poll,
                  options: item.poll.options.map((choice, index) => ({
                    ...choice,
                    voterIds:
                      index === option
                        ? [...choice.voterIds.filter((id) => id !== session.userId), session.userId]
                        : choice.voterIds.filter((id) => id !== session.userId),
                  })),
                },
              };
            }),
          }));
          return { ok: true };
        },

        addContact(username) {
          const session = get().session;
          if (!session || session.guest) return fail("NOT_AUTHORIZED");
          const name = username.trim();
          if (!name) return fail("CONTACT_REQUIRED", "username");
          const user = get().users.find((item) => item.username === name);
          if (!user) return fail("CONTACT_UNKNOWN", "username");
          if (user.id === session.userId) return fail("CONTACT_SELF", "username");
          const list = get().contacts[session.userId] ?? [];
          if (list.includes(user.id)) return fail("CONTACT_EXISTS", "username");
          set((state) => ({
            contacts: { ...state.contacts, [session.userId]: [...list, user.id] },
          }));
          return { ok: true };
        },

        removeContact(userId) {
          const session = get().session;
          if (!session || session.guest) return;
          set((state) => ({
            contacts: {
              ...state.contacts,
              [session.userId]: (state.contacts[session.userId] ?? []).filter((id) => id !== userId),
            },
          }));
        },

        updateProfile(patch) {
          const session = get().session;
          if (!session || session.guest) return fail("NOT_AUTHORIZED");
          const checked = checkProfile(patch.displayName, patch.about);
          if (!checked.ok) return checked;
          set((state) => ({
            users: state.users.map((user) =>
              user.id === session.userId
                ? { ...user, displayName: patch.displayName.trim(), about: patch.about.trim() }
                : user,
            ),
          }));
          return { ok: true };
        },

        setTheme(theme) {
          const session = get().session;
          if (!session || session.guest) return;
          set((state) => ({
            users: state.users.map((user) => (user.id === session.userId ? { ...user, theme } : user)),
          }));
        },

        setAccent(accent) {
          const session = get().session;
          if (!session || session.guest) return;
          const color = /^#[0-9a-fA-F]{6}$/.test(accent) ? accent : "";
          set((state) => ({
            users: state.users.map((user) => (user.id === session.userId ? { ...user, accent: color || undefined } : user)),
          }));
        },

        setWallpaper(wallpaper) {
          const session = get().session;
          if (!session || session.guest) return;
          set((state) => ({
            users: state.users.map((user) => (user.id === session.userId ? { ...user, wallpaper } : user)),
          }));
        },

        setSimulateFailure(value) {
          set({ simulateFailure: value });
        },

        markRead(chatId) {
          const session = get().session;
          if (!session || session.guest) return;
          let changed = false;
          const messages = get().messages.map((message) => {
            if (message.chatId === chatId && message.authorId !== session.userId && message.state === "delivered") {
              changed = true;
              return { ...message, state: "read" as const };
            }
            return message;
          });
          const unread = get().chats.some((chat) => chat.id === chatId && chat.forcedUnread);
          if (changed || unread) {
            set((state) => ({
              messages: changed ? messages : state.messages,
              chats: state.chats.map((chat) => (chat.id === chatId ? { ...chat, forcedUnread: false } : chat)),
            }));
          }
        },

        openDirect(userId) {
          const session = get().session;
          if (!session || session.guest) return fail("NOT_AUTHORIZED");
          const other = userById(get().users, userId);
          if (!other) return fail("CONTACT_UNKNOWN");
          const existing = get().chats.find(
            (chat) =>
              chat.type === "direct" &&
              !chat.saved &&
              !chat.secret &&
              chat.memberIds.length === 2 &&
              chat.memberIds.includes(session.userId) &&
              chat.memberIds.includes(userId),
          );
          if (existing) {
            set({ activeChatId: existing.id });
            return { ok: true };
          }
          const chat: Chat = {
            id: uid("c"),
            type: "direct",
            title: other.displayName,
            memberIds: [session.userId, userId],
          };
          set((state) => ({ chats: [...state.chats, chat], activeChatId: chat.id }));
          return { ok: true };
        },

        sendVoice(dataUrl, seconds) {
          return publishMedia({ voice: dataUrl, voiceSec: seconds, text: "" });
        },

        sendSticker(sticker) {
          return publishMedia({ sticker, text: "" });
        },

        sendFile(name) {
          const clean = name.trim();
          if (!clean) return fail("TEXT_REQUIRED");
          return publishMedia({ fileName: clean, text: clean });
        },

        scheduleSend(text, delayMs) {
          const session = get().session;
          if (!session || session.guest) return fail("NOT_AUTHORIZED");
          const checked = checkOutgoing(text);
          if (!checked.ok) return checked;
          const chatId = get().activeChatId;
          const chat = chatId ? get().chats.find((item) => item.id === chatId) : undefined;
          if (!chatId || !chat || chat.blocked) return fail(chat?.blocked ? "BLOCKED" : "CHAT_REQUIRED");
          const message: Message = {
            id: uid("m"),
            chatId,
            authorId: session.userId,
            text: text.trim(),
            state: "delivered",
            createdAt: new Date().toISOString(),
            scheduledFor: new Date(Date.now() + delayMs).toISOString(),
            reactions: [],
          };
          set((state) => ({ messages: pushMessage(state.messages, message) }));
          return { ok: true };
        },

        createChannel(title) {
          const session = get().session;
          if (!session || session.guest) return fail("NOT_AUTHORIZED");
          const next = title.trim();
          if (next.length < 1 || next.length > 40) return fail("DISPLAY_NAME");
          const chat: Chat = {
            id: uid("c"),
            type: "channel",
            title: next,
            memberIds: [session.userId],
            adminId: session.userId,
          };
          const service: Message = {
            id: uid("m"),
            chatId: chat.id,
            authorId: session.userId,
            text: "Канал создан",
            state: "read",
            createdAt: new Date().toISOString(),
            reactions: [],
            service: true,
          };
          set((state) => ({ chats: [...state.chats, chat], messages: pushMessage(state.messages, service), activeChatId: chat.id }));
          return { ok: true };
        },

        openSecret(userId) {
          const session = get().session;
          if (!session || session.guest) return fail("NOT_AUTHORIZED");
          const other = userById(get().users, userId);
          if (!other || other.id === "u_bot") return fail("CONTACT_UNKNOWN");
          const existing = get().chats.find(
            (chat) =>
              chat.secret &&
              chat.memberIds.length === 2 &&
              chat.memberIds.includes(session.userId) &&
              chat.memberIds.includes(userId),
          );
          if (existing) {
            set({ activeChatId: existing.id });
            return { ok: true };
          }
          const chat: Chat = {
            id: uid("c"),
            type: "direct",
            title: other.displayName,
            memberIds: [session.userId, userId],
            secret: true,
          };
          set((state) => ({ chats: [...state.chats, chat], activeChatId: chat.id }));
          return { ok: true };
        },

        postStory(text) {
          const session = get().session;
          if (!session || session.guest) return fail("NOT_AUTHORIZED");
          const body = text.trim();
          if (body.length < 1 || body.length > 140) return fail("TEXT_REQUIRED", "text");
          const story: Story = {
            id: uid("s"),
            authorId: session.userId,
            text: body,
            tone: "rose",
            createdAt: new Date().toISOString(),
            seenBy: [session.userId],
          };
          set((state) => ({ stories: [...(state.stories ?? []), story] }));
          return { ok: true };
        },

        ensureStories() {
          const have = new Set((get().stories ?? []).map((story) => story.id));
          const missing = [
            {
              id: "s_art_1",
              authorId: "u_art",
              text: "После пар сижу в кофейне на углу. Кто мимо — заходите.",
              tone: "lab",
              createdAt: new Date().toISOString(),
              seenBy: [] as string[],
            },
            {
              id: "s_art_2",
              authorId: "u_art",
              text: "Дождь. Если кто на остановке, напишите, подхвачу.",
              tone: "night",
              createdAt: new Date(Date.now() + 1000).toISOString(),
              seenBy: [] as string[],
            },
            {
              id: "s_rom_1",
              authorId: "u_roman",
              text: "Завтра консультация в 16:00, кабинет 214. Без записи.",
              tone: "paper",
              createdAt: new Date().toISOString(),
              seenBy: [] as string[],
            },
          ].filter((story) => !have.has(story.id));
          if (missing.length === 0) return;
          set((state) => ({ stories: [...(state.stories ?? []), ...missing] }));
        },

        seeStory(storyId) {
          const session = get().session;
          if (!session) return;
          set((state) => ({
            stories: (state.stories ?? []).map((story) =>
              story.id === storyId && !story.seenBy.includes(session.userId)
                ? { ...story, seenBy: [...story.seenBy, session.userId] }
                : story,
            ),
          }));
        },

        sweep() {
          const now = Date.now();
          const messages = get().messages.filter((message) => !message.expiresAt || Date.parse(message.expiresAt) > now);
          if (messages.length !== get().messages.length) set({ messages });
        },

        ensureBot() {
          const session = get().session;
          if (!session || session.guest) return;
          if (!get().users.some((user) => user.id === "u_bot")) {
            const bot: User = {
              id: "u_bot",
              username: "rosema_bot",
              password: "bot",
              displayName: "Rosema",
              about: "Локальный бот. Команды: /help",
              theme: "dark",
              role: "user",
              createdAt: new Date().toISOString(),
            };
            set((state) => ({ users: [...state.users, bot] }));
          }
          const exists = get().chats.some(
            (chat) => chat.type === "direct" && !chat.secret && chat.memberIds.includes(session.userId) && chat.memberIds.includes("u_bot"),
          );
          if (!exists) {
            const chat: Chat = {
              id: uid("c"),
              type: "direct",
              title: "Rosema",
              memberIds: [session.userId, "u_bot"],
            };
            set((state) => ({ chats: [...state.chats, chat] }));
          }
        },
      };
    },
    {
      name: "rosema.client.v2",
      skipHydration: true,
      storage: createJSONStorage(() =>
        typeof window === "undefined"
          ? { getItem: () => null, setItem: () => undefined, removeItem: () => undefined }
          : localStorage,
      ),
      partialize: (state) => ({
        users: state.users,
        chats: state.chats,
        messages: state.messages,
        contacts: state.contacts,
        stories: state.stories,
        session: state.session,
        activeChatId: state.activeChatId,
        simulateFailure: state.simulateFailure,
        drafts: state.drafts,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        if (!Array.isArray(state.messages)) state.messages = [];
        if (!Array.isArray(state.chats)) state.chats = [];
        if (!Array.isArray(state.users)) state.users = [];
        if (!state.contacts || typeof state.contacts !== "object") state.contacts = {};
        if (!state.drafts || typeof state.drafts !== "object") state.drafts = {};
        if (!Array.isArray(state.stories)) state.stories = [];
        state.chats = state.chats.filter(Boolean).map((chat) => ({
          ...chat,
          memberIds: Array.isArray(chat.memberIds) ? chat.memberIds : [],
        }));
        state.stories = state.stories.filter(Boolean).map((story) => ({
          ...story,
          text: story.text ?? "",
          seenBy: Array.isArray(story.seenBy) ? story.seenBy : [],
        }));
        state.messages = state.messages.filter(Boolean).map((message) => ({
          ...message,
          reactions: Array.isArray(message.reactions) ? message.reactions : [],
          state: message.state === "sending" ? "network_error" : message.state,
        }));
        const demoChats = new Set(["c_group", "c_art", "c_roman", "c_channel"]);
        const stale = state.messages.some((message) =>
          /reactions\.js|диаграмм|учебн|JSON|дневник|модул дня|сыпет/i.test(message.text || ""),
        );
        if (stale) {
          const fresh = createSeed();
          state.messages = [...state.messages.filter((message) => !demoChats.has(message.chatId)), ...fresh.messages];
          state.chats = state.chats.map((chat) => {
            const next = fresh.chats.find((item) => item.id === chat.id);
            return next ? { ...chat, title: next.title } : chat;
          });
          state.users = state.users.map((user) => {
            const next = fresh.users.find((item) => item.id === user.id);
            return next ? { ...user, about: next.about } : user;
          });
        }
        const storyFix: Record<string, string> = {
          s_art_1: "После пар сижу в кофейне на углу. Кто мимо — заходите.",
          s_art_2: "Дождь. Если кто на остановке, напишите, подхвачу.",
          s_rom_1: "Завтра консультация в 16:00, кабинет 214. Без записи.",
        };
        state.stories = state.stories.map((story) => (storyFix[story.id] ? { ...story, text: storyFix[story.id] } : story));
      },
    },
  ),
);

export function resolveTheme(state: Pick<RosemaState, "session" | "users">): ThemeName {
  if (!state.session || state.session.guest) return "dark";
  return state.users.find((user) => user.id === state.session?.userId)?.theme ?? "dark";
}
