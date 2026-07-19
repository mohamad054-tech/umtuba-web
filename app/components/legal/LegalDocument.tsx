import Link from "next/link";
import AppTopNav from "../AppTopNav";
import { APP_ROUTES, MOBILE_BOTTOM_NAV_CONTENT_PAD_CLASS } from "../../lib/nav";
import {
  LEGAL_DRAFT_BANNER,
  LEGAL_LAST_UPDATED,
  type LegalSection,
} from "../../../lib/legal/constants";

type LegalDocumentProps = {
  title: string;
  intro: string;
  sections: LegalSection[];
  otherHref: string;
  otherLabel: string;
};

export default function LegalDocument({
  title,
  intro,
  sections,
  otherHref,
  otherLabel,
}: LegalDocumentProps) {
  return (
    <main
      className={`min-h-screen bg-[#050510] text-white ${MOBILE_BOTTOM_NAV_CONTENT_PAD_CLASS}`}
      dir="ltr"
      lang="en"
    >
      <AppTopNav
        title={title}
        subtitle="Legal · Draft for counsel review"
        actions={
          <Link
            href={otherHref}
            className="watch-focus-ring rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-bold text-white/70 transition hover:bg-white/10 hover:text-white"
          >
            {otherLabel}
          </Link>
        }
      />

      <div className="mx-auto max-w-3xl px-4 py-8 md:px-6 md:py-12">
        <div
          role="status"
          className="rounded-2xl border border-amber-300/30 bg-amber-400/10 px-4 py-3 text-sm leading-6 text-amber-100"
        >
          <p className="font-black tracking-tight">Draft for legal review.</p>
          <p className="mt-1 text-amber-100/85">{LEGAL_DRAFT_BANNER}</p>
        </div>

        <header className="mt-8">
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-blue-300">
            UMTUBA Legal
          </p>
          <h1 className="mt-3 text-3xl font-black tracking-tight md:text-5xl">
            {title}
          </h1>
          <p className="mt-3 text-sm text-white/50">
            Last updated:{" "}
            <time dateTime={LEGAL_LAST_UPDATED}>{LEGAL_LAST_UPDATED}</time>
          </p>
          <p className="mt-6 text-base leading-8 text-white/70">{intro}</p>
        </header>

        <nav
          aria-label="Table of contents"
          className="mt-10 rounded-[28px] border border-white/10 bg-[#080816]/80 p-5 md:p-6"
        >
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-white/40">
            Contents
          </p>
          <ol className="mt-4 grid gap-2 sm:grid-cols-2">
            {sections.map((section, index) => (
              <li key={section.id}>
                <a
                  href={`#${section.id}`}
                  className="watch-focus-ring block rounded-xl px-2 py-1.5 text-sm text-white/75 transition hover:bg-white/5 hover:text-white"
                >
                  <span className="mr-2 text-white/35">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  {section.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="mt-10 space-y-10">
          {sections.map((section) => (
            <section
              key={section.id}
              id={section.id}
              className="scroll-mt-28"
            >
              <h2 className="text-xl font-black tracking-tight md:text-2xl">
                {section.title}
              </h2>
              <div className="mt-4 space-y-4 text-base leading-8 text-white/68">
                {section.paragraphs.map((paragraph, index) => (
                  <p key={`${section.id}-${index}`}>{paragraph}</p>
                ))}
              </div>
            </section>
          ))}
        </div>

        <footer className="mt-14 border-t border-white/10 pt-8 text-sm text-white/50">
          <p>
            Also read our{" "}
            <Link
              href={otherHref}
              className="font-bold text-blue-200 underline-offset-2 hover:underline"
            >
              {otherLabel}
            </Link>
            .
          </p>
          <p className="mt-3">
            <Link
              href={APP_ROUTES.home}
              className="font-bold text-white/70 underline-offset-2 hover:underline"
            >
              Back to UMTUBA home
            </Link>
          </p>
        </footer>
      </div>
    </main>
  );
}
