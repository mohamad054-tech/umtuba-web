import Link from "next/link";
import SiteLegalLinks from "../components/legal/SiteLegalLinks";
import { APP_ROUTES } from "../lib/nav";
import AdvertiseShell from "./AdvertiseShell";

export const metadata = {
  title: "Advertise on UMTUBA | UMTUBA",
};

export default function AdvertiseLandingPage() {
  return (
    <AdvertiseShell title="Advertise" showNav={false}>
      <section className="overflow-hidden rounded-[28px] border border-white/10 bg-gradient-to-br from-[#12122a] via-[#080816] to-[#050510] p-6 md:p-8">
        <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-white/40">
          UMTUBA Ads
        </p>
        <h1 className="mt-2 max-w-xl text-3xl font-black tracking-tight md:text-4xl">
          Reach people where they discover, watch, and shop.
        </h1>
        <p className="mt-3 max-w-lg text-sm leading-relaxed text-white/55">
          Create an advertiser account, draft campaigns, and submit creatives for
          review. Delivery to Watch, Discover, Stories, and Store is not live in
          this foundation release — budgets and metrics stay estimate-only until
          payments and the delivery engine ship.
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Link
            href={APP_ROUTES.advertiseApply}
            className="watch-focus-ring rounded-full bg-white px-5 py-2.5 text-sm font-black text-black"
          >
            Apply to advertise
          </Link>
          <Link
            href={APP_ROUTES.advertiseDashboard}
            className="watch-focus-ring rounded-full border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-bold text-white/80"
          >
            Open dashboard
          </Link>
        </div>
      </section>

      <section className="mt-6 grid gap-4 sm:grid-cols-3">
        {[
          {
            title: "Campaigns",
            body: "Objectives, budgets in minor units, and schedules you control.",
          },
          {
            title: "Targeting",
            body: "Countries, languages, ages 13+, interests — no sensitive or user-level targeting.",
          },
          {
            title: "Review first",
            body: "Accounts, campaigns, and creatives go through moderation before any future delivery.",
          },
        ].map((item) => (
          <div
            key={item.title}
            className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4"
          >
            <h2 className="text-sm font-black">{item.title}</h2>
            <p className="mt-1.5 text-xs leading-relaxed text-white/50">
              {item.body}
            </p>
          </div>
        ))}
      </section>

      <div className="mt-8 border-t border-white/10 pt-5">
        <SiteLegalLinks />
      </div>
    </AdvertiseShell>
  );
}
