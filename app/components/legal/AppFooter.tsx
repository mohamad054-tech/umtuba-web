"use client";

import Link from "next/link";
import { LEGAL_COMPANY_LINE } from "../../../lib/legal/company";
import { LEGAL_FOOTER_NAV } from "../../../lib/legal/legalDocuments";
import { MOBILE_BOTTOM_NAV_CONTENT_PAD_CLASS } from "../../lib/nav";
import { useTranslation } from "../i18n";

export default function AppFooter() {
  const { t } = useTranslation();

  return (
    <footer
      className={`border-t border-white/10 bg-[#050510] text-sm text-white/45 ${MOBILE_BOTTOM_NAV_CONTENT_PAD_CLASS}`}
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-8 sm:px-8">
        <nav aria-label={t("legal.nav.about")}>
          <ul className="flex flex-wrap gap-x-4 gap-y-2">
            {LEGAL_FOOTER_NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="watch-focus-ring rounded text-white/70 underline-offset-4 hover:text-white hover:underline"
                >
                  {t(item.labelKey)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <p className="text-white/40">{LEGAL_COMPANY_LINE}</p>
      </div>
    </footer>
  );
}
