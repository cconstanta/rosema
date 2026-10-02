import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  ArrowLeft,
  Check,
  CheckCheck,
  ImagePlus,
  Mic,
  Phone,
  PhoneOff,
  Pencil,
  Pin,
  Plus,
  Search,
  Send,
  Settings,
  Smile,
  Square,
  Trash2,
  Users,
  Video,
  X,
} from "lucide-react";
import { ALL_EMOJI, EMOJI_GROUPS, QUICK_EMOJI } from "./emojis";
import { useRosema } from "./store";
import type { Chat, Message, Person, ThemeId } from "./types";

const THEMES: { id: ThemeId; label: string }[] = [
  { id: "ink", label: "Ночь" },
  { id: "day", label: "День" },
  { id: "rose", label: "Роза" },
  { id: "forest", label: "Лес" },
];

const STICKERS = ["🌹", "🔥", "✨", "🌿", "🎉", "💬"];

const LEGACY_REACTION: Record<string, string> = {
  heart: "❤️",
  flame: "🔥",
  check: "👍",
  laugh: "😂",
};

function reactionChips(reactions: Message["reactions"]) {
  const map = new Map<string, number>();
  for (const [key, ids] of Object.entries(reactions)) {
    if (!ids?.length) continue;
    const emoji = LEGACY_REACTION[key] ?? key;
    map.set(emoji, (map.get(emoji) ?? 0) + ids.length);
  }
  return [...map.entries()];
}

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function timeLabel(ts: number) {
  return new Date(ts).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
}

function personOf(people: Person[], id: string) {
  return people.find((p) => p.id === id);
}

function chatTitle(chat: Chat, people: Person[], meId: string) {
  if (chat.kind !== "dm") return chat.title;
  const other = chat.memberIds.find((id) => id !== meId);
  return personOf(people, other ?? "")?.name ?? chat.title;
}

export function RosemaApp() {
  const theme = useRosema((s) => s.theme);
  const meId = useRosema((s) => s.meId);

  useEffect(() => {
    try {
      void useRosema.persist.rehydrate();
    } catch {
      /* оставляем вход, если сохранение битое */
    }
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  return meId ? <Messenger /> : <Gate />;
}

function Gate() {
  const people = useRosema((s) => s.people);
  const setMe = useRosema((s) => s.setMe);
  const register = useRosema((s) => s.register);
  const [name, setName] = useState("");

  return (
    <main className="grid min-h-dvh bg-bg text-fg lg:grid-cols-2">
      <section className="flex flex-col justify-between px-8 py-10 sm:px-14">
        <p className="font-display text-4xl tracking-tight">Rosema</p>
        <div className="max-w-md">
          <h1 className="font-display text-5xl leading-none">Переписка без лишнего шума.</h1>
          <p className="mt-4 text-lg leading-relaxed text-muted">
            Чаты, группы, реакции, голос, кружки и четыре темы. Всё остаётся в этом браузере.
          </p>
        </div>
        <p className="text-sm text-muted">ИСП-43 · Кононов и Артюхин</p>
      </section>
      <section className="flex items-center bg-surface px-6 py-10 sm:px-12">
        <div className="w-full max-w-md space-y-3">
          <h2 className="text-sm font-medium uppercase tracking-widest text-muted">Войти как</h2>
          {people.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setMe(p.id)}
              className="tap flex w-full items-center gap-3 rounded-2xl border border-line bg-raised px-4 py-3 text-left"
            >
              <Avatar person={p} />
              <span>
                <span className="block font-medium">{p.name}</span>
                <span className="block text-sm text-muted">@{p.handle}</span>
              </span>
            </button>
          ))}
          <form
            className="flex min-w-0 flex-col gap-2 pt-4 sm:flex-row"
            onSubmit={(e) => {
              e.preventDefault();
              if (name.trim().length >= 2) register(name);
            }}
          >
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Новое имя"
              className="min-h-11 flex-1 rounded-2xl border border-line bg-bg px-4 outline-none"
            />
            <button type="submit" className="min-h-11 rounded-2xl bg-accent px-4 font-medium text-accent-fg">
              Создать
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}

