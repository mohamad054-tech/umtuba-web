import { Suspense } from "react";
import Link from "next/link";
import { createTranslator } from "../../lib/i18n";
import { resolveRequestLocale } from "../../lib/i18n/server";
import { welcomeMetadata } from "../../lib/site/routeMetadata";
import { APP_ROUTES } from "../lib/nav";
import UmtubaStackedLogo from "../components/brand/UmtubaStackedLogo";
import LandingHero from "../components/landing/LandingHero";
import BecomeASellerHook from "../components/store/BecomeASellerHook";

export const metadata = welcomeMetadata;

function LandingHeroFallback() {
  return (
    <header className="landing-hero relative isolate min-h-[100svh] overflow-hidden bg-[#050510]" />
  );
}

/** Marketing landing — moved from `/` so Home can be the video feed. */
export default async function WelcomePage() {
  const { locale } = await resolveRequestLocale();
  const t = createTranslator(locale);

  const worlds = [
    {
      icon: "🎬",
      title: t("landing.world.videos.title"),
      text: t("landing.world.videos.text"),
    },
    {
      icon: "🔥",
      title: t("landing.world.challenges.title"),
      text: t("landing.world.challenges.text"),
    },
    {
      icon: "🤖",
      title: t("landing.world.ai.title"),
      text: t("landing.world.ai.text"),
    },
    {
      icon: "💡",
      title: t("landing.world.ideas.title"),
      text: t("landing.world.ideas.text"),
    },
    {
      icon: "🌍",
      title: t("landing.world.global.title"),
      text: t("landing.world.global.text"),
    },
    {
      icon: "🚀",
      title: t("landing.world.opportunities.title"),
      text: t("landing.world.opportunities.text"),
    },
  ];

  return (
    <main className="min-h-screen overflow-hidden bg-[#050510] font-sans text-white max-sm:pb-[var(--app-mobile-bottom-nav-offset,0px)]">
      <Suspense fallback={<LandingHeroFallback />}>
        <LandingHero />
      </Suspense>

      <section className="relative z-10 mx-auto max-w-7xl px-6 pb-20 pt-6 md:px-12">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.3em] text-blue-300">
              {t("landing.worldsEyebrow")}
            </p>
            <h2 className="mt-4 text-4xl font-black md:text-6xl">
              {t("landing.worldsTitle")}
              <br />
              {t("landing.worldsTitleLine2")}
            </h2>
          </div>
          <Link
            href={APP_ROUTES.home}
            className="watch-focus-ring rounded-full border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-bold text-white/80 transition hover:bg-white/10"
          >
            {t("landing.openHomeFeed")}
          </Link>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {worlds.map((item) => (
            <div
              key={item.title}
              className="rounded-[2rem] border border-white/10 bg-white/[0.045] p-6 backdrop-blur transition hover:-translate-y-1 hover:bg-white/[0.07]"
            >
              <div className="text-4xl">{item.icon}</div>
              <h3 className="mt-6 text-2xl font-black">{item.title}</h3>
              <p className="mt-3 leading-7 text-white/60">{item.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-7xl px-6 pb-16 md:px-12">
        <BecomeASellerHook
          eyebrow={t("store.welcome.hookEyebrow")}
          title={t("store.welcome.hookTitle")}
          body={t("store.welcome.hookBody")}
          cta={t("store.welcome.hookCta")}
        />
      </section>

      <section className="relative z-10 mx-auto max-w-7xl px-6 pb-24 md:px-12">
        <div className="rounded-[2.5rem] border border-white/10 bg-white/[0.05] p-8 text-center backdrop-blur md:p-14">
          <p className="text-sm font-bold uppercase tracking-[0.3em] text-emerald-300">
            {t("landing.missionEyebrow")}
          </p>
          <h2 className="mt-5 text-4xl font-black md:text-6xl">
            {t("landing.missionTitle")}
          </h2>
          <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-white/60">
            {t("landing.missionBody")}
          </p>
        </div>
      </section>

      <footer className="relative z-10 border-t border-white/10 px-6 py-10 text-center text-sm text-white/45 md:px-12">
        <div className="flex justify-center">
          <UmtubaStackedLogo size="footer" />
        </div>
        <p className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
          <Link
            href={APP_ROUTES.terms}
            className="watch-focus-ring rounded underline-offset-4 transition hover:text-white hover:underline"
          >
            Terms of Use
          </Link>
          <Link
            href={APP_ROUTES.privacy}
            className="watch-focus-ring rounded underline-offset-4 transition hover:text-white hover:underline"
          >
            Privacy Policy
          </Link>
          <Link
            href={APP_ROUTES.accountDeletion}
            className="watch-focus-ring rounded underline-offset-4 transition hover:text-white hover:underline"
          >
            Delete account
          </Link>
        </p>
      </footer>
    </main>
  );
}
