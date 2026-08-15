"use client";

import { useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import CreatePostForm from "../create/post/CreatePostForm";

type CreatePostModalProps = {
  open: boolean;
  onClose: () => void;
};

function subscribeToNoop() {
  return () => {};
}

function getClientSnapshot() {
  return true;
}

function getServerSnapshot() {
  return false;
}

export default function CreatePostModal({
  open,
  onClose,
}: CreatePostModalProps) {
  const mounted = useSyncExternalStore(
    subscribeToNoop,
    getClientSnapshot,
    getServerSnapshot
  );

  if (!mounted || !open) {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center overflow-y-auto bg-black/80 p-4 max-sm:items-stretch max-sm:p-0">
      <CreatePostForm variant="modal" onClose={onClose} />
    </div>,
    document.body
  );
}
