/**
 * Правила регистрации и состояние сообщения.
 * Отправка → доставлено / ошибка сети → прочитано / удалено.
 */
import { ABOUT_MAX, DAY_MS } from "./constants.ts";

export type ThemeName = "dark" | "light" | "kittens" | "ocean" | "forest" | "dusk" | "sunset" | "graphite";
export type WallpaperName = "theme" | "none" | "kittens" | "sea" | "night" | "bloom";
export type Role = "user" | "admin";
export type ChatType = "direct" | "group" | "channel";
export type MsgState = "sending" | "delivered" | "network_error" | "read" | "deleted";
export type ReactionType = "like" | "heart" | "fire" | "laugh";
export type FieldName =
  | "username"
  | "password"
  | "passwordConfirm"
  | "displayName"
  | "about"
  | "text"
  | "form";

export type User = {
  id: string;
  username: string;
  password: string;
  displayName: string;
  about: string;
  theme: ThemeName;
  accent?: string;
  wallpaper?: WallpaperName;
  role: Role;
  createdAt: string;
};

export type Session = { userId: string; guest?: boolean };

export type Chat = {
  id: string;
  type: ChatType;
  title: string;
  memberIds: string[];
  adminId?: string;
  saved?: boolean;
  pinned?: boolean;
  muted?: boolean;
  archived?: boolean;
  forcedUnread?: boolean;
  blocked?: boolean;
  pinnedMessageId?: string;
  secret?: boolean;
};

export type Reaction = { userId: string; type: ReactionType };
export type Poll = { question: string; options: { text: string; voterIds: string[] }[] };

export type Story = {
  id: string;
  authorId: string;
  text: string;
  createdAt: string;
  seenBy: string[];
  tone?: string;
};

export type Message = {
  id: string;
  chatId: string;
  authorId: string;
  text: string;
  state: MsgState;
  createdAt: string;
  reactions: Reaction[];
  replyToId?: string;
  edited?: boolean;
  image?: string;
  poll?: Poll;
  voice?: string;
  voiceSec?: number;
  sticker?: string;
  fileName?: string;
  forwardedFrom?: string;
  service?: boolean;
  scheduledFor?: string;
  expiresAt?: string;
};

export type Result =
  | { ok: true; username?: string }
  | { ok: false; error: string; field: FieldName };

const ERRORS: Record<string, { error: string; field: FieldName }> = {
  USERNAME_FORMAT: { error: "Имя: латиница, с буквы, 4–20 символов.", field: "username" },
  USERNAME_TAKEN: { error: "Это имя уже занято.", field: "username" },
  PASSWORD_FORMAT: { error: "Пароль: 8–20 символов, буква и цифра.", field: "password" },
  PASSWORD_MISMATCH: { error: "Пароли не совпадают.", field: "passwordConfirm" },
  USER_NOT_FOUND: { error: "Такой учётной записи нет.", field: "username" },
  BAD_PASSWORD: { error: "Неверный пароль.", field: "password" },
  NOT_AUTHORIZED: { error: "Нужно войти.", field: "form" },
  GUEST_LIMIT: { error: "Гостю это недоступно.", field: "form" },
  CHAT_REQUIRED: { error: "Чат не найден.", field: "form" },
  BLOCKED: { error: "Чат заблокирован.", field: "form" },
  CHANNEL_READONLY: { error: "В канал пишет только автор.", field: "form" },
  TEXT_REQUIRED: { error: "Введите текст.", field: "text" },
  TEXT_TOO_LONG: { error: "Слишком длинное сообщение.", field: "text" },
  EDIT_DENIED: { error: "Это сообщение нельзя изменить.", field: "form" },
  RETRY_DENIED: { error: "Повторить можно только ошибку сети.", field: "form" },
  DELETE_DENIED: { error: "Удалить нельзя.", field: "form" },
  REACTION_EARLY: { error: "Реакция доступна после доставки.", field: "form" },
  DISPLAY_NAME: { error: "Название: от 1 до 40 символов.", field: "displayName" },
  ABOUT_LONG: { error: "О себе слишком длинное.", field: "about" },
  CONTACT_REQUIRED: { error: "Укажите имя пользователя.", field: "username" },
  CONTACT_UNKNOWN: { error: "Такого пользователя нет.", field: "username" },
  CONTACT_SELF: { error: "Себя добавить нельзя.", field: "username" },
  CONTACT_EXISTS: { error: "Уже в контактах.", field: "username" },
};

export function fail(code: string, field?: FieldName): Result {
  const known = ERRORS[code];
  return { ok: false, error: known?.error ?? code, field: field ?? known?.field ?? "form" };
}

const USERNAME_RE = /^[A-Za-z][A-Za-z0-9_]{3,19}$/;

/** Проверяет регистрацию: формат имени, пароль, повтор и занятость. */
export function checkRegistration(
  input: { username: string; password: string; passwordConfirm: string },
  taken: Set<string>,
): Result {
  const username = input.username.trim();
  if (!USERNAME_RE.test(username)) return fail("USERNAME_FORMAT");
  if (taken.has(username.toLowerCase())) return fail("USERNAME_TAKEN");
  if (input.password.length < 8 || input.password.length > 20 || !/[A-Za-z]/.test(input.password) || !/\d/.test(input.password)) {
    return fail("PASSWORD_FORMAT");
  }
  if (input.password !== input.passwordConfirm) return fail("PASSWORD_MISMATCH");
  return { ok: true, username };
}

