"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "../i18n";
import { APP_ROUTES } from "../../lib/nav";
import { COMPANY_LEGAL_NAME } from "../../../lib/legal/company";
import type { TranslationKey } from "../../../lib/i18n/messages/types";

const FOOTER_HIDDEN_PREFIXES = [
  "/admin",
  "/seller",
  "/login",
  "/signup",
  "/register",
  "/forgot-password",
  "/auth",
  "/settings",
  "/messages",
  "/notifications",
  "/create",
  "/sandbox",
] as const;

const FOOTER_LINKS: Array<{ href: string; key: TranslationKey }> = [
  { href: APP_ROUTES.privacy, key: "legal.footer.privacy" },
  { href: APP_ROUTES.terms, key: "legal.footer.terms" },
  { href: APP_ROUTES.cookies, key: "legal.footer.cookies" },
  { href: APP_ROUTES.communityGuidelines, key: "legal.footer.community" },
  { href: APP_ROUTES.copyright, key: "legal.footer.copyright" },
  { href: APP_ROUTES.support, key: "legal.footer.contact" },
  { href: APP_ROUTES.about, key: "legal.footer.about" },
  { href: APP_ROUTES.accountDeletion, key: "legal.footer.delete" },
  { href: APP_ROUTES.dataExport, key: "legal.footer.export" },
];

function isPublicFooterPath(pathname: string): boolean {
  if (pathname === "/" || pathname === "/discover") return false;
  return !FOOTER_HIDDEN_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

export default function SiteFooter() {
  const pathname = usePathname() || "/";
  const { t } = useI18n();

  if (!isPublicFooterPath(pathname) || pathname.startsWith("/games/")) {
    return null;
  }

  return (
    <footer className="mt-auto border-t border-white/10 bg-[#050510] px-5 py-8 text-sm text-white/45">
      <nav
        aria-label={t("legal.footer.navAria")}
        className="mx-auto flex max-w-5xl flex-wrap items-center justify-center gap-x-4 gap-y-2"
      >
        {FOOTER_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="watch-focus-ring rounded text-white/70 underline-offset-4 transition hover:text-white hover:underline"
          >
            {t(link.key)}
          </Link>
        ))}
      </nav>
      <p className="mx-auto mt-4 max-w-5xl text-center text-xs text-white/35">
        {COMPANY_LEGAL_NAME}
      </p>
    </footer>
  );
}
