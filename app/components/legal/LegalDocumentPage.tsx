import Link from "next/link";
import type { ReactNode } from "react";
import { createTranslator } from "../../../lib/i18n/translate";
import { resolveRequestLocale } from "../../../lib/i18n/server";
import type { LegalPageSpec } from "../../../lib/legal/pageSpecs";
import { APP_ROUTES, MOBILE_BOTTOM_NAV_CONTENT_PAD_CLASS } from "../../lib/nav";
import UmtubaStackedLogo from "../brand/UmtubaStackedLogo";
import LegalDraftBanner from "./LegalDraftBanner";
import LegalRichText from "./LegalRichText";

type LegalDocumentPageProps = {
  spec: LegalPageSpec;
  children?: ReactNode;
};

export default async function LegalDocumentPage({
  spec,
  children,
}: LegalDocumentPageProps) {
  const { locale } = await resolveRequestLocale();
  const t = createTranslator(locale);

  return (
    <main
      className={`min-h-screen bg-[#050510] text-white ${MOBILE_BOTTOM_NAV_CONTENT_PAD_CLASS}`}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[radial-gradient(ellipse_at_top,_rgba(37,99,235,0.22),_transparent_65%)]" />

      <div className="relative mx-auto max-w-3xl px-5 py-10 sm:px-8 sm:py-14">
        <nav className="mb-10 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-white/55">
          <Link
            href={APP_ROUTES.home}
            aria-label="UMTUBA"
            className="watch-focus-ring rounded-md"
          >
            <UmtubaStackedLogo size="legal" />
          </Link>
        </nav>

        <header className="space-y-4 border-b border-white/10 pb-8">
          <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-blue-300/90">
            {t("legal.eyebrow")}
          </p>
          <h1 className="font-serif text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            {t(spec.titleKey)}
          </h1>
          <dl className="grid gap-2 text-sm text-white/50 sm:grid-cols-2">
            <div>
              <dt className="inline text-white/35">
                {t("legal.lastUpdatedLabel")}{" "}
              </dt>
              <dd className="inline text-white/70">
                {t("legal.lastUpdatedValue")}
              </dd>
            </div>
            {spec.showEffective ? (
              <div>
                <dt className="inline text-white/35">
                  {t("legal.effectiveLabel")}{" "}
                </dt>
                <dd className="inline text-white/70">
                  {t("legal.effectiveValue")}
                </dd>
              </div>
            ) : null}
          </dl>
        </header>

        {spec.showDraftBanner ? (
          <LegalDraftBanner message={t("legal.draftBanner")} />
        ) : null}

        {locale !== "en" ? (
          <p className="mt-6 text-sm leading-6 text-white/50">
            {t("legal.translationDisclaimer")}
          </p>
        ) : null}

        <div className="mt-10 space-y-10">
          {spec.blocks.map((block, index) => {
            if (block.type === "h2") {
              return (
                <h2
                  key={`${block.id}-${index}`}
                  id={block.id}
                  className="scroll-mt-24 text-xl font-black tracking-tight text-white sm:text-2xl"
                >
                  {t(block.key)}
                </h2>
              );
            }
            if (block.type === "p" || block.type === "lead") {
              return (
                <p
                  key={`${block.key}-${index}`}
                  className={
                    block.type === "lead"
                      ? "text-[15px] font-semibold leading-7 text-white/80"
                      : "text-[15px] leading-7 text-white/70"
                  }
                >
                  <LegalRichText text={t(block.key)} />
                </p>
              );
            }
            if (block.type === "list") {
              return (
                <ul
                  key={`list-${index}`}
                  className="list-disc space-y-2 ps-5 text-[15px] leading-7 text-white/70"
                >
                  {block.keys.map((key) => (
                    <li key={key}>
                      <LegalRichText text={t(key)} />
                    </li>
                  ))}
                </ul>
              );
            }
            return (
              <div key={`table-${index}`} className="overflow-x-auto">
                <table className="w-full min-w-[28rem] border-collapse text-start text-sm text-white/70">
                  <thead>
                    <tr className="border-b border-white/15 text-white/80">
                      <th className="px-3 py-2 font-semibold">
                        {t(block.table.headers[0])}
                      </th>
                      <th className="px-3 py-2 font-semibold">
                        {t(block.table.headers[1])}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {block.table.rows.map((row, rowIndex) => (
                      <tr
                        key={`${row[0]}-${rowIndex}`}
                        className="border-b border-white/10"
                      >
                        <td className="px-3 py-2 align-top">
                          <LegalRichText text={t(row[0])} />
                        </td>
                        <td className="px-3 py-2 align-top">
                          <LegalRichText text={t(row[1])} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>

        {children}
      </div>
    </main>
  );
}
