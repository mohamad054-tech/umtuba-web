"use client";

import Link from "next/link";
import { useTranslation } from "../../components/i18n";
import { APP_ROUTES } from "../../lib/nav";

export default function DiscoverShellActions() {
  const { t } = useTranslation();

  return (
    <div className="flex items-center gap-2">
      <Link
        href={APP_ROUTES.welcome}
        className="watch-focus-ring hidden rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-bold text-white/80 transition hover:bg-white/10 sm:inline-flex"
      >
        {t("social.shell.welcome")}
      </Link>
      <Link
        href={APP_ROUTES.saved}
        className="watch-focus-ring rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-bold text-white/80 transition hover:bg-white/10"
      >
        {t("social.shell.saved")}
      </Link>
      <Link
        href={APP_ROUTES.createVideo}
        className="watch-focus-ring rounded-full border border-white/15 bg-white px-3 py-1.5 text-xs font-black text-black transition hover:bg-white/90"
      >
        {t("social.shell.upload")}
      </Link>
    </div>
  );
}
