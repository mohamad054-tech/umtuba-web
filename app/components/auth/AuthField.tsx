"use client";

import { useId, useState, type InputHTMLAttributes, type ReactNode } from "react";

type AuthFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
  hint?: ReactNode;
  /** When true and type is password, show a reveal/hide control. */
  revealable?: boolean;
};

export default function AuthField({
  label,
  error,
  hint,
  id,
  className = "",
  revealable = false,
  type = "text",
  ...props
}: AuthFieldProps) {
  const generatedId = useId();
  const fieldId = id ?? props.name ?? generatedId;
  const [revealed, setRevealed] = useState(false);
  const isPassword = type === "password";
  const showReveal = revealable && isPassword;
  const inputType = showReveal && revealed ? "text" : type;

  return (
    <label className="block space-y-2">
      <span className="text-xs font-bold uppercase tracking-[0.16em] text-white/45">
        {label}
      </span>
      <span className="relative block">
        <input
          id={fieldId}
          type={inputType}
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={
            error ? `${fieldId}-error` : hint ? `${fieldId}-hint` : undefined
          }
          className={`w-full rounded-2xl border bg-black/40 p-4 outline-none transition placeholder:text-white/30 focus:border-blue-400/40 disabled:opacity-60 ${
            showReveal ? "pe-20" : ""
          } ${
            error
              ? "border-red-400/40 focus:border-red-400/50"
              : "border-white/10"
          } ${className}`}
          {...props}
        />
        {showReveal ? (
          <button
            type="button"
            tabIndex={0}
            className="watch-focus-ring absolute end-3 top-1/2 -translate-y-1/2 rounded-lg px-2 py-1 text-xs font-bold uppercase tracking-wide text-white/55 transition hover:text-white"
            onClick={() => setRevealed((prev) => !prev)}
            aria-pressed={revealed}
            aria-label={revealed ? "Hide password" : "Show password"}
          >
            {revealed ? "Hide" : "Show"}
          </button>
        ) : null}
      </span>
      {error ? (
        <span id={`${fieldId}-error`} className="block text-sm text-red-300">
          {error}
        </span>
      ) : null}
      {!error && hint ? (
        <span id={`${fieldId}-hint`} className="block text-sm text-white/45">
          {hint}
        </span>
      ) : null}
    </label>
  );
}
