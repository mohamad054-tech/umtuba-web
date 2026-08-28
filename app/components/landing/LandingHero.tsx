"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { desktopNavLabelKey } from "../../../lib/i18n/shellLabels";
import { APP_NAV_ITEMS, APP_ROUTES, citiesMatch, isNavActive } from "../../lib/nav";
import { useTranslation } from "../i18n";
import { LIVING_CITIES } from "./living-earth/livingEarthData";
import UmtubaStackedLogo from "../brand/UmtubaStackedLogo";
import HeroCTAButton from "./HeroCTAButton";

const LandingHeroGlobe = dynamic(() => import("./LandingHeroGlobe"), {
  ssr: false,
  loading: () => (
    <div
      className="landing-hero-globe-fallback h-full w-full"
      aria-hidden
    />
  ),
});

export default function LandingHero() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { t } = useTranslation();
  const focusParam = searchParams.get("focus");

  const focusedCity =
    focusParam &&
    LIVING_CITIES.find((city) => citiesMatch(city.name, focusParam));

  return (
    <header className="landing-hero relative isolate min-h-[100svh] overflow-hidden">
      <div className="landing-hero-atmosphere pointer-events-none absolute inset-0" aria-hidden>
        <div className="landing-hero-stars" />
        <div className="landing-hero-stars landing-hero-stars--slow" />
        <div className="landing-hero-glow landing-hero-glow--primary" />
        <div className="landing-hero-glow landing-hero-glow--secondary" />
        <div className="landing-hero-glow landing-hero-glow--accent" />
        <div className="landing-hero-vignette" />
      </div>

      <nav className="relative z-20 mx-auto flex max-w-7xl items-center px-6 py-6 md:px-12 md:py-7">
        <Link
          href={APP_ROUTES.home}
          aria-label="UMTUBA"
          className="watch-focus-ring rounded-md"
        >
          <UmtubaStackedLogo size="nav" priority />
        </Link>

        <div className="landing-nav-links hidden flex-1 items-center justify-center gap-9 text-[15px] font-medium tracking-wide text-white/55 sm:flex">
          {APP_NAV_ITEMS.map((item) => {
            const active = isNavActive(pathname, item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`landing-nav-link ${
                  active ? "text-white" : ""
                }`}
              >
                {t(desktopNavLabelKey(item.href))}
              </Link>
            );
          })}
        </div>
      </nav>

      {focusParam ? (
        <div className="relative z-20 mx-auto max-w-7xl px-6 md:px-12">
          <p className="inline-flex rounded-full border border-sky-400/30 bg-sky-500/15 px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-sky-100">
            {focusedCity
              ? t("landing.focusLivingEarth", {
                  values: { city: focusedCity.name },
                })
              : t("landing.focusExploring", {
                  values: { city: focusParam },
                })}
          </p>
        </div>
      ) : null}

      <section className="relative z-10 mx-auto grid min-h-[calc(100svh-5.75rem)] max-w-7xl items-center gap-10 px-6 pb-20 pt-6 md:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] md:gap-8 md:px-12 md:pb-24 lg:gap-12">
        <div className="landing-hero-copy relative z-10 max-w-xl lg:max-w-2xl">
          <div className="landing-hero-brand mb-6 max-w-full">
            <UmtubaStackedLogo size="hero" priority />
          </div>

          <h1 className="max-w-[14ch] text-[clamp(2.1rem,4.6vw,3.75rem)] font-medium leading-[1.08] tracking-[-0.03em] text-white/92">
            {t("landing.headline")}{" "}
            <span className="bg-gradient-to-r from-sky-200 via-blue-100 to-indigo-200 bg-clip-text text-transparent">
              {t("landing.headlineAccent")}
            </span>
          </h1>

          <p className="mt-7 max-w-lg text-[15px] leading-7 text-white/55 md:mt-8 md:text-base md:leading-8">
            {t("landing.subhead")}
          </p>

          <div className="mt-11 flex flex-col gap-3.5 sm:flex-row sm:items-center sm:gap-4 md:mt-12">
            <HeroCTAButton
              variant="primary"
              onClick={() => router.push(APP_ROUTES.watch)}
            >
              {t("landing.startExploring")}
            </HeroCTAButton>
            <HeroCTAButton
              variant="secondary"
              onClick={() => router.push(APP_ROUTES.live)}
            >
              {t("landing.goLive")}
            </HeroCTAButton>
          </div>
        </div>

        <div className="landing-hero-visual relative mx-auto aspect-square w-full max-w-[672px] md:mx-0 md:max-w-none md:justify-self-end lg:aspect-auto lg:h-[min(86vh,768px)] lg:w-[120%] lg:max-w-[864px] lg:translate-x-4">
          <div
            className="landing-globe-aura pointer-events-none absolute left-1/2 top-1/2 h-[86%] w-[86%] -translate-x-1/2 -translate-y-1/2 rounded-full"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute left-1/2 top-1/2 h-[78%] w-[78%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(37,99,235,0.35)_0%,rgba(14,165,233,0.12)_42%,transparent_70%)] blur-2xl"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute inset-[8%] rounded-full border border-white/[0.07] bg-white/[0.02] shadow-[inset_0_0_60px_rgba(59,130,246,0.08)] backdrop-blur-[2px]"
            aria-hidden
          />
          <div className="absolute inset-0 overflow-hidden rounded-full">
            <LandingHeroGlobe focusCity={focusParam} />
          </div>
          <div
            className="pointer-events-none absolute inset-0 rounded-full ring-1 ring-inset ring-white/10"
            aria-hidden
          />
        </div>
      </section>
    </header>
  );
}
