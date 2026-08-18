"use client";

import type { ReactNode } from "react";
import { useTranslation } from "../i18n";
import StoreShell from "./StoreShell";

export default function StoreLocalizedLoading({
  children,
}: {
  children: ReactNode;
}) {
  const { t } = useTranslation();
  return (
    <StoreShell title={t("store.shell.title")} subtitle={t("store.shell.loading")}>
      {children}
    </StoreShell>
  );
}
