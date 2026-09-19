"use client";

import { createContext, useContext, type ReactNode } from "react";

const GameSlugContext = createContext<string | null>(null);

export function GameAnalyticsScope({
  slug,
  children,
}: {
  slug: string;
  children: ReactNode;
}) {
  return <GameSlugContext.Provider value={slug}>{children}</GameSlugContext.Provider>;
}

export function useGameAnalyticsSlug(): string | null {
  return useContext(GameSlugContext);
}
