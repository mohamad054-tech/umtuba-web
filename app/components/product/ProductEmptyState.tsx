import Link from "next/link";
import { APP_ROUTES, MOBILE_BOTTOM_NAV_CONTENT_PAD_CLASS } from "../../lib/nav";

type ProductEmptyStateProps = {
  title: string;
  description: string;
  eyebrow?: string;
  primaryHref?: string;
  primaryLabel?: string;
  secondaryHref?: string;
  secondaryLabel?: string;
};

/**
 * Shared empty / unavailable surface for production-ready pages.
 * Avoids “Coming soon” prototype language that looks like unfinished chrome.
 */
export default function ProductEmptyState({
  title,
  description,
  eyebrow = "UMTUBA",
  primaryHref = APP_ROUTES.discover,
  primaryLabel = "Open Discover",
  secondaryHref = APP_ROUTES.live,
  secondaryLabel = "Browse Live",
}: ProductEmptyStateProps) {
  return (
    <main
      className={`relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#050510] px-4 text-white ${MOBILE_BOTTOM_NAV_CONTENT_PAD_CLASS}`}
    >
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute left-[-12%] top-[-8%] h-[28rem] w-[28rem] rounded-full bg-blue-600/20 blur-3xl" />
        <div className="absolute right-[-10%] top-[18%] h-[24rem] w-[24rem] rounded-full bg-indigo-600/15 blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md rounded-[28px] border border-white/10 bg-[#080816]/85 px-6 py-8 text-center backdrop-blur-xl">
        <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-white/40">
          {eyebrow}
        </p>
        <h1 className="mt-3 text-2xl font-black tracking-tight">{title}</h1>
        <p className="mt-3 text-sm leading-7 text-white/55">{description}</p>

        <div className="mt-7 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Link
            href={primaryHref}
            className="watch-focus-ring inline-flex items-center justify-center rounded-full bg-white px-5 py-2.5 text-sm font-black text-black transition hover:bg-white/90"
          >
            {primaryLabel}
          </Link>
          {secondaryHref && secondaryLabel ? (
            <Link
              href={secondaryHref}
              className="watch-focus-ring inline-flex items-center justify-center rounded-full border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-bold text-white/80 transition hover:bg-white/10"
            >
              {secondaryLabel}
            </Link>
          ) : null}
        </div>
      </div>
    </main>
  );
}
