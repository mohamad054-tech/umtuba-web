import Link from "next/link";
import { redirect } from "next/navigation";
import AppTopNav from "../../../components/AppTopNav";
import {
  PAGE_REGISTRY,
  domainCounts,
  listAdminPages,
  listDynamicPages,
  listLegacyOrDeprecatedPages,
  listOrphanPages,
  listPublicPages,
} from "../../../../lib/platform/pageRegistry";
import {
  ADMIN_NAV_CONTEXT,
  buildAllNavigationGroups,
  buildSitemapEntries,
  reportNavigationOrphans,
} from "../../../../lib/platform/navigation";
import {
  ADMIN_STORE_UNAUTHORIZED,
  assertPlatformAdminDb,
} from "../../../../lib/store/adminAuth";
import { createClient, getServerUser } from "../../../../lib/supabase/server";
import { APP_ROUTES } from "../../../lib/nav";
import PageRegistryViewer from "./PageRegistryViewer";

export const metadata = {
  title: "Page Registry | UMTUBA",
};

const PATH = "/admin/platform/pages";

/**
 * Read-only inventory viewer for the unified page registry.
 * Does not edit, delete, or redirect routes.
 */
export default async function AdminPlatformPagesPage() {
  const user = await getServerUser();
  if (!user) {
    redirect(`${APP_ROUTES.login}?next=${encodeURIComponent(PATH)}`);
  }
  const supabase = await createClient();
  const isAdmin = await assertPlatformAdminDb(supabase);
  if (!isAdmin) {
    redirect(
      `${APP_ROUTES.home}?error=${encodeURIComponent(ADMIN_STORE_UNAUTHORIZED)}`
    );
  }

  const counts = domainCounts();
  const pages = PAGE_REGISTRY.map((page) => ({ ...page }));
  const navGroups = buildAllNavigationGroups(
    PAGE_REGISTRY,
    ADMIN_NAV_CONTEXT
  );
  const sitemapCount = buildSitemapEntries(PAGE_REGISTRY).length;
  const navOrphans = reportNavigationOrphans(PAGE_REGISTRY);

  return (
    <main className="min-h-screen bg-[#050510] pb-16 text-white">
      <div className="mx-auto max-w-6xl px-4 py-6 md:px-6">
        <AppTopNav title="Platform" subtitle="Unified page registry" />
        <nav
          aria-label="Platform admin"
          className="mt-4 flex flex-wrap gap-2 border-b border-white/10 pb-4"
        >
          <Link
            href={APP_ROUTES.adminStore}
            className="watch-focus-ring rounded-full border border-white/10 bg-white/[0.03] px-3.5 py-1.5 text-xs font-bold text-white/70"
          >
            Store admin
          </Link>
          <span className="rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 text-xs font-bold text-white">
            Page registry
          </span>
        </nav>

        <section className="mt-6 rounded-[28px] border border-white/10 bg-[#080816]/80 p-5 md:p-7">
          <h1 className="text-2xl font-black tracking-tight">
            Unified page registry
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-white/50">
            Canonical inventory of App Router pages. Read-only — no route
            edits, deletes, or redirects from this surface.
          </p>

          <dl className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["Total pages", PAGE_REGISTRY.length],
              ["Public", listPublicPages().length],
              ["Admin", listAdminPages().length],
              ["Dynamic", listDynamicPages().length],
              ["Legacy / deprecated", listLegacyOrDeprecatedPages().length],
              ["Orphans", listOrphanPages().length],
              ["Commerce", counts.commerce],
              ["Learning", counts.learning],
              ["Sitemap (public)", sitemapCount],
              ["Nav orphans", navOrphans.length],
            ].map(([label, value]) => (
              <div
                key={String(label)}
                className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3"
              >
                <dt className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/45">
                  {label}
                </dt>
                <dd className="mt-1 text-xl font-black">{value}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
            <h2 className="text-sm font-black uppercase tracking-[0.16em] text-white/55">
              Navigation foundation (read-only)
            </h2>
            <p className="mt-1 text-xs text-white/40">
              Groups built from Page Registry via unified navigation foundation.
              Production chrome is not replaced.
            </p>
            <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {navGroups.map((group) => (
                <li
                  key={group.id}
                  className="rounded-xl border border-white/10 bg-[#0b0b18] px-3 py-2"
                >
                  <p className="text-sm font-bold text-white">{group.label}</p>
                  <p className="text-xs text-white/45">
                    {group.items.length} items · {group.id}
                  </p>
                </li>
              ))}
            </ul>
          </div>

          <PageRegistryViewer pages={pages} />
        </section>
      </div>
    </main>
  );
}
