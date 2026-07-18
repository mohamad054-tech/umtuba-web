import type { Message } from "../types";

export function canEditMessage(message: Message, currentUserId: string): boolean {
  return (
    message.isMine &&
    message.senderId === currentUserId &&
    !message.isDeleted &&
    !message.deletedAt &&
    (message.messageType ?? "text") === "text" &&
    message.status !== "sending" &&
    message.status !== "failed" &&
    !message.id.startsWith("local-")
  );
}

export function canDeleteForEveryone(
  message: Message,
  currentUserId: string
): boolean {
  return (
    message.isMine &&
    message.senderId === currentUserId &&
    !message.isDeleted &&
    !message.deletedAt &&
    message.status !== "sending" &&
    message.status !== "failed" &&
    !message.id.startsWith("local-")
  );
}

export function canDeleteForMe(message: Message): boolean {
  return (
    message.status !== "sending" &&
    message.status !== "failed" &&
    !message.id.startsWith("local-")
  );
}

export function canReactToMessage(message: Message): boolean {
  return (
    !message.isDeleted &&
    !message.deletedAt &&
    message.status !== "sending" &&
    message.status !== "failed" &&
    !message.id.startsWith("local-")
  );
}

export function deletedMessagePlaceholder(): string {
  return "Message deleted";
}

export function replyPreviewText(input: {
  body: string | null;
  deletedAt: string | null;
}): { text: string; unavailable: boolean } {
  if (input.deletedAt) {
    return { text: deletedMessagePlaceholder(), unavailable: true };
  }

  const trimmed = (input.body ?? "").trim();
  if (!trimmed) {
    return { text: "Original message unavailable", unavailable: true };
  }

  return {
    text: trimmed.length > 120 ? `${trimmed.slice(0, 117)}…` : trimmed,
    unavailable: false,
  };
}
