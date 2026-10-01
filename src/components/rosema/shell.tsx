import { useEffect, useMemo, useRef, useState } from "react";
import { Archive, BellOff, Bookmark, Image as ImageIcon, LogOut, Mail, Megaphone, MessageSquare, Pin, Search, SquarePen, Trash2, User as UserIcon, UserPlus, Users, X } from "lucide-react";
import {
  LIST_WIDTH_DEFAULT,
  LIST_WIDTH_MAX,
  LIST_WIDTH_MIN,
  NARROW_SHELL_PX,
  STORY_FRAME_MS,
  STORY_TTL_MS,
} from "@/lib/rosema/constants";
import { Conversation, EmptyThread } from "@/components/rosema/conversation";
import {
  type Chat,
  type Story,
  type User,
  chatTitle,
  initials,
  lastMessage,
  listStamp,
  peopleCount,
  previewText,
  sortChats,
  unreadCount,
  avatarColor,
  userById,
  visibleChats,
} from "@/lib/rosema/logic";
import { useRosema } from "@/lib/rosema/store";
import { cn } from "@/lib/cn";

function StoryStage({
  mode,
  stories,
  users,
  index,
  text,
  onText,
  onIndex,
  onClose,
  onPost,
  onSeen,
}: {
  mode: string;
  stories: Story[];
  users: User[];
  index: number;
  text: string;
  onText: (value: string) => void;
  onIndex: (value: number) => void;
  onClose: () => void;
  onPost: () => void;
  onSeen: (id: string) => void;
}) {
  const deck = stories
    .filter((story) => story.authorId === mode)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const slide = deck[index];
  const author = userById(users, slide?.authorId);

  useEffect(() => {
    if (!slide) return;
    onSeen(slide.id);
    const timer = window.setTimeout(() => {
      if (index < deck.length - 1) onIndex(index + 1);
      else onClose();
    }, STORY_FRAME_MS);
    return () => window.clearTimeout(timer);
  }, [deck.length, index, slide?.id]);

  return (
    <div className="story-stage">
      {mode === "new" ? (
        <form
          className="story-card story-tone-rose"
          onSubmit={(event) => {
            event.preventDefault();
            onPost();
          }}
        >
          <textarea
            value={text}
            onChange={(event) => onText(event.target.value)}
            placeholder="Что происходит прямо сейчас"
            rows={5}
            className="w-full bg-transparent text-2xl text-white outline-none placeholder:text-white/70"
          />
          <button type="submit" className="mt-4 h-11 rounded-full bg-white/90 text-sm font-medium text-[#4a2030]">
            Опубликовать
          </button>
        </form>
      ) : slide ? (
        <button
          type="button"
          className={cn("story-card", `story-tone-${slide.tone ?? "rose"}`)}
          onClick={(event) => {
            const box = event.currentTarget.getBoundingClientRect();
            const back = event.clientX - box.left < box.width * 0.35;
            if (back) onIndex(Math.max(0, index - 1));
            else if (index < deck.length - 1) onIndex(index + 1);
            else onClose();
          }}
        >
          <span className="story-progress">
            {deck.map((item, itemIndex) => (
              <span key={item.id} className={cn("story-progress-bit", itemIndex <= index && "is-on")} />
            ))}
          </span>
          <span className="text-left">
            <span className="block text-sm opacity-80">{author?.displayName ?? "История"}</span>
            <span className="mt-3 block text-3xl leading-tight font-semibold">{slide.text}</span>
          </span>
        </button>
      ) : null}
      <button type="button" className="absolute top-4 right-4 z-10 h-11 px-3 text-white" onClick={onClose}>
        Закрыть
      </button>
    </div>
  );
}

