export type ThemeId = "ink" | "day" | "rose" | "forest";

export type Person = {
  id: string;
  name: string;
  handle: string;
  about: string;
  status: string;
  hue: string;
};

export type ChatKind = "dm" | "group" | "saved";

export type Chat = {
  id: string;
  title: string;
  kind: ChatKind;
  memberIds: string[];
  pinned: boolean;
};

export type MediaKind = "text" | "image" | "voice" | "circle" | "sticker";

export type ReactionMap = Partial<Record<string, string[]>>;

export type Message = {
  id: string;
  chatId: string;
  authorId: string;
  text: string;
  kind: MediaKind;
  media?: string;
  duration?: number;
  replyTo?: string;
  reactions: ReactionMap;
  state: "sending" | "delivered" | "read";
  createdAt: number;
  edited?: boolean;
};

export type CallState = {
  peerId: string;
  phase: "ringing" | "live";
  startedAt: number;
  muted: boolean;
} | null;
