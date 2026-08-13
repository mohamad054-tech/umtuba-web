import Link from "next/link";
import type { ReactNode } from "react";
import { APP_ROUTES, MOBILE_BOTTOM_NAV_CONTENT_PAD_CLASS } from "../../lib/nav";
import { LanguageSelector } from "../i18n";

type AuthShellProps = {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
  panelTitle?: string;
  panelBody?: string;
};

export default function AuthShell({
  title,
  subtitle,
  children,
  footer,
  panelTitle = "Create. Discover. Grow.",
  panelBody = "Join UMTUBA for videos, live discovery, and creators around the world.",
}: AuthShellProps) {
  return (
    <main
      className={`relative min-h-screen overflow-hidden bg-[#050510] px-4 py-10 text-white sm:px-6 ${MOBILE_BOTTOM_NAV_CONTENT_PAD_CLASS}`}
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-12%] top-[-8%] h-[28rem] w-[28rem] rounded-full bg-blue-600/25 blur-3xl" />
        <div className="absolute right-[-10%] top-[12%] h-[26rem] w-[26rem] rounded-full bg-indigo-600/20 blur-3xl" />
        <div className="absolute bottom-[-15%] left-[28%] h-[22rem] w-[22rem] rounded-full bg-cyan-500/10 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-[calc(100vh-80px)] w-full max-w-5xl items-center justify-center">
        <div className="grid w-full overflow-hidden rounded-[32px] border border-white/10 bg-white/[0.04] shadow-2xl backdrop-blur-xl lg:grid-cols-2">
          <section className="hidden bg-gradient-to-br from-blue-900/40 via-[#0b0b18]/60 to-cyan-900/20 p-10 lg:block">
            <Link
              href={APP_ROUTES.home}
              className="watch-focus-ring inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-sm font-black tracking-tight transition hover:bg-white/10"
            >
              UMTUBA
            </Link>

            <div className="mt-24">
              <h1 className="text-5xl font-black leading-none tracking-tight">
                {panelTitle}
              </h1>
              <p className="mt-6 max-w-md text-base leading-7 text-white/65">
                {panelBody}
              </p>
            </div>
          </section>

          <section className="p-6 sm:p-10">
            <div className="mb-8 flex items-center justify-between gap-3">
              <Link
                href={APP_ROUTES.home}
                className="inline-block text-xl font-black tracking-tight lg:hidden"
              >
                UMTUBA
              </Link>
              <div className="ms-auto">
                <LanguageSelector
                  id="umtuba-language-auth"
                  tone="dark"
                  variant="compact"
                />
              </div>
            </div>

            <h2 className="text-3xl font-black tracking-tight sm:text-4xl">
              {title}
            </h2>
            <p className="mt-3 text-white/60">{subtitle}</p>

            <div className="mt-8">{children}</div>

            {footer ? <div className="mt-8">{footer}</div> : null}
          </section>
        </div>
      </div>
    </main>
  );
}
