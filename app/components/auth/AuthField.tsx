import type { InputHTMLAttributes, ReactNode } from "react";

type AuthFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
  hint?: ReactNode;
};

export default function AuthField({
  label,
  error,
  hint,
  id,
  className = "",
  ...props
}: AuthFieldProps) {
  const fieldId = id ?? props.name;

  return (
    <label className="block space-y-2">
      <span className="text-xs font-bold uppercase tracking-[0.16em] text-white/45">
        {label}
      </span>
      <input
        id={fieldId}
        aria-invalid={Boolean(error) || undefined}
        aria-describedby={
          error ? `${fieldId}-error` : hint ? `${fieldId}-hint` : undefined
        }
        className={`w-full rounded-2xl border bg-black/40 p-4 outline-none transition placeholder:text-white/30 focus:border-blue-400/40 disabled:opacity-60 ${
          error
            ? "border-red-400/40 focus:border-red-400/50"
            : "border-white/10"
        } ${className}`}
        {...props}
      />
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
