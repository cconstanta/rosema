import { create } from "zustand";
import { persist } from "zustand/middleware";
import { CHATS, MESSAGES, PEOPLE } from "./seed";
import type { CallState, Chat, Message, Person, ThemeId } from "./types";

type State = {
  meId: string | null;
  people: Person[];
  chats: Chat[];
  messages: Message[];
  theme: ThemeId;
  activeChatId: string | null;
  call: CallState;
  enterToSend: boolean;
  setMe: (id: string | null) => void;
  register: (name: string) => void;
  updateMe: (patch: Partial<Person>) => void;
  setTheme: (theme: ThemeId) => void;
  setEnterToSend: (value: boolean) => void;
  openChat: (id: string | null) => void;
  send: (chatId: string, draft: Omit<Message, "id" | "createdAt" | "state" | "reactions" | "authorId"> & { text: string }) => void;
  toggleReaction: (messageId: string, emoji: string) => void;
  editMessage: (messageId: string, text: string) => void;
  removeMessage: (messageId: string) => void;
  createGroup: (title: string, memberIds: string[]) => void;
  startCall: (peerId: string) => void;
  answerCall: () => void;
  hangup: () => void;
  toggleMute: () => void;
};

function id(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

export const useRosema = create<State>()(
  persist(
    (set, get) => ({
      meId: null,
      people: PEOPLE,
      chats: CHATS,
      messages: MESSAGES,
      theme: "ink",
      activeChatId: null,
      call: null,
      enterToSend: true,
      setMe: (meId) => set({ meId, activeChatId: null }),
      register: (name) => {
        const person: Person = {
          id: id("u"),
          name: name.trim(),
          handle: name.trim().toLowerCase().replace(/\s+/g, "_").slice(0, 16),
          about: "Новый профиль Rosemа",
          status: "только что здесь",
          hue: "#c45c4a",
        };
        const saved: Chat = {
          id: id("c"),
          title: "Избранное",
          kind: "saved",
          memberIds: [person.id],
          pinned: false,
        };
        set({
          people: [...get().people, person],
          chats: [saved, ...get().chats],
          meId: person.id,
        });
      },
      updateMe: (patch) => {
        const meId = get().meId;
        if (!meId) return;
        set({
          people: get().people.map((p) => (p.id === meId ? { ...p, ...patch, id: meId } : p)),
        });
      },
      setTheme: (theme) => set({ theme }),
      setEnterToSend: (enterToSend) => set({ enterToSend }),
      openChat: (activeChatId) => {
        const meId = get().meId;
        set({
          activeChatId,
          messages: get().messages.map((m) =>
            m.chatId === activeChatId && m.authorId !== meId ? { ...m, state: "read" } : m,
          ),
        });
      },
      send: (chatId, draft) => {
        const meId = get().meId;
        if (!meId) return;
        const message: Message = {
          id: id("m"),
          chatId,
          authorId: meId,
          text: draft.text,
          kind: draft.kind,
          media: draft.media,
          duration: draft.duration,
          replyTo: draft.replyTo,
          reactions: {},
          state: "sending",
          createdAt: Date.now(),
        };
        set({ messages: [...get().messages, message] });
        window.setTimeout(() => {
          set({
            messages: get().messages.map((m) =>
              m.id === message.id ? { ...m, state: "delivered" } : m,
            ),
          });
        }, 420);
      },
      toggleReaction: (messageId, emoji) => {
        const meId = get().meId;
        if (!meId) return;
        const key = emoji.trim();
        if (!key) return;
        set({
          messages: get().messages.map((m) => {
            if (m.id !== messageId) return m;
            const current = m.reactions[key] ?? [];
            const next = current.includes(meId) ? current.filter((x) => x !== meId) : [...current, meId];
            const reactions = { ...m.reactions, [key]: next };
            if (!next.length) delete reactions[key];
            return { ...m, reactions };
          }),
        });
      },
      editMessage: (messageId, text) =>
        set({
          messages: get().messages.map((m) =>
            m.id === messageId ? { ...m, text, edited: true } : m,
          ),
        }),
      removeMessage: (messageId) =>
        set({ messages: get().messages.filter((m) => m.id !== messageId) }),
      createGroup: (title, memberIds) => {
        const meId = get().meId;
        if (!meId || !title.trim()) return;
        const chat: Chat = {
          id: id("c"),
          title: title.trim(),
          kind: "group",
          memberIds: Array.from(new Set([meId, ...memberIds])),
          pinned: false,
        };
        set({ chats: [chat, ...get().chats], activeChatId: chat.id });
      },
      startCall: (peerId) =>
        set({ call: { peerId, phase: "ringing", startedAt: Date.now(), muted: false } }),
      answerCall: () => {
        const call = get().call;
        if (!call) return;
        set({ call: { ...call, phase: "live", startedAt: Date.now() } });
      },
      hangup: () => set({ call: null }),
      toggleMute: () => {
        const call = get().call;
        if (!call) return;
        set({ call: { ...call, muted: !call.muted } });
      },
    }),
    {
      name: "rosema-web",
      skipHydration: true,
      partialize: (s) => ({
        meId: s.meId,
        people: s.people,
        chats: s.chats,
        messages: s.messages.map((m) =>
          m.media && m.media.length > 400_000 ? { ...m, media: undefined, text: m.text || "вложение" } : m,
        ),
        theme: s.theme,
        enterToSend: s.enterToSend,
      }),
    },
  ),
);
