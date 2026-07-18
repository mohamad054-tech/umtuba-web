import type { InputHTMLAttributes, ReactNode } from "react";

type AuthCheckboxProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type"
> & {
  label: ReactNode;
  error?: string;
};

export default function AuthCheckbox({
  label,
  error,
  id,
  className = "",
  ...props
}: AuthCheckboxProps) {
  const fieldId = id ?? props.name;
  const errorId = error && fieldId ? `${fieldId}-error` : undefined;

  return (
    <div className="space-y-2">
      <label
        htmlFor={fieldId}
        className="flex cursor-pointer items-start gap-3 text-sm text-white/70"
      >
        <input
          id={fieldId}
          type="checkbox"
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={errorId}
          className={`mt-0.5 h-4 w-4 shrink-0 rounded border-white/20 bg-black/40 accent-blue-400 ${className}`}
          {...props}
        />
        <span>{label}</span>
      </label>
      {error ? (
        <p id={errorId} className="text-sm text-red-300" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
