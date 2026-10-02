import type { Chat, Message, Person } from "./types";

export const PEOPLE: Person[] = [
  {
    id: "u_kostya",
    name: "Костя Кононов",
    handle: "kostya",
    about: "ИСП-43. Делаю Rosemа.",
    status: "на связи",
    hue: "#c45c4a",
  },
  {
    id: "u_anton",
    name: "Антон Артюхин",
    handle: "anton",
    about: "Пара по практике.",
    status: "в колледже",
    hue: "#3d6b4f",
  },
  {
    id: "u_masha",
    name: "Маша Левина",
    handle: "masha",
    about: "Фото и кружки.",
    status: "слушает",
    hue: "#8a5a44",
  },
  {
    id: "u_lev",
    name: "Лев Орлов",
    handle: "lev",
    about: "Группы и звонки.",
    status: "не беспокоить",
    hue: "#4a6278",
  },
];

const hour = 60 * 60 * 1000;
const now = Date.now();

export const CHATS: Chat[] = [
  {
    id: "c_masha",
    title: "Маша Левина",
    kind: "dm",
    memberIds: ["u_kostya", "u_masha"],
    pinned: true,
  },
  {
    id: "c_group",
    title: "ИСП-43",
    kind: "group",
    memberIds: ["u_kostya", "u_anton", "u_masha", "u_lev"],
    pinned: true,
  },
  {
    id: "c_anton",
    title: "Антон Артюхин",
    kind: "dm",
    memberIds: ["u_kostya", "u_anton"],
    pinned: false,
  },
  {
    id: "c_saved",
    title: "Избранное",
    kind: "saved",
    memberIds: ["u_kostya"],
    pinned: false,
  },
];

export const MESSAGES: Message[] = [
  {
    id: "m1",
    chatId: "c_masha",
    authorId: "u_masha",
    text: "Скинь макет Rosemа, когда будет тёмная тема.",
    kind: "text",
    reactions: { "❤️": ["u_kostya"] },
    state: "read",
    createdAt: now - 5 * hour,
  },
  {
    id: "m2",
    chatId: "c_masha",
    authorId: "u_kostya",
    text: "Уже четыре темы: чернила, день, роза и лес.",
    kind: "text",
    replyTo: "m1",
    reactions: {},
    state: "read",
    createdAt: now - 4 * hour,
  },
  {
    id: "m3",
    chatId: "c_group",
    authorId: "u_anton",
    text: "Кто закрывает день по тестам?",
    kind: "text",
    reactions: { "👍": ["u_kostya", "u_lev"] },
    state: "read",
    createdAt: now - 2 * hour,
  },
  {
    id: "m4",
    chatId: "c_group",
    authorId: "u_lev",
    text: "Я на звонке после пар.",
    kind: "text",
    reactions: {},
    state: "delivered",
    createdAt: now - hour,
  },
  {
    id: "m5",
    chatId: "c_anton",
    authorId: "u_anton",
    text: "Репозиторий запушен, ветка master.",
    kind: "text",
    reactions: {},
    state: "read",
    createdAt: now - 30 * 60 * 1000,
  },
  {
    id: "m6",
    chatId: "c_saved",
    authorId: "u_kostya",
    text: "Идеи: реакции, кружки, голос, темы, группы.",
    kind: "text",
    reactions: {},
    state: "read",
    createdAt: now - 20 * 60 * 1000,
  },
];
