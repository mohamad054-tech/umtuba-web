import "./sandbox.css";
import Link from "next/link";
import type { ReactNode } from "react";
import type { AppLocale } from "../../../lib/i18n";
import { LanguageSelector } from "../i18n";
import { sandboxDirection, sandboxT } from "../../../lib/sandbox/i18n";
import { SANDBOX_PATH, SANDBOX_SECTIONS, sandboxHref } from "../../../lib/sandbox/paths";

type Props = {
  locale: AppLocale;
  currentPath: string;
  children: ReactNode;
};

const NAV: { href: string; key: Parameters<typeof sandboxT>[1] }[] = [
  { href: SANDBOX_PATH, key: "hub" },
  { href: sandboxHref("learning"), key: "learning" },
  { href: sandboxHref("learning/catalog"), key: "catalog" },
  { href: sandboxHref("learning/search"), key: "searchFilter" },
  { href: sandboxHref("learning/students"), key: "learningStudent" },
  { href: sandboxHref("learning/instructors"), key: "learningInstructor" },
  { href: sandboxHref("learning/admin"), key: "learningAdmin" },
  { href: sandboxHref("learning/partners"), key: "learningPartners" },
  { href: sandboxHref("learning/enrollment-models"), key: "enrollmentModels" },
  { href: sandboxHref("store"), key: "store" },
  { href: sandboxHref("store/cart"), key: "storeCart" },
  { href: sandboxHref("store/checkout"), key: "storeCheckout" },
  { href: sandboxHref("store/orders"), key: "storeOrders" },
  { href: sandboxHref("store/seller"), key: "storeSeller" },
  { href: sandboxHref("store/partners"), key: "storePartners" },
  { href: sandboxHref("commercial"), key: "commercial" },
  { href: sandboxHref("rights"), key: "rights" },
];

export default function SandboxShell({ locale, currentPath, children }: Props) {
  const dir = sandboxDirection(locale);
  const t = (key: Parameters<typeof sandboxT>[1]) => sandboxT(locale, key);

  return (
    <main className="sandbox-preview min-h-screen" dir={dir} lang={locale}>
      <div className="sx-shell mx-auto px-[var(--sx-pad,1rem)] py-6 sm:px-6 md:px-8">
        <p role="status" className="rounded-2xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-sm">
          <span className="sx-badge me-2">{t("badge")}</span>
          {t("banner")}
        </p>
        <header className="mt-6">
          <p className="text-[0.625rem] font-bold uppercase tracking-[0.28em] text-[var(--sx-accent)]">
            {t("synthetic")} · {t("notLive")} · {t("noPayment")}
          </p>
          <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
            <h1 className="text-3xl font-semibold tracking-tight">{t("title")}</h1>
            <LanguageSelector
              id="sandbox-language"
              variant="compact"
              tone="dark"
            />
          </div>
          <p className="mt-2 text-sm text-[var(--sx-muted)]">{t("subtitle")}</p>
        </header>
        <nav className="sx-nav mt-6" aria-label={t("title")}>
          {NAV.map((item) => {
            const current =
              item.href === SANDBOX_PATH
                ? currentPath === SANDBOX_PATH
                : currentPath === item.href || currentPath.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={current ? "page" : undefined}
              >
                {t(item.key)}
              </Link>
            );
          })}
        </nav>
        <div className="mt-8">{children}</div>
        {currentPath !== SANDBOX_PATH ? (
          <p className="mt-8 text-sm">
            <Link href={SANDBOX_PATH} className="text-[var(--sx-accent)] underline">
              {t("backHub")}
            </Link>
          </p>
        ) : null}
        <p className="mt-6 text-xs text-[var(--sx-faint)]">
          Sections: {SANDBOX_SECTIONS.length}. Public nav must not link here.
        </p>
      </div>
    </main>
  );
}
