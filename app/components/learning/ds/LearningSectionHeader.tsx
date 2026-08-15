import type { ReactNode } from "react";
import { learningDs } from "./tokens";

export function LearningSectionHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow?: string;
  title: string;
  description?: ReactNode;
}) {
  return (
    <header className="space-y-2">
      {eyebrow ? <p className={learningDs.label}>{eyebrow}</p> : null}
      <h2 className="text-xl font-black tracking-tight text-white md:text-2xl">{title}</h2>
      {description ? <div className={`text-sm ${learningDs.muted}`}>{description}</div> : null}
    </header>
  );
}
