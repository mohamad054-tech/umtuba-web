"use client";

import { useEffect } from "react";

export function FeedbackToast({
  message,
  onDismiss,
}: {
  message: string | null;
  onDismiss: () => void;
}) {
  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(onDismiss, 2200);
    return () => window.clearTimeout(timer);
  }, [message, onDismiss]);

  if (!message) return null;
  return (
    <div
      role="status"
      className="fixed inset-x-0 bottom-20 z-40 mx-auto w-fit rounded-full border border-violet-300/30 bg-[#12081f]/95 px-4 py-2 text-sm font-bold text-violet-50 shadow-2xl md:bottom-8"
    >
      {message}
    </div>
  );
}
