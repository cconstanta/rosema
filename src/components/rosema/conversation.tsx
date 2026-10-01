import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  AlertCircle,
  ArrowLeft,
  Bookmark,
  Check,
  CheckCheck,
  ChevronDown,
  Clock,
  Copy,
  Forward,
  ImagePlus,
  Info,
  ListChecks,
  Mic,
  Pencil,
  Phone,
  Pin,
  Plus,
  Reply,
  RotateCcw,
  Search,
  Send,
  SmilePlus,
  Trash2,
  X,
} from "lucide-react";
import {
  type Chat,
  type Message,
  type MsgState,
  type ReactionType,
  type User,
  MAX_TEXT,
  chatTitle,
  clock,
  dayKey,
  dayLabel,
  initials,
  listStamp,
  peopleCount,
  previewText,
  avatarColor,
  textParts,
  threadMessages,
  userById,
} from "@/lib/rosema/logic";
import { SCHEDULE_DELAY_MS } from "@/lib/rosema/constants";
import { useRosema } from "@/lib/rosema/store";
import { cn } from "@/lib/cn";

const QUICK = ["😀", "😁", "😂", "👍", "❤️", "🔥", "😢", "🎉", "🙏", "👀"];

function copyText(value: string): Promise<boolean> {
  const area = document.createElement("textarea");
  area.value = value;
  area.setAttribute("readonly", "");
  area.style.position = "fixed";
  area.style.top = "0";
  area.style.left = "0";
  area.style.opacity = "0";
  document.body.appendChild(area);
  area.focus();
  area.select();
  area.setSelectionRange(0, value.length);
  let command = false;
  try {
    command = document.execCommand("copy");
  } catch {
    command = false;
  }
  area.remove();
  if (command) return Promise.resolve(true);
  if (!navigator.clipboard?.writeText) return Promise.resolve(false);
  return navigator.clipboard.writeText(value).then(
    () => true,
    () => false,
  );
}

function splitHighlight(value: string, needle: string): { value: string; hit: boolean }[] {
  const lower = value.toLowerCase();
  const parts: { value: string; hit: boolean }[] = [];
  let from = 0;
  let at = lower.indexOf(needle);
  while (at >= 0) {
    if (at > from) parts.push({ value: value.slice(from, at), hit: false });
    parts.push({ value: value.slice(at, at + needle.length), hit: true });
    from = at + needle.length;
    at = lower.indexOf(needle, from);
  }
  if (from < value.length) parts.push({ value: value.slice(from), hit: false });
  return parts.length > 0 ? parts : [{ value, hit: false }];
}

const REACTIONS: { type: ReactionType; label: string; emoji: string }[] = [
  { type: "like", label: "Нравится", emoji: "👍" },
  { type: "heart", label: "Сердце", emoji: "❤️" },
  { type: "fire", label: "Огонь", emoji: "🔥" },
  { type: "laugh", label: "Смешно", emoji: "😁" },
];

function StatusIcon({ state }: { state: MsgState }) {
  if (state === "sending") return <Clock className="size-3.5" aria-label="Отправляется" />;
  if (state === "delivered") return <Check className="size-3.5" aria-label="Доставлено" />;
  if (state === "read") return <CheckCheck className="size-3.5" aria-label="Прочитано" />;
  if (state === "network_error") return <AlertCircle className="size-3.5" aria-label="Ошибка сети" />;
  return null;
}

