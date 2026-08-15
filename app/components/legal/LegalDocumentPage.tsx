import Link from "next/link";
import { APP_ROUTES, MOBILE_BOTTOM_NAV_CONTENT_PAD_CLASS } from "../../lib/nav";
import {
  LEGAL_BETA_NOTICE,
  LEGAL_EFFECTIVE_DATE,
  LEGAL_LAST_UPDATED,
  type LegalSection,
} from "../../../lib/legal/legalDocuments";

type LegalDocumentPageProps = {
  title: string;
  description: string;
  sections: LegalSection[];
};

export default function LegalDocumentPage({
  title,
  description,
  sections,
}: LegalDocumentPageProps) {
  return (
    <main
      className={`min-h-screen bg-[#050510] text-white ${MOBILE_BOTTOM_NAV_CONTENT_PAD_CLASS}`}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[radial-gradient(ellipse_at_top,_rgba(37,99,235,0.22),_transparent_65%)]" />

      <div className="relative mx-auto max-w-3xl px-5 py-10 sm:px-8 sm:py-14">
        <nav className="mb-10 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-white/55">
          <Link
            href={APP_ROUTES.home}
            className="watch-focus-ring rounded-full font-black tracking-tight text-white transition hover:text-white/85"
          >
            UMTUBA
          </Link>
          <span aria-hidden="true" className="text-white/25">
            /
          </span>
          <Link
            href={APP_ROUTES.terms}
            className="watch-focus-ring rounded underline-offset-4 transition hover:text-white hover:underline"
          >
            Terms
          </Link>
          <Link
            href={APP_ROUTES.privacy}
            className="watch-focus-ring rounded underline-offset-4 transition hover:text-white hover:underline"
          >
            Privacy
          </Link>
          <Link
            href={APP_ROUTES.accountDeletion}
            className="watch-focus-ring rounded underline-offset-4 transition hover:text-white hover:underline"
          >
            Delete account
          </Link>
        </nav>

        <header className="space-y-4 border-b border-white/10 pb-8">
          <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-blue-300/90">
            Legal
          </p>
          <h1 className="font-serif text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            {title}
          </h1>
          <p className="max-w-2xl text-base leading-7 text-white/65">
            {description}
          </p>
          <dl className="grid gap-2 text-sm text-white/50 sm:grid-cols-2">
            <div>
              <dt className="inline text-white/35">Effective date: </dt>
              <dd className="inline text-white/70">{LEGAL_EFFECTIVE_DATE}</dd>
            </div>
            <div>
              <dt className="inline text-white/35">Last updated: </dt>
              <dd className="inline text-white/70">{LEGAL_LAST_UPDATED}</dd>
            </div>
          </dl>
        </header>

        <aside
          className="mt-8 rounded-2xl border border-amber-300/25 bg-amber-400/[0.07] px-4 py-4 text-sm leading-6 text-amber-50/90"
          role="note"
        >
          {LEGAL_BETA_NOTICE}
        </aside>

        <div className="mt-10 space-y-10">
          {sections.map((section) => (
            <section
              key={section.id}
              id={section.id}
              className="scroll-mt-24 space-y-3"
            >
              <h2 className="text-xl font-black tracking-tight text-white sm:text-2xl">
                {section.title}
              </h2>
              {section.paragraphs.map((paragraph, index) => (
                <p
                  key={`${section.id}-p-${index}`}
                  className="text-[15px] leading-7 text-white/70"
                >
                  {paragraph}
                </p>
              ))}
              {section.bullets && section.bullets.length > 0 ? (
                <ul className="list-disc space-y-2 pl-5 text-[15px] leading-7 text-white/70">
                  {section.bullets.map((item, index) => (
                    <li key={`${section.id}-b-${index}`}>{item}</li>
                  ))}
                </ul>
              ) : null}
              {section.closingParagraphs?.map((paragraph, index) => (
                <p
                  key={`${section.id}-c-${index}`}
                  className="text-[15px] leading-7 text-white/70"
                >
                  {paragraph}
                </p>
              ))}
            </section>
          ))}
        </div>

        <footer className="mt-14 border-t border-white/10 pt-8 text-sm text-white/45">
          <p>
            Related:{" "}
            <Link
              href={APP_ROUTES.terms}
              className="watch-focus-ring rounded text-white/75 underline-offset-4 hover:underline"
            >
              Terms of Use
            </Link>
            {" · "}
            <Link
              href={APP_ROUTES.privacy}
              className="watch-focus-ring rounded text-white/75 underline-offset-4 hover:underline"
            >
              Privacy Policy
            </Link>
            {" · "}
            <Link
              href={APP_ROUTES.accountDeletion}
              className="watch-focus-ring rounded text-white/75 underline-offset-4 hover:underline"
            >
              Delete your account
            </Link>
          </p>
        </footer>
      </div>
    </main>
  );
}
