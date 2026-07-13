import { formatBubbleTime, type Message } from "../types";

type MessageBubbleProps = {
  message: Message;
};

export default function MessageBubble({ message }: MessageBubbleProps) {
  const statusLabel =
    message.status === "sending"
      ? "Sending…"
      : message.status === "failed"
        ? "Failed"
        : formatBubbleTime(message.sentAt);

  return (
    <div
      className={`flex ${message.isMine ? "justify-end" : "justify-start"}`}
    >
      <div
        className={`max-w-[85%] rounded-3xl px-4 py-3 md:max-w-[70%] ${
          message.isMine
            ? "rounded-br-lg bg-gradient-to-br from-blue-600 to-blue-500 text-white shadow-[0_8px_24px_rgba(37,99,235,0.25)]"
            : "rounded-bl-lg border border-white/10 bg-white/[0.06] text-white backdrop-blur"
        } ${message.status === "sending" ? "opacity-80" : ""} ${
          message.status === "failed" ? "ring-1 ring-red-400/50" : ""
        }`}
      >
        <p className="whitespace-pre-wrap text-sm leading-relaxed">
          {message.text}
        </p>
        <p
          className={`mt-1.5 text-[10px] font-medium ${
            message.status === "failed"
              ? "text-red-200"
              : message.isMine
                ? "text-white/70"
                : "text-white/40"
          }`}
        >
          {statusLabel}
        </p>
      </div>
    </div>
  );
}
