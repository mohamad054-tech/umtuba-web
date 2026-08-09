import type { ReactNode } from "react";
import { learningDs } from "./tokens";

export function LearningCardShell({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`${learningDs.cardRadius} ${learningDs.cardBorder} ${learningDs.cardBg} p-5 ${className}`}>
      {children}
    </section>
  );
}
