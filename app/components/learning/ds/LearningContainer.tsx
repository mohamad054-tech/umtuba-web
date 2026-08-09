import type { ReactNode } from "react";
import { learningDs } from "./tokens";

export function LearningContainer({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`mx-auto w-full ${learningDs.pageMax} px-4 py-6 md:px-6 ${className}`}>
      {children}
    </div>
  );
}