export function checkProfile(displayName: string, about: string): Result {
  const name = displayName.trim();
  if (name.length < 1 || name.length > 40) return fail("DISPLAY_NAME");
  if (about.trim().length > ABOUT_MAX) return fail("ABOUT_LONG");
  return { ok: true };
}

/** Пустое и слишком длинное сообщение не уходит в чат. */
export function checkOutgoing(text: string): Result {
  if (typeof text !== "string" || text.trim() === "") return fail("TEXT_REQUIRED", "text");
  if (text.length > MAX_TEXT) return fail("TEXT_TOO_LONG", "text");
  return { ok: true };
}

export function peopleCount(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  const word =
    mod10 === 1 && mod100 !== 11 ? "участник" : mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14) ? "участника" : "участников";
  return `${count} ${word}`;
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const raw = parts.length >= 2 ? `${parts[0][0]}${parts[1][0]}` : name.trim().slice(0, 2);
  return raw.toLocaleUpperCase("ru-RU");
}

export function chatTitle(chat: Chat, users: User[], myId: string): string {
  if (chat.saved) return "Избранное";
  if (chat.type !== "direct") return chat.title;
  const otherId = chat.memberIds.find((id) => id !== myId);
  return users.find((user) => user.id === otherId)?.displayName || chat.title;
}

export function lastMessage(messages: Message[], chatId: string): Message | undefined {
  let best: Message | undefined;
  for (const message of messages) {
    if (message.chatId !== chatId || message.service) continue;
    if (!best || message.createdAt > best.createdAt) best = message;
  }
  return best;
}

export function previewText(message: Message | undefined): string {
  if (!message) return "Нет сообщений";
  if (message.state === "deleted") return "Сообщение удалено";
  if (message.poll) return `Опрос: ${message.poll.question}`;
  if (message.sticker) return `${message.sticker} стикер`;
  if (message.voice) return "Голосовое сообщение";
  if (message.image) return message.text.trim() || "Фото";
  if (message.fileName) return message.fileName;
  return message.text.replace(/\s+/g, " ").trim() || "Сообщение";
}

export function unreadCount(messages: Message[], chatId: string, myId: string): number {
  return messages.filter((message) => message.chatId === chatId && message.authorId !== myId && message.state === "delivered").length;
}

export function visibleChats(chats: Chat[], session: Session): Chat[] {
  if (session.guest) return chats.filter((chat) => chat.type === "channel");
  return chats.filter((chat) => chat.memberIds.includes(session.userId) || chat.type === "channel");
}

export function sortChats(chats: Chat[], messages: Message[]): Chat[] {
  return [...chats].sort((a, b) => {
    if (Boolean(a.pinned) !== Boolean(b.pinned)) return a.pinned ? -1 : 1;
    const left = lastMessage(messages, a.id)?.createdAt ?? "";
    const right = lastMessage(messages, b.id)?.createdAt ?? "";
    return right.localeCompare(left);
  });
}

const AVATAR_COLORS = ["#c4544a", "#3f8f62", "#4ea2e0", "#8b6cc4", "#e07a45", "#c46b8a", "#5c8f8a"];