export function Conversation({
  chat,
  onBack,
  onInfo,
  onCall,
}: {
  chat: Chat;
  onBack: () => void;
  onInfo: () => void;
  onCall: () => void;
}) {
  const users = useRosema((s) => s.users);
  const messages = useRosema((s) => s.messages);
  const session = useRosema((s) => s.session);
  const send = useRosema((s) => s.send);
  const editMessage = useRosema((s) => s.edit);
  const retry = useRosema((s) => s.retry);
  const removeMessage = useRosema((s) => s.removeMessage);
  const react = useRosema((s) => s.react);
  const keep = useRosema((s) => s.keep);
  const forward = useRosema((s) => s.forward);
  const pinMessage = useRosema((s) => s.pinMessage);
  const sendPoll = useRosema((s) => s.sendPoll);
  const vote = useRosema((s) => s.vote);
  const sendVoice = useRosema((s) => s.sendVoice);
  const sendSticker = useRosema((s) => s.sendSticker);
  const sendFile = useRosema((s) => s.sendFile);
  const scheduleSend = useRosema((s) => s.scheduleSend);
  const chats = useRosema((s) => s.chats);
  const setDraft = useRosema((s) => s.setDraft);
  const typing = useRosema((s) => s.typing);
  const [text, setText] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [replyId, setReplyId] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [findOpen, setFindOpen] = useState(false);
  const [find, setFind] = useState("");
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [image, setImage] = useState<string | null>(null);
  const [forwardId, setForwardId] = useState<string | null>(null);
  const [now, setNow] = useState<number | null>(null);
  const [away, setAway] = useState(false);
  const [freshIds, setFreshIds] = useState<string[]>([]);
  const [picks, setPicks] = useState<string[]>([]);
  const [pollOpen, setPollOpen] = useState(false);
  const [pollQ, setPollQ] = useState("");
  const [pollA, setPollA] = useState("");
  const [pollB, setPollB] = useState("");
  const [recording, setRecording] = useState(false);
  const [stickersOpen, setStickersOpen] = useState(false);
  const [attachOpen, setAttachOpen] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recordStarted = useRef(0);
  const endRef = useRef<HTMLDivElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const myId = session?.userId ?? "";
  const guest = Boolean(session?.guest);
  const thread = threadMessages(messages, chat.id).filter((item) => {
    if (item.scheduledFor && Date.parse(item.scheduledFor) > (now ?? Number.POSITIVE_INFINITY)) return false;
    if (item.expiresAt && now && Date.parse(item.expiresAt) <= now) return false;
    return true;
  });
  const title = chatTitle(chat, users, myId);
  const canWrite =
    !guest &&
    !chat.blocked &&
    (chat.type !== "channel" || chat.adminId === myId) &&
    (chat.type === "channel" || chat.memberIds.includes(myId));
  const replyTarget = replyId ? messages.find((item) => item.id === replyId) : undefined;
  const typingHere = typing?.chatId === chat.id ? userById(users, typing.userId) : undefined;

  useEffect(() => {
    const box = scrollerRef.current;
    if (!box) return;
    const near = box.scrollHeight - box.scrollTop - box.clientHeight < 180;
    const last = thread[thread.length - 1];
    if (near || last?.authorId === myId) endRef.current?.scrollIntoView({ block: "end" });
  }, [chat.id, myId, thread.length, thread[thread.length - 1]?.id, thread[thread.length - 1]?.state]);

  useEffect(() => {
    setSelectedId(null);
    setReplyId(null);
    setEditId(null);
    setFormError(null);
    setAway(false);
    setFind("");
    setFindOpen(false);
    setImage(null);
    setEmojiOpen(false);
    setForwardId(null);
    setPicks([]);
    setPollOpen(false);
    setText(useRosema.getState().drafts?.[chat.id] ?? "");
    setFreshIds(
      useRosema
        .getState()
        .messages.filter((item) => item.chatId === chat.id && item.authorId !== myId && item.state === "delivered")
        .map((item) => item.id),
    );
    requestAnimationFrame(() => endRef.current?.scrollIntoView({ block: "end" }));
  }, [chat.id, myId]);

  useEffect(() => {
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [chat.id]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 2200);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const peerId = chat.type === "direct" && !chat.saved ? chat.memberIds.find((id) => id !== myId) : undefined;
  let subtitle =
    chat.type === "channel"
      ? "канал"
      : chat.saved
        ? "заметки себе"
        : chat.type === "group"
          ? peopleCount(chat.memberIds.length)
        : chat.secret
          ? "секретный чат · минута"
          : "был(а) недавно";
  if (typingHere) {
    subtitle = chat.type === "group" ? `${typingHere.displayName} печатает…` : "печатает…";
  } else if (peerId) {
    const lastPeer = [...messages].reverse().find((item) => item.chatId === chat.id && item.authorId === peerId);
    if (lastPeer && now !== null && now - Date.parse(lastPeer.createdAt) < 120_000) subtitle = "в сети";
    else if (lastPeer) subtitle = `был(а) ${listStamp(lastPeer.createdAt)}`;
  }

  async function toggleRecord() {
    if (recording) {
      recorderRef.current?.stop();
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setFormError("Микрофон недоступен");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      rec.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.push(event.data);
      };
      rec.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        setRecording(false);
        const blob = new Blob(chunks, { type: rec.mimeType || "audio/webm" });
        if (blob.size > 500_000) {
          setFormError("Голосовое больше 500 КБ");
          return;
        }
        const seconds = Math.max(1, Math.round((Date.now() - recordStarted.current) / 1000));
        const reader = new FileReader();
        reader.onload = () => {
          if (typeof reader.result !== "string") return;
          const result = sendVoice(reader.result, seconds);
          if (!result.ok) setFormError(result.error);
        };
        reader.readAsDataURL(blob);
      };
      recorderRef.current = rec;
      recordStarted.current = Date.now();
      setRecording(true);
      rec.start();
    } catch {
      setFormError("Нет доступа к микрофону");
    }
  }

  function submit() {
    if (editId) {
      const result = editMessage(editId, text);
      if (!result.ok) {
        setFormError(result.error);
        return;
      }
      setEditId(null);
      setText(useRosema.getState().drafts?.[chat.id] ?? "");
      setFormError(null);
      return;
    }
    const result = send(text, replyId ?? undefined, image ?? undefined);
    if (!result.ok) {
      setFormError(result.error);
      return;
    }
    setText("");
    setImage(null);
    setReplyId(null);
    setEmojiOpen(false);
    setFormError(null);
  }

  function jump(id: string) {
    document.getElementById(`msg-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  let lastDay = "";
  const firstFresh = freshIds.find((id) => thread.some((item) => item.id === id));
  const needle = find.trim().toLowerCase();
  const shownThread = needle
    ? thread.filter((item) => item.text.toLowerCase().includes(needle))
    : thread;

  return (
    <div className="thread-pane relative flex flex-col overflow-hidden">
      <header className="thread-head flex h-14 shrink-0 items-center gap-2 px-2">
        <button type="button" className="grid size-11 place-items-center lg:hidden" aria-label="К списку чатов" onClick={onBack}>
          <ArrowLeft className="size-5" />
        </button>
        <span className="relative shrink-0">
          <span
            className="grid size-10 place-items-center rounded-full text-xs font-medium text-white"
            style={{ background: chat.saved ? "#3390ec" : avatarColor(title) }}
          >
            {chat.saved ? <Bookmark className="size-4" /> : initials(title)}
          </span>
          {subtitle === "в сети" || typingHere ? <span className="online-dot" /> : null}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{chat.secret ? "🔒 " : ""}{title}</p>
          <p className={cn("truncate text-xs", typingHere ? "text-rose" : "text-muted")}>{subtitle}</p>
        </div>
        {chat.type !== "channel" && !chat.saved && !guest ? (
          <button type="button" className="grid size-11 place-items-center" aria-label="Позвонить" onClick={onCall}>
            <Phone className="size-5" />
          </button>
        ) : null}
        <button type="button" className="grid size-11 place-items-center" aria-label="Поиск по чату" onClick={() => setFindOpen((value) => !value)}>
          <Search className="size-5" />
        </button>
        <button type="button" className="grid size-11 place-items-center" aria-label="О чате" onClick={onInfo}>
          <Info className="size-5" />
        </button>
      </header>
      {chat.pinnedMessageId ? (
        <button
          type="button"
          className="flex h-12 shrink-0 items-center gap-3 border-b border-line bg-surface px-4 text-left"
          onClick={() => jump(chat.pinnedMessageId!)}
        >
          <span className="h-8 w-0.5 rounded-full bg-rose" />
          <span className="min-w-0">
            <span className="block text-xs text-rose">Закреплённое сообщение</span>
            <span className="block truncate text-sm">
              {previewText(messages.find((item) => item.id === chat.pinnedMessageId))}
            </span>
          </span>
        </button>
      ) : null}
      {picks.length > 0 ? (
        <div className="flex h-12 shrink-0 items-center justify-between bg-surface px-3">
          <button type="button" className="text-sm text-rose" onClick={() => setPicks([])}>
            Отмена
          </button>
          <span className="text-sm">{picks.length}</span>
          <button
            type="button"
            className="text-sm text-warn"
            onClick={() => {
              for (const id of picks) removeMessage(id);
              setPicks([]);
            }}
          >
            Удалить
          </button>
          <button
            type="button"
            className="text-sm text-rose"
            onClick={() => {
              setForwardId(picks[0] ?? null);
            }}
          >
            Переслать
          </button>
        </div>
      ) : null}
      {findOpen ? (
        <div className="bg-surface px-3 pb-2">
          <input
            value={find}
            onChange={(event) => setFind(event.target.value)}
            placeholder="Найти в чате"
            className="h-10 w-full rounded-full border-0 bg-surface-2 px-4 text-base"
          />
        </div>
      ) : null}

      <div className="thread-well relative min-h-0 flex-1">
      <div
        ref={scrollerRef}
        className="thread-paper scroll absolute inset-0 space-y-1.5 overflow-y-auto px-4 py-3"
        onContextMenu={(event) => event.preventDefault()}
        onScroll={(event) => {
          const box = event.currentTarget;
          setAway(box.scrollHeight - box.scrollTop - box.clientHeight > 140);
        }}
      >
        {shownThread.map((message, index) => {
          const day = dayKey(message.createdAt);
          const showDay = day !== lastDay;
          lastDay = day;
          const previous = shownThread[index - 1];
          const stacked =
            !showDay &&
            previous?.authorId === message.authorId &&
            dayKey(previous.createdAt) === day;
          return (
            <div key={message.id}>
              {showDay ? (
                <p className="mb-3 text-center">
                  <span className="day-chip">{dayLabel(message.createdAt)}</span>
                </p>
              ) : null}
              {message.id === firstFresh ? <p className="unread-line">Непрочитанные сообщения</p> : null}
              {message.service ? (
                <p className="py-1 text-center text-xs text-muted">{message.text}</p>
              ) : (
              <Bubble
                message={message}
                mine={message.authorId === myId}
                myId={myId}
                showAuthor={chat.type === "group" && message.authorId !== myId && !stacked}
                author={userById(users, message.authorId)}
                reply={messages.find((item) => item.id === message.replyToId)}
                replyAuthor={
                  userById(users, messages.find((item) => item.id === message.replyToId)?.authorId)?.displayName
                }
                open={selectedId === message.id}
                picked={picks.includes(message.id)}
                onToggle={() => {
                  if (guest || message.state === "deleted" || message.state === "sending") return;
                  setSelectedId(message.id);
                }}
                onPress={() => {
                  if (picks.length === 0) return;
                  setPicks((current) =>
                    current.includes(message.id) ? current.filter((id) => id !== message.id) : [...current, message.id],
                  );
                }}
                onReact={(type) => {
                  const result = react(message.id, type);
                  if (!result.ok) setFormError(result.error);
                  else setSelectedId(null);
                }}
                onDelete={() => {
                  const result = removeMessage(message.id);
                  if (!result.ok) setFormError(result.error);
                  setSelectedId(null);
                }}
                onReply={() => {
                  setEditId(null);
                  setReplyId(message.id);
                  setSelectedId(null);
                }}
                onEdit={() => {
                  setReplyId(null);
                  setEditId(message.id);
                  setText(message.text);
                  setSelectedId(null);
                }}
                onCopy={() => {
                  const payload = message.text || (message.image ? "Фото" : "");
                  if (!payload) {
                    setFormError("Не удалось скопировать");
                    return;
                  }
                  void copyText(payload).then((ok) => {
                    if (!ok) {
                      setFormError("Не удалось скопировать");
                      return;
                    }
                    setNotice("Скопировано");
                    setSelectedId(null);
                  });
                }}
                onSave={() => {
                  const result = keep(message.id);
                  if (!result.ok) setFormError(result.error);
                  else setNotice("В избранном");
                  setSelectedId(null);
                }}
                onForward={() => setForwardId(message.id)}
                onPin={() => {
                  pinMessage(message.id);
                  setSelectedId(null);
                  setNotice(chat.pinnedMessageId === message.id ? "Откреплено" : "Закреплено");
                }}
                onPick={() => {
                  setPicks([message.id]);
                  setSelectedId(null);
                }}
                onVote={(option) => vote(message.id, option)}
                stacked={stacked}
                needle={needle}
                onJump={jump}
                onRetry={() => {
                  const result = retry(message.id);
                  if (!result.ok) setFormError(result.error);
                }}
              />
              )}
            </div>
          );
        })}
        <div ref={endRef} />
      </div>
      {away ? (
        <button
          type="button"
          className="absolute right-4 bottom-4 grid size-11 place-items-center rounded-full bg-surface text-fg shadow"
          aria-label="Вниз"
          onClick={() => endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" })}
        >
          <ChevronDown className="size-5" />
        </button>
      ) : null}
      </div>

      <form
        className="composer safe-bottom shrink-0 px-2 pt-2 pb-2"
        onSubmit={(event) => {
          event.preventDefault();
          if (canWrite) submit();
        }}
      >
        {replyTarget ? (
          <div className="mb-2 flex items-center gap-2 border-l-2 border-rose pl-2">
            <div className="min-w-0 flex-1">
              <p className="text-xs text-rose">{userById(users, replyTarget.authorId)?.displayName ?? "Сообщение"}</p>
              <p className="truncate text-sm text-muted">
                {replyTarget.state === "deleted" ? "Сообщение удалено" : replyTarget.text}
              </p>
            </div>
            <button type="button" className="grid size-11 place-items-center" aria-label="Отменить ответ" onClick={() => setReplyId(null)}>
              <X className="size-4" />
            </button>
          </div>
        ) : null}
        {editId ? (
          <div className="mb-2 flex items-center gap-2 border-l-2 border-rose pl-2">
            <p className="min-w-0 flex-1 text-sm text-rose">Изменение</p>
            <button
              type="button"
              className="grid size-11 place-items-center"
              aria-label="Отменить изменение"
              onClick={() => {
                setEditId(null);
                setText(useRosema.getState().drafts?.[chat.id] ?? "");
              }}
            >
              <X className="size-4" />
            </button>
          </div>
        ) : null}
        {formError ? (
          <p className="mb-2 text-sm text-warn" role="alert">
            {formError}
          </p>
        ) : null}
        <div className="flex items-end gap-1">
          <button
            type="button"
            className="grid size-11 shrink-0 place-items-center text-muted"
            aria-label="Вложения"
            disabled={!canWrite}
            onClick={() => {
              setAttachOpen((value) => !value);
              setEmojiOpen(false);
            }}
          >
            <Plus className={cn("size-6", attachOpen && "rotate-45")} />
          </button>
          <div className="relative min-w-0 flex-1">
            <textarea
              rows={1}
              value={text}
              disabled={!canWrite}
              placeholder={
                guest
                  ? "Гость только читает канал"
                  : chat.blocked
                    ? "Пользователь в чёрном списке"
                    : chat.type === "channel" && chat.adminId !== myId
                      ? "В канале пишет автор"
                      : "Сообщение"
              }
              className="composer-input disabled:opacity-70"
              onChange={(event) => {
                setText(event.target.value);
                setFormError(null);
                if (!editId) setDraft(chat.id, event.target.value);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  if (canWrite) submit();
                }
              }}
            />
            <button
              type="button"
              className="absolute right-1 bottom-1 grid size-9 place-items-center text-muted"
              aria-label="Эмодзи"
              disabled={!canWrite}
              onClick={() => {
                setEmojiOpen((value) => !value);
                setAttachOpen(false);
              }}
            >
              <SmilePlus className="size-5" />
            </button>
          </div>
          {text.trim() || image || editId ? (
            <button
              type="submit"
              className="send-btn"
              aria-label="Отправить"
              disabled={!canWrite || text.length > MAX_TEXT}
            >
              {editId ? <Check className="size-4" /> : <Send className="size-4" />}
            </button>
          ) : (
            <button
              type="button"
              className={cn("grid size-11 shrink-0 place-items-center", recording ? "text-warn" : "text-muted")}
              aria-label={recording ? "Остановить запись" : "Голосовое"}
              disabled={!canWrite}
              onClick={() => void toggleRecord()}
            >
              <Mic className="size-6" />
            </button>
          )}
        </div>
        {attachOpen && canWrite ? (
          <div className="attach-grid">
            <label className="attach-item">
              <span className="attach-ico" style={{ background: "#4fae4e" }}>
                <ImagePlus className="size-5" />
              </span>
              Фото
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.target.value = "";
                  if (!file) return;
                  if (file.size > 350_000) {
                    setFormError("Фото больше 350 КБ");
                    return;
                  }
                  const reader = new FileReader();
                  reader.onload = () => {
                    if (typeof reader.result === "string") setImage(reader.result);
                  };
                  reader.readAsDataURL(file);
                  setAttachOpen(false);
                }}
              />
            </label>
            <label className="attach-item">
              <span className="attach-ico" style={{ background: "#7c5cbf" }}>
                <span className="text-lg">📎</span>
              </span>
              Файл
              <input
                type="file"
                className="sr-only"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.target.value = "";
                  if (!file) return;
                  if (file.type.startsWith("image/")) {
                    if (file.size > 350_000) {
                      setFormError("Фото больше 350 КБ");
                      return;
                    }
                    const reader = new FileReader();
                    reader.onload = () => {
                      if (typeof reader.result === "string") setImage(reader.result);
                    };
                    reader.readAsDataURL(file);
                    setAttachOpen(false);
                    return;
                  }
                  const result = sendFile(file.name);
                  if (!result.ok) setFormError(result.error);
                  setAttachOpen(false);
                }}
              />
            </label>
            <button
              type="button"
              className="attach-item"
              onClick={() => {
                setPollOpen(true);
                setAttachOpen(false);
                setStickersOpen(false);
              }}
            >
              <span className="attach-ico" style={{ background: "#e39a4b" }}>
                <ListChecks className="size-5" />
              </span>
              Опрос
            </button>
            <button
              type="button"
              className="attach-item"
              onClick={() => {
                setStickersOpen(true);
                setAttachOpen(false);
                setPollOpen(false);
              }}
            >
              <span className="attach-ico" style={{ background: "#5ca6e0" }}>
                <span className="text-xl">🙂</span>
              </span>
              Стикер
            </button>
            <button
              type="button"
              className="attach-item"
              disabled={!text.trim()}
              onClick={() => {
                const result = scheduleSend(text, SCHEDULE_DELAY_MS);
                if (!result.ok) setFormError(result.error);
                else {
                  setText("");
                  setDraft(chat.id, "");
                  setNotice("Уйдёт через минуту");
                  setAttachOpen(false);
                }
              }}
            >
              <span className="attach-ico" style={{ background: "#df5e8a" }}>
                <Clock className="size-5" />
              </span>
              Позже
            </button>
          </div>
        ) : null}
        {stickersOpen && canWrite ? (
          <div className="mt-2 flex flex-wrap gap-1">
            {["😂", "🔥", "👍", "❤️", "🎉", "😭", "😎", "🤝", "💀", "🚀", "👀", "🫡"].map((sticker) => (
              <button
                key={sticker}
                type="button"
                className="grid size-11 place-items-center rounded-full text-2xl"
                onClick={() => {
                  const result = sendSticker(sticker);
                  if (!result.ok) setFormError(result.error);
                  else setStickersOpen(false);
                }}
              >
                {sticker}
              </button>
            ))}
          </div>
        ) : null}
        {recording ? <p className="mt-2 text-sm text-warn">Идёт запись… нажмите микрофон ещё раз</p> : null}
        {pollOpen && canWrite ? (
          <div className="mt-2 space-y-2">
            <input value={pollQ} onChange={(event) => setPollQ(event.target.value)} placeholder="Вопрос" className="h-10 w-full rounded-full border-0 bg-surface-2 px-4" />
            <input value={pollA} onChange={(event) => setPollA(event.target.value)} placeholder="Вариант 1" className="h-10 w-full rounded-full border-0 bg-surface-2 px-4" />
            <input value={pollB} onChange={(event) => setPollB(event.target.value)} placeholder="Вариант 2" className="h-10 w-full rounded-full border-0 bg-surface-2 px-4" />
            <button
              type="button"
              className="h-10 rounded-full bg-rose px-4 text-sm text-on-rose"
              onClick={() => {
                const result = sendPoll(pollQ, [pollA, pollB]);
                if (!result.ok) setFormError(result.error);
                else {
                  setPollOpen(false);
                  setPollQ("");
                  setPollA("");
                  setPollB("");
                }
              }}
            >
              Опубликовать опрос
            </button>
          </div>
        ) : null}
        {emojiOpen && canWrite ? (
          <div className="mt-2 flex flex-wrap gap-1">
            {QUICK.map((emoji) => (
              <button
                key={emoji}
                type="button"
                className="grid size-11 place-items-center rounded-full text-xl"
                onClick={() => setText((current) => current + emoji)}
              >
                {emoji}
              </button>
            ))}
          </div>
        ) : null}
        {image ? (
          <div className="mt-2 flex items-center gap-2">
            <img src={image} alt="" className="h-14 w-14 rounded-lg object-cover" />
            <button type="button" className="h-11 text-sm text-muted" onClick={() => setImage(null)}>
              Убрать фото
            </button>
          </div>
        ) : null}
        {text.length > 3200 ? (
          <p className={cn("mt-1 text-xs", text.length > MAX_TEXT ? "text-warn" : "text-muted")}>
            {text.length} / {MAX_TEXT}
          </p>
        ) : null}
      </form>
      {notice ? <p className="toast">{notice}</p> : null}
      {forwardId ? (
        <div className="absolute inset-0 z-30 flex items-end bg-black/45 p-3 sm:items-center sm:justify-center">
          <div className="max-h-[70%] w-full max-w-sm overflow-y-auto rounded-xl bg-surface p-2">
            <div className="flex items-center justify-between px-2">
              <p className="font-medium">Переслать</p>
              <button type="button" className="grid size-11 place-items-center" aria-label="Закрыть пересылку" onClick={() => setForwardId(null)}>
                <X className="size-4" />
              </button>
            </div>
            <ul>
              {chats
                .filter((item) => (item.type === "channel" ? item.adminId === myId : item.memberIds.includes(myId)))
                .map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      className="h-11 w-full rounded-lg px-3 text-left hover:bg-surface-2"
                      onClick={() => {
                        const ids = picks.length > 0 ? picks : [forwardId];
                        let failed = false;
                        for (const id of ids) {
                          const result = forward(id, item.id);
                          if (!result.ok) {
                            setFormError(result.error);
                            failed = true;
                            break;
                          }
                        }
                        if (!failed) setNotice(`Переслано: ${chatTitle(item, users, myId)}`);
                        setForwardId(null);
                        setSelectedId(null);
                        setPicks([]);
                      }}
                    >
                      {chatTitle(item, users, myId)}
                    </button>
                  </li>
                ))}
            </ul>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function MessageMenu({
  anchorId,
  mine,
  onClose,
  canReact,
  mineReaction,
  onReact,
  onReply,
  onCopy,
  onSave,
  onForward,
  onPin,
  onPick,
  onEdit,
  onDelete,
}: {
  anchorId: string;
  mine: boolean;
  onClose: () => void;
  canReact: boolean;
  mineReaction: ReactionType | undefined;
  onReact: (type: ReactionType) => void;
  onReply: () => void;
  onCopy: () => void;
  onSave: () => void;
  onForward: () => void;
  onPin: () => void;
  onPick: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  const [box, setBox] = useState<{ top: number; left: number; above: boolean } | null>(null);

  useEffect(() => {
    const place = () => {
      const el = document.getElementById(`msg-${anchorId}`)?.querySelector(".bubble") ?? document.getElementById(`msg-${anchorId}`);
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const menuW = 248;
      const menuH = 340;
      const above = rect.top > menuH;
      let left = mine ? rect.right - menuW : rect.left;
      left = Math.max(8, Math.min(left, window.innerWidth - menuW - 8));
      const top = above ? rect.top - 8 : rect.bottom + 8;
      setBox({ top, left, above });
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [anchorId, mine]);

  return (
    <>
      <button type="button" className="scrim" aria-label="Закрыть меню" onClick={onClose} />
      <div
        className="menu-float"
        style={box ? { top: box.top, left: box.left, transform: box.above ? "translateY(-100%)" : undefined } : { visibility: "hidden" }}
      >
        <div className="menu-card menu-pop">
          {canReact ? (
            <div className="no-bar flex gap-0.5 overflow-x-auto px-1.5 py-1.5">
              {REACTIONS.map((item) => (
                <button
                  key={item.type}
                  type="button"
                  aria-label={item.label}
                  aria-pressed={mineReaction === item.type}
                  className={cn("reaction-choice", mineReaction === item.type && "reaction-choice-on")}
                  onClick={() => onReact(item.type)}
                >
                  {item.emoji}
                </button>
              ))}
            </div>
          ) : null}
          <button type="button" className="menu-row" onClick={onReply}>
            Ответить
            <Reply className="size-4" />
          </button>
          <button type="button" className="menu-row" onClick={onCopy}>
            Копировать
            <Copy className="size-4" />
          </button>
          <button type="button" className="menu-row" onClick={onSave}>
            В избранное
            <Bookmark className="size-4" />
          </button>
          <button type="button" className="menu-row" onClick={onForward}>
            Переслать
            <Forward className="size-4" />
          </button>
          <button type="button" className="menu-row" onClick={onPin}>
            Закрепить
            <Pin className="size-4" />
          </button>
          <button type="button" className="menu-row" onClick={onPick}>
            Выбрать
            <Check className="size-4" />
          </button>
          {onEdit ? (
            <button type="button" className="menu-row" onClick={onEdit}>
              Изменить
              <Pencil className="size-4" />
            </button>
          ) : null}
          {onDelete ? (
            <button type="button" className="menu-row text-warn" onClick={onDelete}>
              Удалить
              <Trash2 className="size-4" />
            </button>
          ) : null}
        </div>
      </div>
    </>
  );
}

function Bubble({
  message,
  mine,
  myId,
  showAuthor,
  author,
  reply,
  replyAuthor,
  open,
  onToggle,
  onPress,
  onReact,
  onDelete,
  onReply,
  onEdit,
  onCopy,
  onSave,
  onForward,
  onPin,
  onPick,
  onVote,
  onJump,
  stacked,
  needle,
  onRetry,
  picked,
}: {
  message: Message;
  mine: boolean;
  myId: string;
  showAuthor: boolean;
  author: User | undefined;
  reply: Message | undefined;
  replyAuthor: string | undefined;
  open: boolean;
  onToggle: () => void;
  onPress: () => void;
  onReact: (type: ReactionType) => void;
  onDelete: () => void;
  onReply: () => void;
  onEdit: () => void;
  onCopy: () => void;
  onSave: () => void;
  onForward: () => void;
  onPin: () => void;
  onPick: () => void;
  onVote: (option: number) => void;
  onJump: (id: string) => void;
  stacked: boolean;
  needle: string;
  onRetry: () => void;
  picked: boolean;
}) {
  const deleted = message.state === "deleted";
  const canReact = !deleted && message.state !== "sending" && message.state !== "network_error";
  const mineReaction = message.reactions.find((reaction) => reaction.userId === myId)?.type;
  const counts = new Map<ReactionType, number>();
  for (const reaction of message.reactions) {
    counts.set(reaction.type, (counts.get(reaction.type) ?? 0) + 1);
  }
  const chips = REACTIONS.filter((item) => (counts.get(item.type) ?? 0) > 0);

  return (
    <div id={`msg-${message.id}`} className={cn("group flex", mine ? "justify-end" : "justify-start", chips.length > 0 && "mb-2", stacked && "msg-stack")}>
      <div className={cn("relative max-w-sm", mine ? "items-end" : "items-start")}>
        {showAuthor ? (
          <p className="mb-0.5 px-1 text-xs font-medium" style={{ color: avatarColor(author?.displayName ?? "Участник") }}>
            {author?.displayName ?? "Участник"}
          </p>
        ) : null}
        {open && !deleted && message.state !== "sending" && typeof document !== "undefined"
          ? createPortal(
              <MessageMenu
                anchorId={message.id}
                mine={mine}
                onClose={onToggle}
                canReact={canReact}
                mineReaction={mineReaction}
                onReact={onReact}
                onReply={onReply}
                onCopy={onCopy}
                onSave={onSave}
                onForward={onForward}
                onPin={onPin}
                onPick={onPick}
                onEdit={mine && canReact && !message.forwardedFrom ? onEdit : undefined}
                onDelete={mine && !deleted ? onDelete : undefined}
              />,
              document.body,
            )
          : null}
        <div className="relative">
          <button
            type="button"
            onClick={onPress}
            onContextMenu={(event) => {
              event.preventDefault();
              event.stopPropagation();
              if (deleted || message.state === "sending") return;
              onToggle();
            }}
            className={cn(
              "bubble block w-full",
              deleted ? "bubble-deleted" : mine ? "bubble-mine" : "bubble-theirs",
              open && "bubble-selected",
              picked && "bubble-selected",
              stacked && "bubble-continued",
            )}
          >
            {reply ? (
              <span
                className="quote"
                onClick={(event) => {
                  event.stopPropagation();
                  onJump(reply.id);
                }}
              >
                <span className="block text-xs font-medium text-rose">{replyAuthor ?? "Сообщение"}</span>
                <span className="block truncate text-xs opacity-80">
                  {reply.state === "deleted" ? "Сообщение удалено" : reply.text}
                </span>
              </span>
            ) : null}
            {message.image ? (
              <img src={message.image} alt="" className="mb-1 max-h-64 w-full rounded-lg object-cover" />
            ) : null}
            {message.forwardedFrom ? <p className="mb-1 text-xs text-rose">Переслано от {message.forwardedFrom}</p> : null}
            {message.sticker ? <p className="text-5xl leading-none">{message.sticker}</p> : null}
            {message.voice ? (
              <audio controls src={message.voice} className="h-8 max-w-full" />
            ) : null}
            {message.fileName && !message.voice && !message.sticker ? <p className="text-sm">📎 {message.fileName}</p> : null}
            {message.poll ? (
              <div className="mb-1 space-y-1">
                <p className="text-sm font-medium">{message.poll.question}</p>
                {message.poll.options.map((option, index) => {
                  const total = message.poll?.options.reduce((sum, item) => sum + item.voterIds.length, 0) ?? 0;
                  const mine = option.voterIds.includes(myId);
                  const width = total === 0 ? 0 : Math.round((option.voterIds.length / total) * 100);
                  return (
                    <div
                      key={option.text}
                      role="button"
                      className="relative h-8 w-full overflow-hidden rounded-md bg-black/10 text-left text-xs"
                      onClick={(event) => {
                        event.stopPropagation();
                        onVote(index);
                      }}
                    >
                      <span className="absolute inset-y-0 left-0 bg-rose/30" style={{ width: `${width}%` }} />
                      <span className="relative flex h-full items-center justify-between px-2">
                        <span>{mine ? "✓ " : ""}{option.text}</span>
                        <span>{option.voterIds.length}</span>
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : null}
            {message.poll || message.sticker || message.voice ? null : (
            <p className="text-sm leading-relaxed break-words whitespace-pre-wrap">
              {deleted
                ? "Сообщение удалено"
                : textParts(message.text).map((part, index) => {
                    const bits = needle && !part.href ? splitHighlight(part.value, needle) : [{ value: part.value, hit: false }];
                    const body = bits.map((bit, bitIndex) =>
                      bit.hit ? (
                        <mark key={bitIndex}>{bit.value}</mark>
                      ) : (
                        <span key={bitIndex}>{bit.value}</span>
                      ),
                    );
                    return part.href ? (
                      <span
                        key={index}
                        className="underline"
                        onClick={(event) => {
                          event.stopPropagation();
                          window.open(part.href, "_blank", "noopener,noreferrer");
                        }}
                      >
                        {part.value}
                      </span>
                    ) : (
                      <span key={index}>{body}</span>
                    );
                  })}
            </p>
            )}
            <span className="bubble-meta mt-0.5 flex items-center justify-end gap-1 text-xs">
              {message.edited ? <span>изменено</span> : null}
              <span>{clock(message.createdAt)}</span>
              {mine ? <StatusIcon state={message.state} /> : null}
            </span>
          </button>
          {chips.length > 0 ? (
            <div className={cn("absolute -bottom-3 flex gap-1", mine ? "left-1" : "left-1")}>
              {chips.map((item) => (
                <button
                  key={item.type}
                  type="button"
                  className={cn("reaction-chip", mineReaction === item.type && "reaction-chip-on")}
                  aria-label={item.label}
                  aria-pressed={mineReaction === item.type}
                  onClick={() => onReact(item.type)}
                >
                  <span>{item.emoji}</span>
                  <span>{counts.get(item.type)}</span>
                </button>
              ))}
            </div>
          ) : null}
        </div>
        {mine && message.state === "network_error" ? (
          <button type="button" className="mt-1 inline-flex h-11 items-center gap-1 text-sm text-warn" onClick={onRetry}>
            <RotateCcw className="size-4" />
            Не ушло — повторить
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function EmptyThread() {
  return (
    <div className="thread-pane thread-paper flex flex-col items-center justify-center px-8 text-center">
      <p className="text-lg font-medium">Выберите чат</p>
      <p className="mt-2 max-w-sm text-sm text-muted">
        Слева группа практики, личные переписки и канал. Новое имя — через регистрацию, чужое — через контакты.
      </p>
    </div>
  );
}
