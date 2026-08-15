import type { ReactNode } from "react";
import { learningDs } from "./tokens";
import { LearningCardShell } from "./LearningCardShell";

export function LearningStatePanel({
  title,
  children,
  tone = "neutral",
  action,
}: {
  title: string;
  children?: ReactNode;
  tone?: "neutral" | "danger";
  action?: ReactNode;
}) {
  const titleClass =
    tone === "danger" ? "text-rose-100" : "text-white/90";
  return (
    <LearningCardShell>
      <h3 className={`text-sm font-black ${titleClass}`}>{title}</h3>
      {children ? <div className={`mt-2 text-sm ${learningDs.muted}`}>{children}</div> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </LearningCardShell>
  );
}