export function avatarColor(name: string): string {
  let hash = 0;
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

export function clock(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
}

export function dayKey(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("sv-SE");
}

export function dayLabel(iso: string): string {
  const key = dayKey(iso);
  const today = dayKey(new Date().toISOString());
  const yesterday = dayKey(new Date(Date.now() - DAY_MS).toISOString());
  if (key === today) return "Сегодня";
  if (key === yesterday) return "Вчера";
  return new Date(iso).toLocaleDateString("ru-RU", { day: "numeric", month: "long" });
}

export function listStamp(iso: string): string {
  if (!iso) return "";
  const key = dayKey(iso);
  if (key === dayKey(new Date().toISOString())) return clock(iso);
  return new Date(iso).toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
}

export function textParts(text: string): { value: string; href?: string }[] {
  const parts: { value: string; href?: string }[] = [];
  const pattern = /https?:\/\/[^\s]+/g;
  let last = 0;
  for (const match of text.matchAll(pattern)) {
    const index = match.index ?? 0;
    if (index > last) parts.push({ value: text.slice(last, index) });
    parts.push({ value: match[0], href: match[0] });
    last = index + match[0].length;
  }
  if (last < text.length) parts.push({ value: text.slice(last) });
  if (parts.length === 0) parts.push({ value: text });
  return parts;
}

export function threadMessages(messages: Message[], chatId: string): Message[] {
  return messages.filter((message) => message.chatId === chatId).sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
}

export function userById(users: User[], id: string | undefined): User | undefined {
  return users.find((user) => user.id === id);
}

export function replyLine(username: string, text: string, group: boolean): string {
  if (username === "roman_v" && group) return "Зафиксируйте это после пары.";
  if (text.trim().endsWith("?")) return "Отвечу, когда освобожусь.";
  return "Принято.";
}

const ANCHOR = Date.parse("2026-10-09T13:30:00Z");

function ago(minutes: number): string {
  return new Date(ANCHOR - minutes * 60_000).toISOString();
}

export const CHANNEL_ID = "c_channel";
export const MAX_TEXT = 4000;

/** Стартовые пользователи, чаты и переписка для локального клиента. */
export function createSeed(): {
  users: User[];
  chats: Chat[];
  messages: Message[];
  contacts: Record<string, string[]>;
} {
  const users: User[] = [
    {
      id: "u_rose",
      username: "rose_01",
      password: "Pass1234",
      displayName: "Роза Егорова",
      about: "На связи не всегда.",
      theme: "dark",
      role: "user",
      createdAt: ago(20_000),
    },
    {
      id: "u_art",
      username: "artyukhin",
      password: "Pass1234",
      displayName: "Артюхин",
      about: "Обычно отвечаю вечером.",
      theme: "dark",
      role: "user",
      createdAt: ago(20_000),
    },
    {
      id: "u_roman",
      username: "roman_v",
      password: "Pass1234",
      displayName: "Роман Владимирович",
      about: "Пишите коротко и по делу.",
      theme: "light",
      role: "admin",
      createdAt: ago(20_000),
    },
  ];

  const chats: Chat[] = [
    { id: "c_group", type: "group", title: "Одногруппники", memberIds: ["u_rose", "u_art", "u_roman"], adminId: "u_roman" },
    { id: "c_art", type: "direct", title: "Артюхин", memberIds: ["u_rose", "u_art"] },
    { id: "c_roman", type: "direct", title: "Роман Владимирович", memberIds: ["u_rose", "u_roman"] },
    { id: "c_saved", type: "direct", title: "Избранное", memberIds: ["u_rose"], saved: true },
    { id: CHANNEL_ID, type: "channel", title: "Rosema", memberIds: ["u_rose"], adminId: "u_rose" },
  ];

  const messages: Message[] = [
    { id: "m1", chatId: "c_group", authorId: "u_art", text: "Кто сегодня в 302? Я ключ от кабинета не взял.", state: "read", createdAt: ago(260), reactions: [] },
    { id: "m2", chatId: "c_group", authorId: "u_rose", text: "Я уже внутри, дверь открыта.", state: "read", createdAt: ago(250), reactions: [] },
    { id: "m3", chatId: "c_group", authorId: "u_roman", text: "Начинаем вовремя. И не кладите телефоны на первую парту, мешают.", state: "read", createdAt: ago(200), reactions: [{ userId: "u_art", type: "like" }] },
    { id: "m4", chatId: "c_group", authorId: "u_art", text: "Конспект допишу вечером, на паре связь пропадала.", state: "delivered", createdAt: ago(35), reactions: [] },
    { id: "m5", chatId: "c_group", authorId: "u_rose", text: "Я тоже дома допишу. Скину в общий, если нормально получится.", state: "delivered", createdAt: ago(12), reactions: [] },
    { id: "m6", chatId: "c_art", authorId: "u_art", text: "Ты ещё в колледже?", state: "read", createdAt: ago(95), reactions: [] },
    { id: "m7", chatId: "c_art", authorId: "u_rose", text: "Уже вышла, стою на остановке.", state: "read", createdAt: ago(80), reactions: [] },
    { id: "m8", chatId: "c_art", authorId: "u_art", text: "Подожди у второй двери. Куплю кофе и подойду, минут пять.", state: "read", createdAt: ago(70), reactions: [{ userId: "u_rose", type: "like" }] },
    { id: "m9", chatId: "c_roman", authorId: "u_roman", text: "Роза, по заявлению: оригинал принесите до пятницы, кабинет 214.", state: "read", createdAt: ago(3200), reactions: [] },
    { id: "m10", chatId: "c_roman", authorId: "u_rose", text: "Хорошо, зайду после второй.", state: "read", createdAt: ago(3100), reactions: [] },
    { id: "m11", chatId: "c_roman", authorId: "u_roman", text: "И подпись куратора. Без неё не приму.", state: "delivered", createdAt: ago(180), reactions: [] },
    { id: "m12", chatId: CHANNEL_ID, authorId: "u_rose", text: "Если сообщение зависло, подождите и отправьте ещё раз. Оно не пропадает.", state: "read", createdAt: ago(6000), reactions: [] },
    { id: "m13", chatId: CHANNEL_ID, authorId: "u_rose", text: "Пишите коротко. Длинные простыни здесь никто не дочитывает.", state: "read", createdAt: ago(900), reactions: [] },
  ];

  return {
    users,
    chats,
    messages,
    contacts: { u_rose: ["u_art", "u_roman"], u_art: ["u_rose"], u_roman: ["u_rose", "u_art"] },
  };
}

export const DEMO_ACCOUNTS = [
  { username: "rose_01", password: "Pass1234", label: "Роза" },
  { username: "artyukhin", password: "Pass1234", label: "Артюхин" },
  { username: "roman_v", password: "Pass1234", label: "Роман В." },
] as const;
