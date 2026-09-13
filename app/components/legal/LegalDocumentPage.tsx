import type { ReactNode } from "react";
import { MOBILE_BOTTOM_NAV_CONTENT_PAD_CLASS } from "../../lib/nav";
import {
  LEGAL_EFFECTIVE_DATE,
  LEGAL_LAST_UPDATED,
} from "../../../lib/legal/company";
import { LegalBody } from "./legalBody";
import LegalDraftBanner from "./LegalDraftBanner";
import LegalTranslationDisclaimer from "./LegalTranslationDisclaimer";

type LegalDocumentPageProps = {
  locale: string;
  title: string;
  description: string;
  body: string;
  showDraftBanner: boolean;
  draftBanner: string;
  translationDisclaimer: string;
  effectiveLabel: string;
  updatedLabel: string;
  children?: ReactNode;
};

export default function LegalDocumentPage({
  locale,
  title,
  description,
  body,
  showDraftBanner,
  draftBanner,
  translationDisclaimer,
  effectiveLabel,
  updatedLabel,
  children,
}: LegalDocumentPageProps) {
  return (
    <main
      className={`min-h-screen bg-[#050510] text-white ${MOBILE_BOTTOM_NAV_CONTENT_PAD_CLASS}`}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[radial-gradient(ellipse_at_top,_rgba(37,99,235,0.22),_transparent_65%)]" />

      <div className="relative mx-auto max-w-3xl px-5 py-10 sm:px-8 sm:py-14">
        <header className="space-y-4 border-b border-white/10 pb-8">
          <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-blue-300/90">
            UMTUBA
          </p>
          <h1 className="font-serif text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            {title}
          </h1>
          <p className="max-w-2xl text-base leading-7 text-white/65">
            {description}
          </p>
          <dl className="grid gap-2 text-sm text-white/50 sm:grid-cols-2">
            <div>
              <dt className="inline text-white/35">{effectiveLabel} </dt>
              <dd className="inline text-white/70">{LEGAL_EFFECTIVE_DATE}</dd>
            </div>
            <div>
              <dt className="inline text-white/35">{updatedLabel} </dt>
              <dd className="inline text-white/70">{LEGAL_LAST_UPDATED}</dd>
            </div>
          </dl>
          <LegalTranslationDisclaimer
            locale={locale}
            message={translationDisclaimer}
          />
        </header>

        {showDraftBanner ? <LegalDraftBanner message={draftBanner} /> : null}

        <LegalBody body={body} />

        {children}
      </div>
    </main>
  );
}
