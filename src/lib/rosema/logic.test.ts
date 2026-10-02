import assert from "node:assert/strict";
import test from "node:test";
import {
  MAX_TEXT,
  chatTitle,
  checkOutgoing,
  checkProfile,
  checkRegistration,
  createSeed,
  dayKey,
  fail,
  initials,
  peopleCount,
  previewText,
  textParts,
  threadMessages,
  unreadCount,
  userById,
  visibleChats,
} from "./logic.ts";

const sample = {
  id: "m",
  chatId: "c",
  authorId: "u",
  text: "",
  state: "read" as const,
  createdAt: "2026-10-09T12:00:00.000Z",
  reactions: [],
};

test("регистрация принимает корректные данные", () => {
  const result = checkRegistration({ username: "rose_02", password: "Pass1234", passwordConfirm: "Pass1234" }, new Set());
  assert.equal(result.ok, true);
});

test("короткий пароль отклоняется", () => {
  const result = checkRegistration({ username: "rose_02", password: "short", passwordConfirm: "short" }, new Set());
  assert.equal(result.ok, false);
});

test("занятое имя отклоняется", () => {
  const result = checkRegistration({ username: "Rose_02", password: "Pass1234", passwordConfirm: "Pass1234" }, new Set(["rose_02"]));
  assert.equal(result.ok, false);
});

test("пароли должны совпадать", () => {
  const result = checkRegistration({ username: "rose_02", password: "Pass1234", passwordConfirm: "Pass1235" }, new Set());
  assert.equal(result.ok, false);
});

test("имя с цифры не принимается", () => {
  const result = checkRegistration({ username: "1rose", password: "Pass1234", passwordConfirm: "Pass1234" }, new Set());
  assert.equal(result.ok, false);
});

test("пустое сообщение не уходит", () => {
  assert.equal(checkOutgoing("   ").ok, false);
});

test("слишком длинное сообщение не уходит", () => {
  assert.equal(checkOutgoing("а".repeat(MAX_TEXT + 1)).ok, false);
});

test("профиль: пустое имя и длинное о себе", () => {
  assert.equal(checkProfile("  ", "").ok, false);
  assert.equal(checkProfile("Роза", "я".repeat(161)).ok, false);
  assert.equal(checkProfile("Роза", "на связи").ok, true);
});

test("склонение участников", () => {
  assert.equal(peopleCount(1), "1 участник");
  assert.equal(peopleCount(2), "2 участника");
  assert.equal(peopleCount(5), "5 участников");
  assert.equal(peopleCount(11), "11 участников");
});

test("превью опроса, голоса и удаления", () => {
  assert.match(previewText({ ...sample, poll: { question: "Идём?", options: [] } }), /Идём/);
  assert.match(previewText({ ...sample, voice: "x", voiceSec: 3 }), /Голосовое/);
  assert.equal(previewText({ ...sample, state: "deleted", text: "секрет" }), "Сообщение удалено");
  assert.equal(previewText(undefined), "Нет сообщений");
});

test("инициалы и заголовок личного чата", () => {
  assert.equal(initials("Роза Егорова"), "РЕ");
  const seed = createSeed();
  const direct = seed.chats.find((chat) => chat.id === "c_art");
  assert.ok(direct);
  assert.equal(chatTitle(direct, seed.users, "u_rose"), "Артюхин");
  assert.equal(userById(seed.users, "u_roman")?.username, "roman_v");
});

test("непрочитанные и гостевая видимость", () => {
  const seed = createSeed();
  assert.equal(unreadCount(seed.messages, "c_roman", "u_rose") > 0, true);
  const guest = visibleChats(seed.chats, { userId: "guest", guest: true });
  assert.equal(guest.every((chat) => chat.type === "channel"), true);
});

test("лента по времени и ссылки в тексте", () => {
  const seed = createSeed();
  const thread = threadMessages(seed.messages, "c_group");
  assert.ok(thread[0].createdAt <= thread[thread.length - 1].createdAt);
  const parts = textParts("смотри https://example.com/a конец");
  assert.equal(parts.some((part) => part.href === "https://example.com/a"), true);
  assert.ok(dayKey("2026-10-09T12:00:00.000Z").startsWith("2026"));
});

test("неизвестная ошибка не теряет код", () => {
  const result = fail("NO_SUCH");
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.error, "NO_SUCH");
});
