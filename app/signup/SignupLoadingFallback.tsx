"use client";

import { AuthShell } from "../components/auth";
import { useTranslation } from "../components/i18n";

export default function SignupLoadingFallback() {
  const { t } = useTranslation();

  return (
    <AuthShell
      title={t("auth.signup.loadingTitle")}
      subtitle={t("auth.signup.loadingSubtitle")}
    >
      <p className="text-sm text-white/50">{t("auth.signup.preparing")}</p>
    </AuthShell>
  );
}
