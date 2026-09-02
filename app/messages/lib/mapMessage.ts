import type { Message, MessageReactionSummary } from "../types";
import { computeReceiptStatus } from "../types";
import { deletedMessagePlaceholder, replyPreviewText } from "./messagePermissions";

export type MessengerMessageRow = {
  id: string;
  conversation_id: string;
  sender_id: string | null;
  body: string | null;
  message_type: string;
  created_at: string;
  deleted_at: string | null;
  deleted_for?: string | null;
  edited_at?: string | null;
  reply_to_message_id?: string | null;
  client_id: string | null;
  visual_opened_at?: string | null;
  visual_expires_at?: string | null;
  visual_expiration_policy?: string | null;
};

export function mapMessengerMessageRow(
  row: MessengerMessageRow,
  currentUserId: string,
  options?: {
    replyById?: Map<string, MessengerMessageRow>;
    reactions?: MessageReactionSummary[];
    peerLastReadAt?: string | null;
    status?: Message["status"];
  }
): Message {
  const isDeleted = Boolean(row.deleted_at);
  const isMine = row.sender_id === currentUserId;
  const replyToId = row.reply_to_message_id ?? null;

  let replyPreview: Message["replyPreview"] = null;
  if (replyToId) {
    const target = options?.replyById?.get(replyToId);
    if (!target) {
      replyPreview = {
        messageId: replyToId,
        text: "Original message unavailable",
        senderId: null,
        unavailable: true,
      };
    } else {
      const preview = replyPreviewText({
        body: target.body,
        deletedAt: target.deleted_at,
      });
      replyPreview = {
        messageId: target.id,
        text: preview.text,
        senderId: target.sender_id,
        unavailable: preview.unavailable,
      };
    }
  }

  return {
    id: row.id,
    conversationId: row.conversation_id,
    senderId: row.sender_id ?? "system",
    text: isDeleted
      ? deletedMessagePlaceholder()
      : row.message_type !== "text" || !row.body
        ? row.body || `[${row.message_type}]`
        : row.body,
    sentAt: row.created_at,
    isMine,
    status: options?.status ?? "sent",
    clientId: row.client_id ?? undefined,
    messageType: row.message_type,
    replyToMessageId: replyToId,
    replyPreview,
    editedAt: row.edited_at ?? null,
    deletedAt: row.deleted_at,
    isDeleted,
    reactions: options?.reactions,
    visual:
      row.message_type === "image" || row.message_type === "video"
        ? {
            mediaType: row.message_type,
            caption: isDeleted ? null : row.body,
            viewed: Boolean(row.visual_opened_at),
            openedAt: row.visual_opened_at ?? null,
            expirationPolicy:
              row.visual_expiration_policy === "disappear_after_view"
                ? "disappear_after_view"
                : "view_once",
            previewUrl: null,
          }
        : null,
    receiptStatus: computeReceiptStatus({
      isMine,
      sentAt: row.created_at,
      peerLastReadAt: options?.peerLastReadAt,
      status: options?.status ?? "sent",
    }),
  };
}
