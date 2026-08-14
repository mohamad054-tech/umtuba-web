import Link from "next/link";
import { APP_ROUTES, MOBILE_BOTTOM_NAV_CONTENT_PAD_CLASS } from "../lib/nav";
import { supportMetadata } from "../../lib/site/routeMetadata";
import {
  SUPPORT_INTRO,
  SUPPORT_PAGE_DESCRIPTION,
  SUPPORT_PAGE_TITLE,
  SUPPORT_SECTIONS,
} from "../../lib/support/supportPage";

export const metadata = supportMetadata;

const ROUTE_BY_KEY = {
  accountDeletion: APP_ROUTES.accountDeletion,
  privacy: APP_ROUTES.privacy,
  terms: APP_ROUTES.terms,
  login: APP_ROUTES.login,
} as const;

export default function SupportPage() {
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
          <span className="text-white/80">Support</span>
          <Link
            href={APP_ROUTES.terms}
            className="watch-focus-ring ms-auto rounded underline-offset-4 transition hover:text-white hover:underline"
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
            Help · Public
          </p>
          <h1 className="font-serif text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            {SUPPORT_PAGE_TITLE}
          </h1>
          <p className="max-w-2xl text-base leading-7 text-white/65">
            {SUPPORT_PAGE_DESCRIPTION}
          </p>
        </header>

        <p className="mt-8 text-[15px] leading-7 text-white/70">{SUPPORT_INTRO}</p>

        <div className="mt-10 space-y-10">
          {SUPPORT_SECTIONS.map((section) => (
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
              {section.links.length > 0 ? (
                <ul className="mt-4 space-y-2">
                  {section.links.map((link) => (
                    <li key={`${section.id}-${link.hrefKey}-${link.label}`}>
                      <Link
                        href={ROUTE_BY_KEY[link.hrefKey]}
                        className="watch-focus-ring inline-flex rounded text-sm font-bold text-blue-200 underline-offset-4 transition hover:text-blue-100 hover:underline"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : null}
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
