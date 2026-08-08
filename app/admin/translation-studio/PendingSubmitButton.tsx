"use client";

/**
 * Submit button that disables while the parent form action is pending.
 */

import { useFormStatus } from "react-dom";
import type { ReactNode } from "react";

export default function PendingSubmitButton(props: {
  children: ReactNode;
  className?: string;
  pendingLabel?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className={
        props.className +
        (pending ? " opacity-60 cursor-not-allowed" : "")
      }
    >
      {pending ? props.pendingLabel ?? "Working…" : props.children}
    </button>
  );
}
