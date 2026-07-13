import type { ReactNode } from "react";

type AuthAlertProps = {
  tone?: "error" | "success" | "info";
  children: ReactNode;
};

const TONE_CLASS = {
  error: "border-red-400/30 bg-red-500/10 text-red-200",
  success: "border-emerald-400/30 bg-emerald-500/10 text-emerald-200",
  info: "border-blue-400/30 bg-blue-500/10 text-blue-100",
} as const;

export default function AuthAlert({
  tone = "error",
  children,
}: AuthAlertProps) {
  return (
    <p
      role="status"
      className={`rounded-2xl border px-4 py-3 text-sm ${TONE_CLASS[tone]}`}
    >
      {children}
    </p>
  );
}
