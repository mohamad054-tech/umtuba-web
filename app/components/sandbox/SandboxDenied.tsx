import Link from "next/link";
import type { AppLocale } from "../../../lib/i18n";
import { sandboxDirection, sandboxT } from "../../../lib/sandbox/i18n";
import { SANDBOX_PATH } from "../../../lib/sandbox/paths";
import { APP_ROUTES } from "../../lib/nav/routes";

export default function SandboxDenied({ locale }: { locale: AppLocale }) {
  const t = (key: Parameters<typeof sandboxT>[1]) => sandboxT(locale, key);
  const next = encodeURIComponent(SANDBOX_PATH);

  return (
    <main className="sandbox-preview min-h-screen" dir={sandboxDirection(locale)} lang={locale}>
      <div className="sx-shell mx-auto max-w-xl px-[var(--sx-pad,1rem)] py-16">
        <p className="sx-badge">{t("badge")}</p>
        <h1 className="mt-4 text-2xl font-semibold">{t("deniedTitle")}</h1>
        <p className="mt-3 text-sm text-[var(--sx-muted)]">{t("deniedBody")}</p>
        <p className="mt-6">
          <Link
            href={`${APP_ROUTES.login}?next=${next}`}
            className="inline-flex rounded-full border border-[var(--sx-accent)] px-4 py-2 text-sm text-[var(--sx-accent)]"
          >
            {t("signIn")}
          </Link>
        </p>
      </div>
    </main>
  );
}
