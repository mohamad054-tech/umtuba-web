"use client";

import { useState, useTransition } from "react";
import type { InstructorAuthoringResult } from "../../../../lib/learning/instructorAuthoring";
import { resetInstructorActionForm } from "../../../../lib/learning/instructorActionForm";

type Props = {
  action: (formData: FormData) => Promise<InstructorAuthoringResult>;
  children: React.ReactNode;
  className?: string;
  successMessage?: string;
  submitLabel?: string;
};

export default function InstructorActionForm({
  action,
  children,
  className,
  successMessage = "Saved.",
  submitLabel = "Submit",
}: Props) {
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <form
      className={className}
      onSubmit={(event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const formData = new FormData(form);
        setMessage(null);
        startTransition(async () => {
          const result = await action(formData);
          if (result.ok) {
            setIsError(false);
            setMessage(successMessage);
            resetInstructorActionForm(form);
          } else {
            setIsError(true);
            setMessage(result.message);
          }
        });
      }}
    >
      {children}
      <div className="mt-2 flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="watch-focus-ring rounded-lg bg-white px-3 py-1.5 text-sm font-bold text-black disabled:opacity-50"
        >
          {pending ? "Working…" : submitLabel}
        </button>
        {message ? (
          <p
            className={`text-sm ${isError ? "text-rose-300" : "text-emerald-300"}`}
            role="status"
          >
            {message}
          </p>
        ) : null}
      </div>
    </form>
  );
}
