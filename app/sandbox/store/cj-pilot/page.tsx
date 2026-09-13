import { formatPilotMoney } from "../../../../lib/services/cj/catalogAdapter";
import { IRELAND_TEST_DESTINATION, PILOT_CATEGORIES } from "../../../../lib/services/cj/constants";
import { readLaunchMixFile } from "../../../../lib/services/cj/launchCatalogFile";
import {
  LAUNCH_FILTERS,
  type LaunchClassification,
  type LaunchFilter,
} from "../../../../lib/services/cj/launchAssumptions";
import type { CjPilotCategory } from "../../../../lib/services/cj/constants";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?:
    | Promise<{ filter?: string; category?: string }>
    | { filter?: string; category?: string };
};

function parseFilter(raw: string | undefined): LaunchFilter {
  if (raw && (LAUNCH_FILTERS as readonly string[]).includes(raw)) {
    return raw as LaunchFilter;
  }
  return "ALL";
}

function parseCategory(raw: string | undefined): CjPilotCategory | "ALL" {
  if (raw && (PILOT_CATEGORIES as readonly string[]).includes(raw)) {
    return raw as CjPilotCategory;
  }
  return "ALL";
}

function badgeClass(classification: LaunchClassification): string {
  if (classification === "LAUNCH_HERO") return "border-amber-300/50 bg-amber-400/20 text-amber-50";
  if (classification === "LAUNCH_STANDARD") return "border-emerald-400/40 bg-emerald-500/15 text-emerald-100";
  if (classification === "ORGANIC_ONLY") return "border-sky-400/40 bg-sky-500/15 text-sky-100";
  return "border-white/20 bg-white/5 text-white/60";
}

function money(value: number | null | undefined): string {
  return formatPilotMoney(value ?? null);
}

function pct(value: number | null | undefined): string {
  return value == null ? "n/a" : `${Math.round(value * 1000) / 10}%`;
}

