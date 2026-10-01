import assert from "node:assert/strict";
import test from "node:test";
import { checkOutgoing, checkRegistration, peopleCount, previewText } from "./logic.ts";

test("регистрация принимает корректные данные", () => {
  const result = checkRegistration({ username: "rose_02", password: "Pass1234", passwordConfirm: "Pass1234" }, new Set());
  assert.equal(result.ok, true);
});

test("короткий пароль отклоняется", () => {
  const result = checkRegistration({ username: "rose_02", password: "short", passwordConfirm: "short" }, new Set());
  assert.equal(result.ok, false);
});

test("пустое сообщение не уходит", () => {
  const result = checkOutgoing("   ");
  assert.equal(result.ok, false);
});

test("склонение участников", () => {
  assert.equal(peopleCount(1), "1 участник");
  assert.equal(peopleCount(2), "2 участника");
  assert.equal(peopleCount(5), "5 участников");
});

test("превью опроса", () => {
  const text = previewText({
    id: "m",
    chatId: "c",
    authorId: "u",
    text: "",
    state: "read",
    createdAt: new Date().toISOString(),
    reactions: [],
    poll: { question: "Идём?", options: [] },
  });
  assert.match(text, /Идём/);
});