export function Shell() {
  const users = useRosema((s) => s.users);
  const chats = useRosema((s) => s.chats);
  const messages = useRosema((s) => s.messages);
  const contacts = useRosema((s) => s.contacts);
  const session = useRosema((s) => s.session);
  const activeChatId = useRosema((s) => s.activeChatId);
  const logout = useRosema((s) => s.logout);
  const setActiveChat = useRosema((s) => s.setActiveChat);
  const addContact = useRosema((s) => s.addContact);
  const removeContact = useRosema((s) => s.removeContact);
  const openDirect = useRosema((s) => s.openDirect);
  const updateProfile = useRosema((s) => s.updateProfile);
  const setTheme = useRosema((s) => s.setTheme);
  const setAccent = useRosema((s) => s.setAccent);
  const setWallpaper = useRosema((s) => s.setWallpaper);
  const markRead = useRosema((s) => s.markRead);
  const typing = useRosema((s) => s.typing);
  const drafts = useRosema((s) => s.drafts);
  const ensureSaved = useRosema((s) => s.ensureSaved);
  const ensureBot = useRosema((s) => s.ensureBot);
  const ensureStories = useRosema((s) => s.ensureStories);
  const sweep = useRosema((s) => s.sweep);
  const stories = useRosema((s) => s.stories);
  const postStory = useRosema((s) => s.postStory);
  const seeStory = useRosema((s) => s.seeStory);
  const createChannel = useRosema((s) => s.createChannel);
  const openSecret = useRosema((s) => s.openSecret);
  const toggleArchive = useRosema((s) => s.toggleArchive);
  const markUnread = useRosema((s) => s.markUnread);
  const deleteChat = useRosema((s) => s.deleteChat);
  const clearHistory = useRosema((s) => s.clearHistory);
  const createGroup = useRosema((s) => s.createGroup);
  const togglePin = useRosema((s) => s.togglePin);
  const toggleMute = useRosema((s) => s.toggleMute);

  const [tab, setTab] = useState<"chats" | "contacts">("chats");
  const [query, setQuery] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactError, setContactError] = useState<string | null>(null);
  const [infoOpen, setInfoOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [callOpen, setCallOpen] = useState(false);
  const [folder, setFolder] = useState<"all" | "direct" | "groups" | "unread" | "archive">("all");
  const [rowMenu, setRowMenu] = useState<{ id: string; x: number; y: number } | null>(null);
  const [compose, setCompose] = useState(false);
  const [groupTitle, setGroupTitle] = useState("");
  const [groupIds, setGroupIds] = useState<string[]>([]);
  const [groupError, setGroupError] = useState<string | null>(null);
  const [channelTitle, setChannelTitle] = useState("");
  const [storyOpen, setStoryOpen] = useState<string | null>(null);
  const [storyIndex, setStoryIndex] = useState(0);
  const shellRef = useRef<HTMLDivElement>(null);
  const [narrow, setNarrow] = useState(false);
  const [listW, setListW] = useState(LIST_WIDTH_DEFAULT);
  const [storyText, setStoryText] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [about, setAbout] = useState("");
  const [profileError, setProfileError] = useState<string | null>(null);

  const guest = Boolean(session?.guest);
  const me = guest ? null : users.find((user) => user.id === session?.userId) ?? null;
  const myId = session?.userId ?? "";

  const shown = useMemo(() => {
    if (!session) return [];
    const q = query.trim().toLowerCase();
    return sortChats(visibleChats(chats, session), messages).filter((chat) => {
      const archived = Boolean(chat.archived);
      if (folder === "archive" ? !archived : archived) return false;
      if (folder === "direct" && (chat.type !== "direct" || chat.saved)) return false;
      if (folder === "groups" && chat.type === "direct") return false;
      const unread = unreadCount(messages, chat.id, myId) > 0 || Boolean(chat.forcedUnread);
      if (folder === "unread" && !unread) return false;
      if (!q) return true;
      const title = chatTitle(chat, users, myId).toLowerCase();
      const preview = previewText(lastMessage(messages, chat.id)).toLowerCase();
      const inThread = messages.some(
        (message) => message.chatId === chat.id && (message.text ?? "").toLowerCase().includes(q),
      );
      return title.includes(q) || preview.includes(q) || inThread;
    });
  }, [chats, folder, messages, myId, query, session, users]);

  const foundMessages = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!session || q.length < 2) return [];
    return messages
      .filter((message) => message.state !== "deleted" && (message.text ?? "").toLowerCase().includes(q))
      .filter((message) => visibleChats(chats, session).some((chat) => chat.id === message.chatId))
      .slice(-8)
      .reverse();
  }, [chats, messages, query, session]);

  const active = chats.find((chat) => chat.id === activeChatId) ?? null;
  const visibleActive = active && session && visibleChats([active], session).length > 0 ? active : null;

  const deliveredSig = messages.filter(
    (message) => message.chatId === activeChatId && message.state === "delivered" && message.authorId !== myId,
  ).length;

  useEffect(() => {
    if (session && !session.guest) {
      ensureSaved();
      ensureBot();
      ensureStories();
    }
  }, [ensureBot, ensureSaved, ensureStories, session]);

  useEffect(() => {
    const timer = window.setInterval(() => sweep(), 1000);
    return () => window.clearInterval(timer);
  }, [sweep]);

  useEffect(() => {
    if (activeChatId) markRead(activeChatId);
  }, [activeChatId, deliveredSig, markRead]);

  useEffect(() => {
    if (!session || session.guest) {
      document.title = "Rosema";
      return;
    }
    const total = chats.reduce(
      (sum, chat) => sum + (chat.muted ? 0 : unreadCount(messages, chat.id, session.userId)),
      0,
    );
    document.title = total > 0 ? `(${total}) Rosema` : "Rosema";
  }, [chats, messages, session]);

  useEffect(() => {
    const node = shellRef.current;
    if (!node) return;
    const apply = () => setNarrow(node.clientWidth < NARROW_SHELL_PX);
    apply();
    const observer = new ResizeObserver(apply);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const saved = Number(localStorage.getItem("rosema.listW"));
    if (saved >= LIST_WIDTH_MIN && saved <= LIST_WIDTH_MAX) setListW(saved);
  }, []);

  useEffect(() => {
    localStorage.setItem("rosema.listW", String(listW));
  }, [listW]);

  useEffect(() => {
    if (!profileOpen || !me) return;
    setDisplayName(me.displayName);
    setAbout(me.about);
    setProfileError(null);
  }, [profileOpen, me]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setCallOpen(false);
      setProfileOpen(false);
      setInfoOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const contactIds = me ? (contacts[me.id] ?? []) : [];
  const contactQuery = query.trim().toLowerCase();
  const contactRows = contactIds
    .map((id) => userById(users, id))
    .filter((user): user is NonNullable<typeof user> => Boolean(user))
    .filter((user) => {
      if (!contactQuery) return true;
      return (
        user.displayName.toLowerCase().includes(contactQuery) ||
        user.username.toLowerCase().includes(contactQuery)
      );
    });

  return (
    <div
      ref={shellRef}
      className={cn("rosema-shell", visibleActive && "is-open", infoOpen && "info-open", narrow && "is-narrow")}
      style={{ ["--list-w" as string]: `${listW}px` }}
    >
      <nav className="app-rail" aria-label="Разделы">
        <button type="button" className="rail-avatar" aria-label="Профиль" onClick={() => setProfileOpen(true)}>
          <span style={{ background: avatarColor(guest ? "Гость" : (me?.displayName ?? "R")) }}>
            {guest ? "Г" : initials(me?.displayName ?? "R")}
          </span>
        </button>
        {(
          [
            ["all", "Все чаты", MessageSquare],
            ["direct", "Личные", UserIcon],
            ["groups", "Группы", Users],
            ["unread", "Новые", Mail],
            ["archive", "Архив", Archive],
          ] as const
        ).map(([id, label, Icon]) => (
          <button
            key={id}
            type="button"
            className={cn("rail-btn", tab === "chats" && folder === id && "rail-btn-on")}
            aria-label={label}
            title={label}
            onClick={() => {
              setTab("chats");
              setFolder(id);
            }}
          >
            <Icon className="size-5" />
          </button>
        ))}
        <button
          type="button"
          className={cn("rail-btn", tab === "contacts" && "rail-btn-on")}
          aria-label="Контакты"
          title="Контакты"
          onClick={() => setTab("contacts")}
        >
          <UserPlus className="size-5" />
        </button>
        <span className="flex-1" />
        <button type="button" className="rail-btn" aria-label="Выйти" onClick={logout}>
          <LogOut className="size-5" />
        </button>
      </nav>
      <aside className="chat-list flex flex-col bg-surface">
        <div className="flex items-center gap-2 px-4 pt-4">
          <p className="min-w-0 flex-1 truncate text-lg font-semibold">
            {tab === "contacts" ? "Контакты" : folder === "direct" ? "Личные" : folder === "groups" ? "Группы" : folder === "unread" ? "Новые" : folder === "archive" ? "Архив" : "Чаты"}
          </p>
          <button type="button" className="grid size-10 place-items-center rounded-full text-muted hover:bg-surface-2" aria-label="Новый чат" onClick={() => setCompose(true)}>
            <SquarePen className="size-5" />
          </button>
          <button type="button" className="only-mobile grid size-10 place-items-center text-muted" aria-label="Выйти" onClick={logout}>
            <LogOut className="size-5" />
          </button>
        </div>
        <div className="px-3 pt-2">
            <label className="relative block">
              <Search className="pointer-events-none absolute top-2.5 left-3 size-4 text-muted" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Поиск"
                className="h-9 w-full rounded-full border-0 bg-surface-2 pr-3 pl-9 text-sm"
              />
            </label>
            {!guest ? (
              <div className="stories-rail no-bar mt-3">
                <button type="button" className="w-16 shrink-0 text-center" onClick={() => setStoryOpen("new")}>
                  <span className="story-ring mx-auto grid size-14 place-items-center rounded-full">
                    <span className="grid size-[50px] place-items-center rounded-full bg-surface text-xl text-muted">+</span>
                  </span>
                  <span className="mt-1 block truncate text-[11px]">Моя</span>
                </button>
                {Array.from(
                  (stories ?? [])
                    .filter((story) => Date.now() - Date.parse(story.createdAt) < STORY_TTL_MS)
                    .reduce((map, story) => {
                      const list = map.get(story.authorId) ?? [];
                      list.push(story);
                      map.set(story.authorId, list);
                      return map;
                    }, new Map<string, NonNullable<typeof stories>>()),
                ).map(([authorId, slides]) => {
                  const author = userById(users, authorId);
                  const seen = slides.every((story) => (story.seenBy ?? []).includes(myId));
                  return (
                    <button
                      key={authorId}
                      type="button"
                      className="w-16 shrink-0 text-center"
                      onClick={() => {
                        setStoryIndex(0);
                        setStoryOpen(authorId);
                        const first = slides[0];
                        if (first) seeStory(first.id);
                      }}
                    >
                      <span className={cn("story-ring mx-auto grid size-14 place-items-center rounded-full", seen && "story-ring-seen")}>
                        <span
                          className="grid size-[50px] place-items-center rounded-full text-sm text-white"
                          style={{ background: avatarColor(author?.displayName ?? "R") }}
                        >
                          {initials(author?.displayName ?? "R")}
                        </span>
                      </span>
                      <span className="mt-1 block truncate text-[11px]">{author?.displayName ?? ""}</span>
                    </button>
                  );
                })}
              </div>
            ) : null}
            <div className="folder-clip only-mobile mt-2">
            <div className="no-bar folder-scroll flex gap-1.5 px-0.5">
              {(
                [
                  ["all", "Все"],
                  ["direct", "Личные"],
                  ["groups", "Группы"],
                  ["unread", "Новые"],
                  ["archive", "Архив"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  className={cn(
                    "folder-chip shrink-0",
                    tab === "chats" && folder === id ? "folder-chip-on" : "",
                  )}
                  onClick={() => {
                    setTab("chats");
                    setFolder(id);
                  }}
                >
                  {label}
                </button>
              ))}
              <button
                type="button"
                className={cn("folder-chip shrink-0", tab === "contacts" && "folder-chip-on")}
                onClick={() => setTab("contacts")}
              >
                Контакты
              </button>
            </div>
            </div>
          </div>

          {tab === "contacts" ? (
            <div className="scroll min-h-0 flex-1 overflow-y-auto px-3 py-2">
              {guest ? (
                <p className="px-1 text-sm text-muted">Гостю контакты недоступны. Выйдите и войдите под своим именем.</p>
              ) : (
                <>
                  <form
                    className="rounded-2xl bg-surface-2 p-3"
                    onSubmit={(event) => {
                      event.preventDefault();
                      const result = addContact(contactName);
                      if (!result.ok) setContactError(result.error);
                      else {
                        setContactName("");
                        setContactError(null);
                      }
                    }}
                  >
                    <p className="text-sm font-medium">Новый контакт</p>
                    <p className="mt-0.5 text-xs text-muted">Имя входа: artyukhin или roman_v</p>
                    <div className="mt-2 flex gap-2">
                      <input
                        value={contactName}
                        onChange={(event) => {
                          setContactName(event.target.value);
                          setContactError(null);
                        }}
                        placeholder="username"
                        spellCheck={false}
                        className="h-11 min-w-0 flex-1 rounded-full border-0 bg-surface px-4 text-base"
                      />
                      <button type="submit" className="h-11 shrink-0 rounded-full bg-rose px-4 text-sm text-on-rose">
                        Добавить
                      </button>
                    </div>
                    {contactError ? (
                      <p className="mt-2 text-sm text-warn" role="alert">
                        {contactError}
                      </p>
                    ) : null}
                  </form>
                  <p className="mt-4 px-1 text-xs text-muted">Ваши контакты</p>
                  <ul className="mt-1">
                    {contactRows.map((user) => (
                      <li key={user.id} className="flex items-center gap-3 rounded-2xl px-1 py-2 hover:bg-surface-2">
                        <Avatar name={user.displayName} />
                        <button
                          type="button"
                          className="min-w-0 flex-1 text-left"
                          onClick={() => {
                            openDirect(user.id);
                            setInfoOpen(false);
                          }}
                        >
                          <p className="truncate text-sm font-medium">{user.displayName}</p>
                          <p className="truncate text-xs text-muted">@{user.username}</p>
                        </button>
                        <button
                          type="button"
                          className="h-9 rounded-full px-3 text-xs text-muted"
                          onClick={() => removeContact(user.id)}
                        >
                          Убрать
                        </button>
                      </li>
                    ))}
                    {contactRows.length === 0 ? <li className="px-1 py-3 text-sm text-muted">Пока никого нет.</li> : null}
                  </ul>
                  <p className="mt-3 px-1 text-xs text-muted">Можно добавить</p>
                  <ul className="mt-1">
                    {users
                      .filter((user) => user.id !== myId && user.id !== "u_bot" && !contactIds.includes(user.id))
                      .filter((user) => {
                        if (!contactQuery) return true;
                        return user.displayName.toLowerCase().includes(contactQuery) || user.username.toLowerCase().includes(contactQuery);
                      })
                      .map((user) => (
                        <li key={user.id}>
                          <button
                            type="button"
                            className="flex w-full items-center gap-3 rounded-2xl px-1 py-2 text-left hover:bg-surface-2"
                            onClick={() => addContact(user.username)}
                          >
                            <Avatar name={user.displayName} />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-medium">{user.displayName}</span>
                              <span className="block truncate text-xs text-muted">@{user.username}</span>
                            </span>
                            <span className="text-xs text-rose">Добавить</span>
                          </button>
                        </li>
                      ))}
                  </ul>
                </>
              )}
            </div>
          ) : (
            <ul className="scroll min-h-0 flex-1 overflow-y-auto py-1">
              {shown.map((chat) => {
                const draft = chat.id === activeChatId ? "" : (drafts?.[chat.id] ?? "");
                const live = typing?.chatId === chat.id;
                const preview = live
                  ? "печатает…"
                  : draft
                    ? `Черновик: ${draft.replace(/\s+/g, " ").trim()}`
                    : previewText(lastMessage(messages, chat.id));
                return (
                <ChatRow
                  key={chat.id}
                  chat={chat}
                  active={chat.id === visibleActive?.id}
                  title={chatTitle(chat, users, myId)}
                  preview={preview}
                  accent={live || Boolean(draft)}
                  stamp={listStamp(lastMessage(messages, chat.id)?.createdAt ?? "")}
                  unread={guest ? 0 : Math.max(unreadCount(messages, chat.id, myId), chat.forcedUnread ? 1 : 0)}
                  onOpen={() => {
                    setActiveChat(chat.id);
                    setInfoOpen(false);
                    setCallOpen(false);
                    setRowMenu(null);
                  }}
                  onMenu={(x, y) => setRowMenu({ id: chat.id, x, y })}
                />
                );
              })}
              {shown.length === 0 ? <li className="px-4 py-6 text-sm text-muted">Ничего не нашлось.</li> : null}
            </ul>
          )}
          {tab === "chats" && foundMessages.length > 0 ? (
            <div className="max-h-48 shrink-0 overflow-y-auto border-t border-line px-2 py-2">
              <p className="px-2 pb-1 text-xs text-muted">Сообщения</p>
              {foundMessages.map((message) => {
                const chat = chats.find((item) => item.id === message.chatId);
                if (!chat) return null;
                return (
                  <button
                    key={message.id}
                    type="button"
                    className="flex w-full flex-col rounded-lg px-2 py-2 text-left hover:bg-surface-2"
                    onClick={() => setActiveChat(chat.id)}
                  >
                    <span className="text-xs text-rose">{chatTitle(chat, users, myId)}</span>
                    <span className="truncate text-sm">{message.text}</span>
                  </button>
                );
              })}
            </div>
          ) : null}
        <div
          className="list-grip"
          role="separator"
          aria-orientation="vertical"
          aria-label="Ширина списка чатов"
          onPointerDown={(event) => {
            event.preventDefault();
            const startX = event.clientX;
            const start = listW;
            const move = (ev: PointerEvent) => {
              setListW(Math.min(LIST_WIDTH_MAX, Math.max(LIST_WIDTH_MIN, start + ev.clientX - startX)));
            };
            const up = () => {
              window.removeEventListener("pointermove", move);
              window.removeEventListener("pointerup", up);
            };
            window.addEventListener("pointermove", move);
            window.addEventListener("pointerup", up);
          }}
        />
        </aside>

        {visibleActive ? (
          <Conversation
            chat={visibleActive}
            onBack={() => setActiveChat(null)}
            onInfo={() => setInfoOpen(true)}
            onCall={() => setCallOpen(true)}
          />
        ) : (
          <EmptyThread />
        )}

        {infoOpen && visibleActive ? (
          <aside className="info-pane flex flex-col bg-surface">
            <ChatInfo chat={visibleActive} onClose={() => setInfoOpen(false)} />
          </aside>
        ) : null}

      {profileOpen ? (
        <div className="absolute inset-0 z-30 grid place-items-center bg-bg/80 p-4">
          <div className="max-h-[92%] w-full max-w-md overflow-y-auto rounded-2xl border border-line bg-surface p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xl font-semibold">{guest ? "Гость" : "Профиль"}</p>
                <p className="text-sm text-muted">
                  {guest ? "Канал открыт без учётной записи." : me?.username}
                </p>
              </div>
              <button type="button" className="grid size-11 place-items-center" aria-label="Закрыть профиль" onClick={() => setProfileOpen(false)}>
                <X className="size-4" />
              </button>
            </div>
            {me ? (
              <form
                className="mt-4 space-y-3"
                onSubmit={(event) => {
                  event.preventDefault();
                  const result = updateProfile({ displayName, about });
                  if (!result.ok) setProfileError(result.error);
                  else setProfileOpen(false);
                }}
              >
                <label className="block text-sm">
                  Как показывать в чатах
                  <input
                    value={displayName}
                    onChange={(event) => setDisplayName(event.target.value)}
                    className="mt-1 h-11 w-full rounded-lg border border-line bg-bg px-3 text-base"
                  />
                </label>
                <label className="block text-sm">
                  О себе
                  <textarea
                    value={about}
                    rows={3}
                    onChange={(event) => setAbout(event.target.value)}
                    className="mt-1 w-full rounded-lg border border-line bg-bg px-3 py-2 text-base"
                  />
                </label>
                <div>
                  <p className="text-sm">Тема</p>
                  <div className="mt-2 grid grid-cols-4 gap-2">
                    {(
                      [
                        ["dark", "Ночь", "#8d4e45"],
                        ["light", "Бумага", "#c4544a"],
                        ["kittens", "Котята", "#e2567b"],
                        ["ocean", "Море", "#4ea2e0"],
                        ["forest", "Лес", "#3f8f62"],
                        ["dusk", "Сумерки", "#8b6cc4"],
                        ["sunset", "Закат", "#e07a45"],
                        ["graphite", "Графит", "#8d939c"],
                      ] as const
                    ).map(([id, label, color]) => (
                      <button
                        key={id}
                        type="button"
                        className={cn("rounded-xl border px-1 py-2 text-xs", me.theme === id ? "border-rose" : "border-line")}
                        onClick={() => setTheme(id)}
                      >
                        <span className="mx-auto mb-1 block size-5 rounded-full" style={{ background: color }} />
                        {label}
                      </button>
                    ))}
                  </div>
                  <p className="mt-3 text-sm">Цвет</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {["#e07a6a", "#3390ec", "#7c5cbf", "#3aa56b", "#e0a15a", "#e2567b"].map((color) => (
                      <button
                        key={color}
                        type="button"
                        aria-label={color}
                        className={cn("size-8 rounded-full border", me.accent === color ? "border-fg" : "border-transparent")}
                        style={{ background: color }}
                        onClick={() => setAccent(color)}
                      />
                    ))}
                    <label className="text-xs text-muted">
                      Свой
                      <input
                        type="color"
                        value={me.accent || "#e07a6a"}
                        className="ml-1 h-8 w-10 bg-transparent"
                        onChange={(event) => setAccent(event.target.value)}
                      />
                    </label>
                    {me.accent ? (
                      <button type="button" className="text-xs text-muted" onClick={() => setAccent("")}>
                        Сбросить
                      </button>
                    ) : null}
                  </div>
                  <p className="mt-3 text-sm">Обои</p>
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    {(
                      [
                        ["theme", "Как тема", ""],
                        ["none", "Пусто", ""],
                        ["kittens", "Котята", "/kittens.jpg"],
                        ["sea", "Море", "/wall-sea.jpg"],
                        ["night", "Ночь", "/wall-night.jpg"],
                        ["bloom", "Цветы", "/wall-bloom.jpg"],
                      ] as const
                    ).map(([id, label, src]) => (
                      <button
                        key={id}
                        type="button"
                        className={cn(
                          "h-16 overflow-hidden rounded-xl border text-xs",
                          (me.wallpaper || "theme") === id ? "border-rose" : "border-line",
                        )}
                        style={src ? { background: `center/cover url(${src})` } : undefined}
                        onClick={() => setWallpaper(id)}
                      >
                        {src ? "" : label}
                      </button>
                    ))}
                  </div>
                </div>
                {profileError ? (
                  <p className="text-sm text-warn" role="alert">
                    {profileError}
                  </p>
                ) : null}
                <button type="submit" className="h-11 w-full rounded-lg bg-rose text-sm text-on-rose">
                  Сохранить
                </button>
              </form>
            ) : null}
            <p className="mt-4 text-xs text-muted">Локальная сборка для защиты. Переписка не уходит с этого устройства.</p>
          </div>
        </div>
      ) : null}

      {rowMenu ? (
        <ChatListMenu
          chat={chats.find((item) => item.id === rowMenu.id)}
          x={rowMenu.x}
          y={rowMenu.y}
          onClose={() => setRowMenu(null)}
          onPin={() => {
            togglePin(rowMenu.id);
            setRowMenu(null);
          }}
          onMute={() => {
            toggleMute(rowMenu.id);
            setRowMenu(null);
          }}
          onArchive={() => {
            toggleArchive(rowMenu.id);
            setRowMenu(null);
          }}
          onUnread={() => {
            markUnread(rowMenu.id);
            setRowMenu(null);
          }}
          onClear={() => {
            clearHistory(rowMenu.id);
            setRowMenu(null);
          }}
          onDelete={() => {
            deleteChat(rowMenu.id);
            setRowMenu(null);
          }}
        />
      ) : null}

      {compose ? (
        <div className="absolute inset-0 z-30 flex items-end bg-black/45 p-3 sm:items-center sm:justify-center">
          <div className="max-h-[80dvh] w-full max-w-md overflow-y-auto rounded-lg bg-surface p-3">
            <div className="mb-2 flex items-center justify-between">
              <p className="font-medium">Новый чат</p>
              <button type="button" className="grid size-11 place-items-center" aria-label="Закрыть" onClick={() => setCompose(false)}>
                <X className="size-4" />
              </button>
            </div>
            <p className="px-1 text-xs text-muted">Группа</p>
            <input
              value={groupTitle}
              onChange={(event) => setGroupTitle(event.target.value)}
              placeholder="Название"
              className="mt-1 h-11 w-full rounded-lg border-0 bg-surface-2 px-3"
            />
            <ul className="mt-2">
              {users
                .filter((user) => user.id !== myId)
                .map((user) => (
                  <li key={user.id}>
                    <button
                      type="button"
                      className="flex h-11 w-full items-center justify-between px-1 text-left text-sm"
                      onClick={() =>
                        setGroupIds((ids) => (ids.includes(user.id) ? ids.filter((id) => id !== user.id) : [...ids, user.id]))
                      }
                    >
                      {user.displayName}
                      <span className={cn("size-4 rounded-full border", groupIds.includes(user.id) ? "border-rose bg-rose" : "border-muted")} />
                    </button>
                  </li>
                ))}
            </ul>
            {groupError ? <p className="text-sm text-warn">{groupError}</p> : null}
            <button
              type="button"
              className="mt-2 h-11 w-full rounded-lg bg-rose text-sm text-on-rose"
              onClick={() => {
                const result = createGroup(groupTitle, groupIds);
                if (!result.ok) setGroupError(result.error);
                else {
                  setCompose(false);
                  setGroupTitle("");
                  setGroupIds([]);
                  setGroupError(null);
                  setFolder("all");
                }
              }}
            >
              Создать группу
            </button>
            <p className="mt-4 px-1 text-xs text-muted">Канал</p>
            <input
              value={channelTitle}
              onChange={(event) => setChannelTitle(event.target.value)}
              placeholder="Название канала"
              className="mt-1 h-11 w-full rounded-lg border-0 bg-surface-2 px-3"
            />
            <button
              type="button"
              className="mt-2 h-11 w-full rounded-lg bg-surface-2 text-sm"
              onClick={() => {
                const result = createChannel(channelTitle);
                if (!result.ok) setGroupError(result.error);
                else {
                  setCompose(false);
                  setChannelTitle("");
                  setGroupError(null);
                }
              }}
            >
              Создать канал
            </button>
            <p className="mt-4 px-1 text-xs text-muted">Секретный чат</p>
            <ul>
              {users
                .filter((user) => user.id !== myId && user.id !== "u_bot")
                .map((user) => (
                  <li key={`sec-${user.id}`}>
                    <button
                      type="button"
                      className="flex h-11 w-full items-center px-1 text-left text-sm"
                      onClick={() => {
                        const result = openSecret(user.id);
                        if (!result.ok) setGroupError(result.error);
                        else setCompose(false);
                      }}
                    >
                      🔒 {user.displayName}
                    </button>
                  </li>
                ))}
            </ul>
          </div>
        </div>
      ) : null}

      {storyOpen ? (
        <StoryStage
          mode={storyOpen}
          stories={stories ?? []}
          users={users}
          index={storyIndex}
          text={storyText}
          onText={setStoryText}
          onIndex={setStoryIndex}
          onClose={() => setStoryOpen(null)}
          onPost={() => {
            const result = postStory(storyText);
            if (!result.ok) setGroupError(result.error);
            else {
              setStoryText("");
              setStoryOpen(null);
            }
          }}
          onSeen={seeStory}
        />
      ) : null}

      {callOpen && visibleActive ? (
        <CallOverlay title={chatTitle(visibleActive, users, myId)} onEnd={() => setCallOpen(false)} />
      ) : null}
    </div>
  );
}

function ChatInfo({ chat, onClose }: { chat: Chat; onClose: () => void }) {
  const users = useRosema((s) => s.users);
  const messages = useRosema((s) => s.messages);
  const session = useRosema((s) => s.session);
  const simulateFailure = useRosema((s) => s.simulateFailure);
  const setSimulateFailure = useRosema((s) => s.setSimulateFailure);
  const togglePin = useRosema((s) => s.togglePin);
  const toggleMute = useRosema((s) => s.toggleMute);
  const renameChat = useRosema((s) => s.renameChat);
  const addMember = useRosema((s) => s.addMember);
  const removeMember = useRosema((s) => s.removeMember);
  const openDirect = useRosema((s) => s.openDirect);
  const clearHistory = useRosema((s) => s.clearHistory);
  const deleteChat = useRosema((s) => s.deleteChat);
  const toggleBlock = useRosema((s) => s.toggleBlock);

  const [title, setTitle] = useState(chat.title);
  const [personId, setPersonId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const myId = session?.userId ?? "";
  const guest = Boolean(session?.guest);
  const name = chatTitle(chat, users, myId);
  const peer = chat.type === "direct" && !chat.saved ? userById(users, chat.memberIds.find((id) => id !== myId) ?? "") : undefined;
  const person = personId ? userById(users, personId) : undefined;
  const photos = messages.filter((message) => message.chatId === chat.id && message.image && message.state !== "deleted");
  const canManage = chat.type === "group" && !guest;
  const isAdmin = chat.adminId === myId;
  const candidates = users.filter((user) => user.id !== myId && !chat.memberIds.includes(user.id));

  useEffect(() => {
    setTitle(chat.title);
    setPersonId(null);
    setAdding(false);
    setNote(null);
  }, [chat.id, chat.title]);

  return (
    <>
      <div className="flex h-14 shrink-0 items-center justify-between px-2">
        <p className="px-2 font-medium">{chat.type === "direct" ? "Информация" : "Настройки"}</p>
        <button type="button" className="grid size-11 place-items-center" aria-label="Закрыть" onClick={onClose}>
          <X className="size-4" />
        </button>
      </div>
      <div className="scroll min-h-0 flex-1 overflow-y-auto">
        <div className="flex flex-col items-center px-4 pt-2 pb-4 text-center">
          <Avatar name={name} kind={chat.saved ? "saved" : chat.type} large />
          {chat.type === "group" && !guest ? (
            <input
              value={title}
              aria-label="Название беседы"
              onChange={(event) => setTitle(event.target.value)}
              onBlur={() => {
                const result = renameChat(chat.id, title);
                if (!result.ok) setNote(result.error);
              }}
              className="mt-3 w-full bg-transparent text-center text-lg font-semibold outline-none"
            />
          ) : (
            <p className="mt-3 text-lg font-semibold">{name}</p>
          )}
          <p className="text-sm text-muted">
            {chat.saved
              ? "Заметки себе"
              : chat.type === "channel"
                ? "Канал"
                : chat.type === "group"
                  ? peopleCount(chat.memberIds.length)
                  : peer
                    ? `@${peer.username}`
                    : "Личная переписка"}
          </p>
          {peer?.about ? <p className="mt-2 max-w-full text-sm text-muted">{peer.about}</p> : null}
        </div>

        <div className="border-t border-line px-4">
          <SwitchRow label={chat.pinned ? "Закреплён" : "Закрепить"} on={Boolean(chat.pinned)} onClick={() => togglePin(chat.id)} />
          <SwitchRow label={chat.muted ? "Без звука" : "Уведомления"} on={!chat.muted} onClick={() => toggleMute(chat.id)} />
        </div>

        {chat.type !== "direct" ? (
          <section className="border-t border-line px-2 py-2">
            <div className="flex items-center justify-between px-2 py-2">
              <p className="text-sm text-rose">{peopleCount(chat.memberIds.length)}</p>
              {canManage ? (
                <button type="button" className="grid size-9 place-items-center text-rose" aria-label="Добавить участника" onClick={() => setAdding((value) => !value)}>
                  <UserPlus className="size-4" />
                </button>
              ) : null}
            </div>
            {adding ? (
              <ul className="mb-2">
                {candidates.length === 0 ? <li className="px-2 py-2 text-sm text-muted">Добавлять некого</li> : null}
                {candidates.map((user) => (
                  <li key={user.id}>
                    <button
                      type="button"
                      className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-surface-2"
                      onClick={() => {
                        const result = addMember(chat.id, user.id);
                        if (!result.ok) setNote(result.error);
                        else setAdding(false);
                      }}
                    >
                      <Avatar name={user.displayName} />
                      <span className="min-w-0">
                        <span className="block truncate">{user.displayName}</span>
                        <span className="block text-xs text-muted">@{user.username}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
            <ul>
              {chat.memberIds.map((id) => {
                const user = userById(users, id);
                if (!user) return null;
                return (
                  <li key={id}>
                    <button
                      type="button"
                      className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-surface-2"
                      onClick={() => setPersonId(id)}
                    >
                      <Avatar name={user.displayName} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate">{user.displayName}</span>
                        <span className="block truncate text-xs text-muted">
                          {id === myId ? "вы" : `@${user.username}`}
                          {chat.adminId === id ? " · админ" : ""}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}

        <section className="border-t border-line px-4 py-3">
          <p className="mb-2 flex items-center gap-2 text-sm text-muted">
            <ImageIcon className="size-4" />
            Медиа
            <span>{photos.length}</span>
          </p>
          {photos.length > 0 ? (
            <div className="grid grid-cols-3 gap-1">
              {photos.map((message) => (
                <img key={message.id} src={message.image} alt="" className="aspect-square w-full rounded-md object-cover" />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted">Фото из переписки появятся здесь.</p>
          )}
        </section>

        {!guest ? (
          <div className="border-t border-line px-4">
            <SwitchRow label="Учебный сбой сети" on={simulateFailure} onClick={() => setSimulateFailure(!simulateFailure)} />
            {simulateFailure ? <p className="pb-3 text-xs text-warn">Следующее сообщение не уйдёт. Выключите сбой и нажмите «Повторить».</p> : null}
          </div>
        ) : null}

        {canManage ? (
          <button
            type="button"
            className="h-12 w-full border-t border-line px-4 text-left text-warn"
            onClick={() => {
              removeMember(chat.id, myId);
              onClose();
            }}
          >
            Покинуть беседу
          </button>
        ) : null}
        {!chat.saved && !guest ? (
          <div className="border-t border-line">
            <button type="button" className="h-12 w-full px-4 text-left text-sm" onClick={() => clearHistory(chat.id)}>
              Очистить историю
            </button>
            {chat.type === "direct" ? (
              <button type="button" className="h-12 w-full px-4 text-left text-sm" onClick={() => toggleBlock(chat.id)}>
                {chat.blocked ? "Разблокировать" : "Заблокировать"}
              </button>
            ) : null}
            <button
              type="button"
              className="h-12 w-full px-4 text-left text-sm text-warn"
              onClick={() => {
                deleteChat(chat.id);
                onClose();
              }}
            >
              Удалить чат
            </button>
          </div>
        ) : null}
        {note ? <p className="px-4 py-2 text-sm text-warn">{note}</p> : null}
      </div>

      {person ? (
        <div className="absolute inset-0 z-10 flex flex-col bg-surface">
          <div className="flex h-14 items-center justify-between px-2">
            <p className="px-2 font-medium">Участник</p>
            <button type="button" className="grid size-11 place-items-center" aria-label="Назад к беседе" onClick={() => setPersonId(null)}>
              <X className="size-4" />
            </button>
          </div>
          <div className="flex flex-col items-center px-4 pt-4 text-center">
            <Avatar name={person.displayName} large />
            <p className="mt-3 text-lg font-semibold">{person.displayName}</p>
            <p className="text-sm text-muted">@{person.username}</p>
            {person.about ? <p className="mt-3 text-sm">{person.about}</p> : null}
            {person.role === "admin" ? <p className="mt-1 text-xs text-muted">Преподаватель</p> : null}
          </div>
          {person.id !== myId && !guest ? (
            <div className="mt-6 grid gap-2 px-4">
              <button
                type="button"
                className="h-11 rounded-lg bg-rose text-sm text-on-rose"
                onClick={() => {
                  const result = openDirect(person.id);
                  if (!result.ok) setNote(result.error);
                  else onClose();
                }}
              >
                Написать
              </button>
              {isAdmin && chat.type === "group" ? (
                <button
                  type="button"
                  className="h-11 rounded-lg text-sm text-warn"
                  onClick={() => {
                    const result = removeMember(chat.id, person.id);
                    if (!result.ok) setNote(result.error);
                    setPersonId(null);
                  }}
                >
                  Убрать из беседы
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </>
  );
}

function SwitchRow({ label, on, onClick }: { label: string; on: boolean; onClick: () => void }) {
  return (
    <button type="button" className="flex h-12 w-full items-center justify-between gap-3 text-left text-sm" aria-pressed={on} onClick={onClick}>
      <span>{label}</span>
      <span className={cn("flex h-6 w-11 shrink-0 rounded-full p-0.5", on ? "justify-end bg-rose" : "justify-start bg-surface-2")}>
        <span className="size-5 rounded-full bg-white" />
      </span>
    </button>
  );
}

function ChatListMenu({
  chat,
  x,
  y,
  onClose,
  onPin,
  onMute,
  onArchive,
  onUnread,
  onClear,
  onDelete,
}: {
  chat?: Chat;
  x: number;
  y: number;
  onClose: () => void;
  onPin: () => void;
  onMute: () => void;
  onArchive: () => void;
  onUnread: () => void;
  onClear: () => void;
  onDelete: () => void;
}) {
  if (!chat) return null;
  const left = Math.min(x, window.innerWidth - 220);
  const top = Math.min(y, window.innerHeight - 280);
  return (
    <div
      className="fixed inset-0 z-50"
      onMouseDown={(event) => {
        if (event.button === 0) onClose();
      }}
      onContextMenu={(event) => event.preventDefault()}
    >
      <div
        className="menu-card absolute"
        style={{ left, top }}
        onMouseDown={(event) => event.stopPropagation()}
        onClick={(event) => event.stopPropagation()}
      >
        <button type="button" className="menu-row" onClick={onPin}>
          {chat.pinned ? "Открепить" : "Закрепить"}
          <Pin className="size-4" />
        </button>
        <button type="button" className="menu-row" onClick={onMute}>
          {chat.muted ? "Включить звук" : "Без звука"}
          <BellOff className="size-4" />
        </button>
        <button type="button" className="menu-row" onClick={onArchive}>
          {chat.archived ? "Вернуть из архива" : "В архив"}
          <Archive className="size-4" />
        </button>
        <button type="button" className="menu-row" onClick={onUnread}>
          Пометить непрочитанным
        </button>
        <button type="button" className="menu-row" onClick={onClear}>
          Очистить историю
        </button>
        {!chat.saved ? (
          <button type="button" className="menu-row text-warn" onClick={onDelete}>
            Удалить чат
            <Trash2 className="size-4" />
          </button>
        ) : null}
      </div>
    </div>
  );
}

function ChatRow({
  chat,
  active,
  title,
  preview,
  accent,
  stamp,
  unread,
  onOpen,
  onMenu,
}: {
  chat: Chat;
  active: boolean;
  title: string;
  preview: string;
  accent: boolean;
  stamp: string;
  unread: number;
  onOpen: () => void;
  onMenu: (x: number, y: number) => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={(event) => {
          if (event.button !== 0) return;
          onOpen();
        }}
        onContextMenu={(event) => {
          event.preventDefault();
          onMenu(event.clientX, event.clientY);
        }}
        onPointerDown={(event) => {
          if (event.pointerType === "mouse") return;
          const x = event.clientX;
          const y = event.clientY;
          const timer = window.setTimeout(() => onMenu(x, y), 450);
          const clear = () => window.clearTimeout(timer);
          event.currentTarget.addEventListener("pointerup", clear, { once: true });
          event.currentTarget.addEventListener("pointercancel", clear, { once: true });
        }}
        className={cn("chat-row", active && "chat-active")}
      >
        <Avatar name={title} kind={chat.saved ? "saved" : chat.type} />
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline justify-between gap-2">
            <span className="flex min-w-0 items-center gap-1">
              {chat.pinned ? <Pin className="size-3 shrink-0" aria-label="Закреплён" /> : null}
              {chat.muted ? <BellOff className="size-3 shrink-0" aria-label="Без звука" /> : null}
              <span className="row-title">{chat.secret ? "🔒 " : ""}{title}</span>
            </span>
            {stamp ? <span className={cn("row-time", unread > 0 && !active && "text-rose")}>{stamp}</span> : null}
          </span>
          <span className="mt-0.5 flex items-center justify-between gap-2">
            <span className={cn("row-preview", accent ? "row-accent" : "row-meta text-muted")}>{preview}</span>
            {unread > 0 ? (
              <span
                className={cn(
                  "grid h-5 min-w-5 place-items-center rounded-full px-1 text-xs text-on-rose",
                  chat.muted ? "bg-muted" : "bg-rose",
                )}
              >
                {unread}
              </span>
            ) : null}
          </span>
        </span>
      </button>
    </li>
  );
}

function Avatar({ name, kind = "direct", large = false }: { name: string; kind?: Chat["type"] | "saved"; large?: boolean }) {
  return (
    <span
      className={cn(
        "grid shrink-0 place-items-center rounded-full font-medium text-white",
        large ? "size-24 text-3xl" : "size-12 text-sm",
      )}
      style={{ background: kind === "saved" ? "#3390ec" : avatarColor(name) }}
    >
      {kind === "group" ? (
        <Users className={large ? "size-8" : "size-4"} aria-hidden />
      ) : kind === "channel" ? (
        <Megaphone className={large ? "size-8" : "size-4"} aria-hidden />
      ) : kind === "saved" ? (
        <Bookmark className={large ? "size-8" : "size-4"} aria-hidden />
      ) : (
        initials(name)
      )}
    </span>
  );
}

function CallOverlay({ title, onEnd }: { title: string; onEnd: () => void }) {
  const [seconds, setSeconds] = useState(0);
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    const id = window.setInterval(() => setSeconds((value) => value + 1), 1000);
    return () => window.clearInterval(id);
  }, []);

  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");

  return (
    <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-bg px-6 text-center">
      <p className="text-sm text-muted">Учебный звонок · без сервера</p>
      <p className="mt-3 text-3xl font-semibold">{title}</p>
      <p className="mt-2 text-muted">
        {mm}:{ss}
      </p>
      <p className="mt-6 max-w-xs text-sm text-muted">
        Звук не передаётся. Это сценарий звонка из диаграммы, не WebRTC.
      </p>
      <div className="mt-10 flex flex-wrap justify-center gap-3">
        <button type="button" className="h-11 rounded-lg border border-line px-4 text-sm" onClick={() => setMuted((value) => !value)}>
          {muted ? "Микрофон выключен" : "Выключить микрофон"}
        </button>
        <button type="button" className="h-11 rounded-lg bg-rose px-4 text-sm text-on-rose" onClick={onEnd}>
          Завершить
        </button>
      </div>
    </div>
  );
}