export default async function CjPilotSandboxPage({ searchParams }: PageProps) {
  const params = await Promise.resolve(searchParams ?? {});
  const filter = parseFilter(params.filter);
  const category = parseCategory(params.category);
  const catalog = readLaunchMixFile();
  const products = catalog?.products ?? [];
  const visible = products.filter((row) => {
    if (filter !== "ALL" && row.launch_classification !== filter) return false;
    if (category !== "ALL" && row.category !== category) return false;
    return true;
  });
  const summary = catalog?.summary;

  const filterHref = (next: LaunchFilter) => {
    const qs = new URLSearchParams();
    if (next !== "ALL") qs.set("filter", next);
    if (category !== "ALL") qs.set("category", category);
    const query = qs.toString();
    return query ? `/sandbox/store/cj-pilot?${query}` : "/sandbox/store/cj-pilot";
  };
  const categoryHref = (next: CjPilotCategory | "ALL") => {
    const qs = new URLSearchParams();
    if (filter !== "ALL") qs.set("filter", filter);
    if (next !== "ALL") qs.set("category", next);
    const query = qs.toString();
    return query ? `/sandbox/store/cj-pilot?${query}` : "/sandbox/store/cj-pilot";
  };

  return (
    <section>
      <h1 className="text-3xl font-black tracking-tight">CJ Store launch mix V1</h1>
      <p className="mt-2 max-w-3xl text-sm text-white/60">
        Built from <code>data/cj-profit-gate-v2.json</code> (preserved). Results in{" "}
        <code>data/cj-store-launch-mix-v1.json</code>. Ireland TEST dest{" "}
        {IRELAND_TEST_DESTINATION.locality} {IRELAND_TEST_DESTINATION.postcode} (
        {IRELAND_TEST_DESTINATION.countryCode}). Payment fees are{" "}
        <code>ASSUMED_NOT_FINAL</code> (2.9% + $0.30 placeholder).
      </p>

      <dl className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Launch selected" value={String(summary?.launch_selected ?? 0)} />
        <Stat label="Hero / Standard" value={`${summary?.launch_hero ?? 0} / ${summary?.launch_standard ?? 0}`} />
        <Stat label="Organic / Hold" value={`${summary?.organic_only ?? 0} / ${summary?.hold ?? 0}`} />
        <Stat
          label="Category mix"
          value={`H${summary?.category_mix.Home ?? 0} P${summary?.category_mix.Pet ?? 0} C${summary?.category_mix.Car ?? 0} T${summary?.category_mix.Travel ?? 0} B${summary?.category_mix.Beauty ?? 0}`}
        />
        <Stat label="Avg retail" value={money(summary?.avg_retail_minor ?? null)} />
        <Stat label="Avg landed" value={money(summary?.avg_landed_cost_minor ?? null)} />
        <Stat label="Avg gross margin" value={pct(summary?.avg_gross_margin ?? null)} />
        <Stat label="Avg break-even ad" value={money(summary?.avg_break_even_ad_cost_minor ?? null)} />
        <Stat label="Avg target CPA" value={money(summary?.avg_target_cpa_minor ?? null)} />
        <Stat label="Avg net at target CPA" value={money(summary?.avg_estimated_net_profit_minor ?? null)} />
      </dl>

      <nav className="mt-6 flex flex-wrap gap-2" aria-label="Launch classification filter">
        {LAUNCH_FILTERS.map((value) => (
          <a
            key={value}
            href={filterHref(value)}
            className={`rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-wider ${
              filter === value
                ? "border-amber-300 bg-amber-400/20 text-amber-50"
                : "border-white/15 text-white/55 hover:border-white/40 hover:text-white"
            }`}
          >
            {value}
          </a>
        ))}
      </nav>

      <nav className="mt-3 flex flex-wrap gap-2" aria-label="Category filter">
        {(["ALL", ...PILOT_CATEGORIES] as const).map((value) => (
          <a
            key={value}
            href={categoryHref(value)}
            className={`rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-wider ${
              category === value
                ? "border-sky-300 bg-sky-400/20 text-sky-50"
                : "border-white/15 text-white/55 hover:border-white/40 hover:text-white"
            }`}
          >
            {value}
          </a>
        ))}
      </nav>

      {!catalog ? (
        <p className="mt-10 rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-8 text-sm text-white/70">
          Launch mix file is not built yet. Run{" "}
          <code>npx tsx scripts/sandbox/run-cj-store-launch-mix-v1.ts</code>. This page never
          publishes to <code>/store</code>.
        </p>
      ) : visible.length === 0 ? (
        <p className="mt-10 rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-8 text-sm text-white/70">
          No products in this filter.
        </p>
      ) : (
        <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((item) => (
            <li
              key={item.cj_product_id}
              className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]"
            >
              <div className="aspect-[4/5] bg-white/5">
                {item.image_urls[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.image_urls[0]} alt="" className="h-full w-full object-cover" />
                ) : null}
              </div>
              <div className="space-y-2 px-4 py-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full border px-2 py-0.5 text-[10px] font-black tracking-wider ${badgeClass(item.launch_classification)}`}
                  >
                    {item.launch_classification}
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/40">
                    {item.category} · {item.family}
                  </span>
                </div>
                <h2 className="text-base font-semibold leading-snug">{item.title}</h2>
                <p className="text-sm text-white/80">
                  Retail {money(item.economics.final_retail_price_minor)} · Landed{" "}
                  {money(item.economics.landed_cost_minor)} · Profit{" "}
                  {money(item.economics.gross_profit_minor)} ({pct(item.economics.gross_margin)})
                </p>
                <p className="text-sm text-white/70">
                  Break-even ad {money(item.economics.break_even_ad_cost_minor)} · Target CPA{" "}
                  {money(item.economics.recommended_target_cpa_minor)} · Net{" "}
                  {money(item.economics.estimated_net_profit_at_target_cpa_minor)}
                </p>
                <p className="text-xs text-white/50">
                  Delivery {item.estimated_delivery_time ?? "n/a"}
                  {item.delivery_days != null ? ` (${item.delivery_days}d)` : ""} · Stock{" "}
                  {item.stock ?? "n/a"} · Score {item.profitability_score.toFixed(1)}
                </p>
                {item.hold_reasons.length ? (
                  <p className="text-[11px] text-white/40">{item.hold_reasons.join(" · ")}</p>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
      <dt className="text-[10px] font-bold uppercase tracking-wider text-white/40">{label}</dt>
      <dd className="mt-1 font-mono text-sm">{value}</dd>
    </div>
  );
}