function Avatar({ person, size = "md" }: { person?: Person; size?: "md" | "lg" }) {
  const box = size === "lg" ? "h-16 w-16 text-xl" : "h-11 w-11 text-sm";
  return (
    <span
      className={`grid shrink-0 place-items-center rounded-full font-medium text-accent-fg ${box}`}
      style={{ background: person?.hue ?? "var(--r-accent)" }}
    >
      {(person?.name ?? "?").slice(0, 1)}
    </span>
  );
}

function Messenger() {
  const people = useRosema((s) => s.people);
  const chats = useRosema((s) => s.chats);
  const messages = useRosema((s) => s.messages);
  const meId = useRosema((s) => s.meId)!;
  const activeChatId = useRosema((s) => s.activeChatId);
  const openChat = useRosema((s) => s.openChat);
  const call = useRosema((s) => s.call);
  const [query, setQuery] = useState("");
  const [panel, setPanel] = useState<"none" | "profile" | "group">("none");

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return [...chats]
      .filter((c) => c.memberIds.includes(meId))
      .filter((c) => !q || chatTitle(c, people, meId).toLowerCase().includes(q))
      .sort((a, b) => Number(b.pinned) - Number(a.pinned));
  }, [chats, meId, people, query]);

  const active = chats.find((c) => c.id === activeChatId) ?? null;

  return (
    <div className="flex h-dvh min-h-0 bg-bg text-fg">
      <aside className={`${active ? "hidden md:flex" : "flex"} w-full min-w-0 flex-col bg-surface md:w-[22.5rem]`}>
        <header className="flex items-center justify-between px-4 pb-1 pt-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Rosema</p>
            <p className="text-[22px] font-semibold leading-tight tracking-tight">Чаты</p>
          </div>
          <div className="flex gap-1">
            <IconButton label="Новая группа" onClick={() => setPanel("group")}>
              <Users className="h-5 w-5" />
            </IconButton>
            <IconButton label="Профиль" onClick={() => setPanel("profile")}>
              <Settings className="h-5 w-5" />
            </IconButton>
          </div>
        </header>
        <div className="px-4 pb-3">
          <label className="flex items-center gap-2 rounded-2xl bg-bg px-3 ring-1 ring-line">
            <Search className="h-4 w-4 text-muted" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Поиск"
              className="min-h-11 w-full bg-transparent outline-none"
            />
          </label>
        </div>
        <ul className="min-h-0 flex-1 overflow-y-auto">
          {visible.map((chat) => {
            const last = [...messages].reverse().find((m) => m.chatId === chat.id);
            const unread = messages.filter(
              (m) => m.chatId === chat.id && m.authorId !== meId && m.state !== "read",
            ).length;
            return (
              <li key={chat.id}>
                <button
                  type="button"
                  onClick={() => openChat(chat.id)}
                  className={`tap mx-2 flex w-[calc(100%-1rem)] items-center gap-3 rounded-2xl px-2.5 py-2.5 text-left ${chat.id === activeChatId ? "bg-raised" : "hover:bg-bg"}`}
                >
                  <Avatar person={chatPeer(chat, people, meId)} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className="flex min-w-0 items-center gap-1">
                        <span className="truncate font-medium">{chatTitle(chat, people, meId)}</span>
                        {chat.pinned ? <Pin className="h-3 w-3 shrink-0 text-muted" /> : null}
                      </span>
                      <span className="shrink-0 text-[11px] text-muted">{last ? timeLabel(last.createdAt) : ""}</span>
                    </span>
                    <span className="mt-0.5 flex items-center justify-between gap-2">
                      <span className="truncate text-sm text-muted">{last ? preview(last) : "Пока пусто"}</span>
                      {unread > 0 ? (
                        <span className="grid h-5 min-w-5 shrink-0 place-items-center rounded-full bg-accent px-1 text-[11px] font-medium text-accent-fg">
                          {unread}
                        </span>
                      ) : null}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </aside>
      <section className={`${active ? "flex" : "hidden md:flex"} min-w-0 flex-1 flex-col bg-thread`}>
        {active ? (
          <Thread chat={active} />
        ) : (
          <div className="grid flex-1 place-items-center bg-thread px-8 text-center">
            <div>
              <p className="text-3xl font-semibold tracking-tight">Выберите беседу</p>
              <p className="mt-2 text-muted">Справа ничего не открыто. Чаты — слева.</p>
            </div>
          </div>
        )}
      </section>
      {panel === "profile" ? <ProfileSheet onClose={() => setPanel("none")} /> : null}
      {panel === "group" ? <GroupSheet onClose={() => setPanel("none")} /> : null}
      {call ? <CallOverlay /> : null}
    </div>
  );
}

function chatPeer(chat: Chat, people: Person[], meId: string) {
  if (chat.kind === "saved") return personOf(people, meId);
  const other = chat.memberIds.find((id) => id !== meId);
  return personOf(people, other ?? chat.memberIds[0] ?? "");
}

function preview(m: Message) {
  if (m.kind === "image") return "Фото";
  if (m.kind === "voice") return "Голосовое";
  if (m.kind === "circle") return "Кружок";
  if (m.kind === "sticker") return m.text;
  return m.text;
}

function Thread({ chat }: { chat: Chat }) {
  const people = useRosema((s) => s.people);
  const messages = useRosema((s) => s.messages);
  const meId = useRosema((s) => s.meId)!;
  const openChat = useRosema((s) => s.openChat);
  const send = useRosema((s) => s.send);
  const toggleReaction = useRosema((s) => s.toggleReaction);
  const removeMessage = useRosema((s) => s.removeMessage);
  const editMessage = useRosema((s) => s.editMessage);
  const enterToSend = useRosema((s) => s.enterToSend);
  const startCall = useRosema((s) => s.startCall);
  const [text, setText] = useState("");
  const [reply, setReply] = useState<Message | null>(null);
  const [editing, setEditing] = useState<Message | null>(null);
  const [stickers, setStickers] = useState(false);
  const [menu, setMenu] = useState<{ id: string; x: number; y: number } | null>(null);
  const [reactFor, setReactFor] = useState<string | null>(null);
  const [popKey, setPopKey] = useState("");
  const [recording, setRecording] = useState(false);
  const [emojiQuery, setEmojiQuery] = useState("");
  const [emojiGroup, setEmojiGroup] = useState(EMOJI_GROUPS[0]?.id ?? "smile");
  const bottom = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const rec = useRef<MediaRecorder | null>(null);

  const thread = messages.filter((m) => m.chatId === chat.id);
  const title = chatTitle(chat, people, meId);
  const peer = chat.kind === "dm" ? chat.memberIds.find((id) => id !== meId) : undefined;

  useEffect(() => {
    setText("");
    setReply(null);
    setEditing(null);
    setMenu(null);
    setReactFor(null);
    bottom.current?.scrollIntoView({ block: "end" });
  }, [chat.id]);

  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "end" });
  }, [thread.length]);

  function openMenu(x: number, y: number, id: string) {
    const width = 276;
    const height = 228;
    setMenu({
      id,
      x: Math.max(8, Math.min(x, window.innerWidth - width)),
      y: Math.max(8, Math.min(y, window.innerHeight - height)),
    });
    setStickers(false);
  }

  function beginEdit(message: Message) {
    setEditing(message);
    setReply(null);
    setMenu(null);
    setStickers(false);
    setText(message.text);
  }

  function submit() {
    const value = text.trim();
    if (!value) return;
    if (editing) {
      editMessage(editing.id, value);
      setEditing(null);
      setText("");
      return;
    }
    send(chat.id, { chatId: chat.id, text: value, kind: "text", replyTo: reply?.id });
    setText("");
    setReply(null);
  }

  async function onFile(file: File) {
    if (file.size > 1_500_000) {
      send(chat.id, { chatId: chat.id, text: "Фото больше 1.5 МБ — не сохранил", kind: "text" });
      return;
    }
    const media = await fileToDataUrl(file);
    send(chat.id, { chatId: chat.id, text: file.name, kind: "image", media });
  }

  async function toggleMic() {
    if (recording && rec.current) {
      rec.current.stop();
      setRecording(false);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const chunks: Blob[] = [];
      const recorder = new MediaRecorder(stream);
      rec.current = recorder;
      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunks, { type: recorder.mimeType });
        send(chat.id, {
          chatId: chat.id,
          text: "Голосовое",
          kind: "voice",
          media: URL.createObjectURL(blob),
          duration: 3,
        });
      };
      recorder.start();
      setRecording(true);
    } catch {
      send(chat.id, {
        chatId: chat.id,
        text: "Микрофон недоступен — отправил заметку",
        kind: "voice",
        duration: 2,
      });
    }
  }

  async function circle() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      const video = document.createElement("video");
      video.srcObject = stream;
      await video.play();
      const canvas = document.createElement("canvas");
      canvas.width = 240;
      canvas.height = 240;
      canvas.getContext("2d")?.drawImage(video, 0, 0, 240, 240);
      stream.getTracks().forEach((t) => t.stop());
      send(chat.id, {
        chatId: chat.id,
        text: "Кружок",
        kind: "circle",
        media: canvas.toDataURL("image/jpeg", 0.7),
      });
    } catch {
      send(chat.id, { chatId: chat.id, text: "Камера закрыта", kind: "circle" });
    }
  }

  return (
    <>
      <header className="flex items-center gap-3 border-b border-line bg-surface px-2 py-2">
        <IconButton label="Назад" onClick={() => openChat(null)} className="md:hidden">
          <ArrowLeft className="h-5 w-5" />
        </IconButton>
        <Avatar person={chatPeer(chat, people, meId)} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{title}</p>
          <p className="truncate text-sm text-muted">
            {chat.kind === "group" ? `${chat.memberIds.length} участников` : "в сети"}
          </p>
        </div>
        {peer ? (
          <IconButton label="Звонок" onClick={() => startCall(peer)}>
            <Phone className="h-5 w-5" />
          </IconButton>
        ) : null}
      </header>
      <div className="thread-bg min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {thread.map((m) => {
          const mine = m.authorId === meId;
          const author = personOf(people, m.authorId);
          const quoted = thread.find((x) => x.id === m.replyTo);
          const chips = reactionChips(m.reactions);
          return (
            <article
              key={m.id}
              className={`bubble flex ${mine ? "justify-end" : "justify-start"}`}
              onContextMenu={(event) => {
                event.preventDefault();
                openMenu(event.clientX, event.clientY, m.id);
              }}
            >
              <div className="flex max-w-[min(78%,32rem)] flex-col">
                <div
                  className={`px-3.5 py-2 text-[15px] leading-5 ${mine ? "bubble-mine bg-mine text-mine-fg" : "bubble-theirs bg-bubble text-fg ring-1 ring-line"} ${menu?.id === m.id ? "ring-2 ring-accent" : ""}`}
                >
                  {!mine && chat.kind === "group" ? <p className="mb-0.5 text-[13px] font-semibold text-accent">{author?.name}</p> : null}
                  {quoted ? (
                    <p className="mb-1 truncate rounded-lg bg-black/15 px-2 py-1 text-xs">{quoted.text}</p>
                  ) : null}
                  {m.kind === "image" && m.media ? <img src={m.media} alt="" className="mb-1 max-h-64 rounded-xl" /> : null}
                  {m.kind === "circle" && m.media ? (
                    <img src={m.media} alt="" className="mb-1 h-40 w-40 rounded-full object-cover" />
                  ) : null}
                  {m.kind === "voice" ? <VoiceNote src={m.media} label={m.text} /> : null}
                  {m.kind === "sticker" ? <p className="py-1 text-4xl leading-none">{m.text}</p> : null}
                  {m.kind === "text" || m.kind === "image" ? <p className="whitespace-pre-wrap">{m.text}</p> : null}
                  <div className="mt-1 flex items-center justify-end gap-1 text-[11px] leading-none opacity-75">
                    {m.edited ? <span>изменено</span> : null}
                    <span>{timeLabel(m.createdAt)}</span>
                    {mine ? (
                      m.state === "read" ? <CheckCheck className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />
                    ) : null}
                  </div>
                </div>
                {chips.length ? (
                  <div className={`mt-1.5 flex flex-wrap gap-1 ${mine ? "justify-end" : "justify-start"}`}>
                    {chips.map(([emoji, count]) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => {
                          toggleReaction(m.id, emoji);
                          setPopKey(`${m.id}:${emoji}:${Date.now()}`);
                        }}
                        className="react-pop tap inline-flex items-center gap-1 rounded-full bg-surface px-2 py-1 text-sm ring-1 ring-line"
                      >
                        <span>{emoji}</span>
                        {count > 1 ? <span className="text-[11px] text-muted">{count}</span> : null}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            </article>
          );
        })}
        <div ref={bottom} />
      </div>
      {menu ? (
        <MessageMenu
          x={menu.x}
          y={menu.y}
          mine={thread.find((item) => item.id === menu.id)?.authorId === meId}
          canEdit={(() => {
            const item = thread.find((row) => row.id === menu.id);
            return !!item && item.authorId === meId && (item.kind === "text" || item.kind === "image");
          })()}
          onClose={() => setMenu(null)}
          onReact={(emoji) => {
            toggleReaction(menu.id, emoji);
            setPopKey(`${menu.id}:${emoji}:${Date.now()}`);
            setMenu(null);
          }}
          onMore={() => {
            setReactFor(menu.id);
            setStickers(false);
            setMenu(null);
          }}
          onReply={() => {
            const item = thread.find((row) => row.id === menu.id);
            if (item) setReply(item);
            setEditing(null);
            setMenu(null);
          }}
          onEdit={() => {
            const item = thread.find((row) => row.id === menu.id);
            if (item) beginEdit(item);
          }}
          onDelete={() => {
            removeMessage(menu.id);
            if (editing?.id === menu.id) {
              setEditing(null);
              setText("");
            }
            setMenu(null);
          }}
        />
      ) : null}
      {reply ? (
        <div className="flex items-center justify-between border-t border-line px-4 py-2 text-sm text-muted">
          <span className="truncate">Ответ: {reply.text}</span>
          <button type="button" onClick={() => setReply(null)} aria-label="Снять ответ">
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : null}
      {editing ? (
        <div className="flex items-center justify-between bg-thread px-4 py-2 text-sm">
          <span className="min-w-0 truncate text-accent">Редактирование</span>
          <button
            type="button"
            aria-label="Отменить правку"
            onClick={() => {
              setEditing(null);
              setText("");
            }}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : null}
      {stickers || reactFor ? (
        <EmojiBoard
          query={emojiQuery}
          group={emojiGroup}
          onQuery={setEmojiQuery}
          onGroup={setEmojiGroup}
          onClose={() => {
            setStickers(false);
            setReactFor(null);
          }}
          onPick={(emoji) => {
            if (reactFor) {
              toggleReaction(reactFor, emoji);
              setPopKey(`${reactFor}:${emoji}:${Date.now()}`);
              setReactFor(null);
              return;
            }
            setText((value) => `${value}${emoji}`);
          }}
          onSticker={(emoji) => {
            send(chat.id, { chatId: chat.id, text: emoji, kind: "sticker" });
            setStickers(false);
          }}
          hint={reactFor ? "Реакция на сообщение" : "Эмодзи в сообщение"}
        />
      ) : null}
      <form
        className="bg-thread px-3 pb-3 pt-1"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <div className="flex items-end gap-1 rounded-[28px] bg-surface px-1.5 py-1.5 shadow-[0_10px_30px_rgb(0,0,0,0.22)] ring-1 ring-line">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void onFile(file);
            e.target.value = "";
          }}
        />
        <IconButton label="Фото" onClick={() => fileRef.current?.click()}>
          <ImagePlus className="h-5 w-5" />
        </IconButton>
        <IconButton
          label="Эмодзи"
          onClick={() => {
            setReactFor(null);
            setStickers((v) => !v);
          }}
        >
          <Smile className="h-5 w-5" />
        </IconButton>
        <IconButton label="Кружок" onClick={() => void circle()}>
          <Video className="h-5 w-5" />
        </IconButton>
        <textarea
          value={text}
          rows={1}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (enterToSend && e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          placeholder={editing ? "Изменить сообщение" : "Сообщение"}
          className="max-h-32 min-h-11 flex-1 resize-none bg-transparent px-3 py-3 text-[15px] outline-none"
        />
        {text.trim() ? (
          <button
            type="submit"
            aria-label={editing ? "Сохранить" : "Отправить"}
            className="tap grid h-11 w-11 place-items-center rounded-full bg-accent text-accent-fg"
          >
            {editing ? <Check className="h-5 w-5" /> : <Send className="h-5 w-5" />}
          </button>
        ) : (
          <IconButton label={recording ? "Стоп" : "Голос"} onClick={() => void toggleMic()}>
            {recording ? <Square className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
          </IconButton>
        )}
        </div>
      </form>
    </>
  );
}

function MessageMenu({
  x,
  y,
  mine,
  canEdit,
  onClose,
  onReact,
  onMore,
  onReply,
  onEdit,
  onDelete,
}: {
  x: number;
  y: number;
  mine: boolean;
  canEdit: boolean;
  onClose: () => void;
  onReact: (emoji: string) => void;
  onMore: () => void;
  onReply: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <>
      <button type="button" aria-label="Закрыть меню" className="fixed inset-0 z-40 cursor-default" onClick={onClose} />
      <div className="ctx fixed z-50" style={{ left: x, top: y }}>
        <div className="flex items-center gap-0.5 border-b border-line px-1.5 py-1.5">
          {QUICK_EMOJI.slice(0, 7).map((emoji) => (
            <button
              key={emoji}
              type="button"
              className="tap grid h-8 w-8 place-items-center rounded-full text-lg hover:bg-raised"
              onClick={() => onReact(emoji)}
            >
              {emoji}
            </button>
          ))}
          <button type="button" aria-label="Все эмодзи" className="tap grid h-8 w-8 place-items-center rounded-full hover:bg-raised" onClick={onMore}>
            <Smile className="h-4 w-4" />
          </button>
        </div>
        <button type="button" className="flex w-full items-center px-3 py-2.5 text-left text-sm hover:bg-raised" onClick={onReply}>
          Ответить
        </button>
        {canEdit ? (
          <button type="button" className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm hover:bg-raised" onClick={onEdit}>
            <Pencil className="h-4 w-4" /> Изменить
          </button>
        ) : null}
        {mine ? (
          <button type="button" className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-red-400 hover:bg-raised" onClick={onDelete}>
            <Trash2 className="h-4 w-4" /> Удалить
          </button>
        ) : null}
      </div>
    </>
  );
}

function EmojiBoard({
  query,
  group,
  hint,
  onQuery,
  onGroup,
  onPick,
  onSticker,
  onClose,
}: {
  query: string;
  group: string;
  hint: string;
  onQuery: (value: string) => void;
  onGroup: (id: string) => void;
  onPick: (emoji: string) => void;
  onSticker: (emoji: string) => void;
  onClose: () => void;
}) {
  const q = query.trim();
  const pool = q
    ? ALL_EMOJI.filter((emoji) => emoji.includes(q))
    : (EMOJI_GROUPS.find((item) => item.id === group)?.items ?? ALL_EMOJI);

  return (
    <div className="picker border-t border-line bg-surface px-3 py-2">
      <div className="mb-2 flex items-center gap-2">
        <p className="text-xs text-muted">{hint}</p>
        <input
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          placeholder="Найти эмодзи"
          className="min-h-9 flex-1 rounded-full bg-bg px-3 text-sm outline-none"
        />
        <button type="button" onClick={onClose} aria-label="Закрыть эмодзи" className="tap grid h-9 w-9 place-items-center">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="mb-2 flex gap-1 overflow-x-auto pb-1">
        {QUICK_EMOJI.map((emoji) => (
          <button
            key={emoji}
            type="button"
            className="tap grid h-9 w-9 shrink-0 place-items-center rounded-full bg-raised text-xl"
            onClick={() => onPick(emoji)}
          >
            {emoji}
          </button>
        ))}
      </div>
      <div className="mb-2 flex gap-1 overflow-x-auto">
        {STICKERS.map((emoji) => (
          <button
            key={emoji}
            type="button"
            className="tap grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-bg text-2xl"
            onClick={() => onSticker(emoji)}
          >
            {emoji}
          </button>
        ))}
        {EMOJI_GROUPS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => {
              onQuery("");
              onGroup(item.id);
            }}
            className={`shrink-0 rounded-full px-3 py-1 text-xs ${group === item.id && !q ? "bg-accent text-accent-fg" : "bg-bg text-muted"}`}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div className="grid max-h-52 grid-cols-8 gap-1 overflow-y-auto sm:grid-cols-10">
        {pool.map((emoji, index) => (
          <button
            key={`${group}-${index}-${emoji}`}
            type="button"
            className="tap grid h-10 place-items-center rounded-xl text-2xl hover:bg-raised"
            onClick={() => onPick(emoji)}
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
}

function VoiceNote({ src, label }: { src?: string; label: string }) {
  return src ? <audio controls src={src} className="h-8 max-w-full" /> : <span>{label}</span>;
}

function IconButton({
  children,
  label,
  onClick,
  className = "",
}: {
  children: ReactNode;
  label: string;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={`tap grid h-11 w-11 shrink-0 place-items-center rounded-full text-fg ${className}`}
    >
      {children}
    </button>
  );
}

function ProfileSheet({ onClose }: { onClose: () => void }) {
  const me = useRosema((s) => s.people.find((p) => p.id === s.meId));
  const updateMe = useRosema((s) => s.updateMe);
  const theme = useRosema((s) => s.theme);
  const setTheme = useRosema((s) => s.setTheme);
  const enterToSend = useRosema((s) => s.enterToSend);
  const setEnterToSend = useRosema((s) => s.setEnterToSend);
  const setMe = useRosema((s) => s.setMe);
  if (!me) return null;
  return (
    <Sheet title="Профиль" onClose={onClose}>
      <div className="flex items-center gap-4">
        <Avatar person={me} size="lg" />
        <div>
          <p className="font-medium">{me.name}</p>
          <p className="text-sm text-muted">@{me.handle}</p>
        </div>
      </div>
      <Field label="Имя" value={me.name} onChange={(name) => updateMe({ name })} />
      <Field label="О себе" value={me.about} onChange={(about) => updateMe({ about })} />
      <Field label="Статус" value={me.status} onChange={(status) => updateMe({ status })} />
      <p className="text-sm text-muted">Тема</p>
      <div className="grid grid-cols-2 gap-2">
        {THEMES.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTheme(t.id)}
            className={`min-h-11 rounded-2xl border px-3 ${theme === t.id ? "border-accent bg-accent text-accent-fg" : "border-line"}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <label className="flex min-h-11 items-center justify-between gap-3 text-sm">
        Enter отправляет
        <input type="checkbox" checked={enterToSend} onChange={(e) => setEnterToSend(e.target.checked)} />
      </label>
      <button type="button" onClick={() => setMe(null)} className="min-h-11 rounded-2xl border border-line">
        Выйти
      </button>
    </Sheet>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block text-sm">
      <span className="text-muted">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 min-h-11 w-full rounded-2xl border border-line bg-bg px-3 outline-none"
      />
    </label>
  );
}

function GroupSheet({ onClose }: { onClose: () => void }) {
  const people = useRosema((s) => s.people);
  const meId = useRosema((s) => s.meId);
  const createGroup = useRosema((s) => s.createGroup);
  const [title, setTitle] = useState("");
  const [ids, setIds] = useState<string[]>([]);
  return (
    <Sheet title="Новая группа" onClose={onClose}>
      <Field label="Название" value={title} onChange={setTitle} />
      <ul className="space-y-2">
        {people
          .filter((p) => p.id !== meId)
          .map((p) => (
            <li key={p.id}>
              <label className="flex min-h-11 items-center gap-3">
                <input
                  type="checkbox"
                  checked={ids.includes(p.id)}
                  onChange={() =>
                    setIds((cur) => (cur.includes(p.id) ? cur.filter((x) => x !== p.id) : [...cur, p.id]))
                  }
                />
                {p.name}
              </label>
            </li>
          ))}
      </ul>
      <button
        type="button"
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-accent px-4 text-accent-fg"
        onClick={() => {
          createGroup(title, ids);
          onClose();
        }}
      >
        <Plus className="h-4 w-4" /> Создать
      </button>
    </Sheet>
  );
}

function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-20 flex bg-bg/70 md:justify-end">
      <button type="button" className="hidden flex-1 md:block" aria-label="Закрыть фон" onClick={onClose} />
      <div className="sheet-in flex h-full w-full flex-col gap-4 overflow-y-auto bg-surface p-5 md:w-96">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-2xl">{title}</h2>
          <IconButton label="Закрыть" onClick={onClose}>
            <X className="h-5 w-5" />
          </IconButton>
        </div>
        {children}
      </div>
    </div>
  );
}

function CallOverlay() {
  const call = useRosema((s) => s.call)!;
  const people = useRosema((s) => s.people);
  const answerCall = useRosema((s) => s.answerCall);
  const hangup = useRosema((s) => s.hangup);
  const toggleMute = useRosema((s) => s.toggleMute);
  const peer = personOf(people, call.peerId);
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setTick((n) => n + 1), 1000);
    return () => window.clearInterval(id);
  }, []);
  const sec = call.phase === "live" ? Math.floor((Date.now() - call.startedAt) / 1000) : 0;
  return (
    <div className="fixed inset-0 z-30 grid place-items-center bg-bg text-fg">
      <div className="flex flex-col items-center text-center">
        <Avatar person={peer} size="lg" />
        <p className="mt-4 font-display text-3xl">{peer?.name}</p>
        <p className="mt-1 text-muted">{call.phase === "ringing" ? "вызов…" : format(sec)}</p>
        <div className="mt-8 flex justify-center gap-3">
          {call.phase === "ringing" ? (
            <button type="button" onClick={answerCall} className="min-h-12 rounded-full bg-accent px-5 text-accent-fg">
              Ответить
            </button>
          ) : (
            <button type="button" onClick={toggleMute} className="min-h-12 rounded-full border border-line px-5">
              {call.muted ? "Включить микр." : "Без звука"}
            </button>
          )}
          <button
            type="button"
            onClick={hangup}
            aria-label="Сбросить"
            className="grid h-12 w-12 place-items-center rounded-full bg-mine text-mine-fg"
          >
            <PhoneOff className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

function format(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
