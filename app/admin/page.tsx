import Link from "next/link";
import { createTranslator } from "../../lib/i18n";
import { resolveRequestLocale } from "../../lib/i18n/server";
import type { TranslationKey } from "../../lib/i18n/messages/types";
import { APP_ROUTES } from "../lib/nav";
import AdminHubShell from "./AdminHubShell";
import { requirePlatformAdminPage } from "./requirePlatformAdminPage";

export const metadata = {
  title: "Admin",
};

export const dynamic = "force-dynamic";

const AREAS: Array<{
  href: string;
  titleKey: TranslationKey;
  bodyKey: TranslationKey;
}> = [
  {
    href: APP_ROUTES.adminModeration,
    titleKey: "admin.hub.moderation",
    bodyKey: "admin.hub.moderationBody",
  },
  {
    href: APP_ROUTES.adminStore,
    titleKey: "admin.hub.store",
    bodyKey: "admin.hub.storeBody",
  },
  {
    href: APP_ROUTES.adminAds,
    titleKey: "admin.hub.ads",
    bodyKey: "admin.hub.adsBody",
  },
  {
    href: APP_ROUTES.adminAi,
    titleKey: "admin.hub.ai",
    bodyKey: "admin.hub.aiBody",
  },
  {
    href: APP_ROUTES.adminAiData,
    titleKey: "admin.hub.aiData",
    bodyKey: "admin.hub.aiDataBody",
  },
  {
    href: APP_ROUTES.adminKnowledge,
    titleKey: "admin.hub.knowledge",
    bodyKey: "admin.hub.knowledgeBody",
  },
  {
    href: APP_ROUTES.adminPrivateAi,
    titleKey: "admin.hub.privateAi",
    bodyKey: "admin.hub.privateAiBody",
  },
  {
    href: APP_ROUTES.adminTranslationStudio,
    titleKey: "admin.hub.translation",
    bodyKey: "admin.hub.translationBody",
  },
];

export default async function AdminHubPage() {
  await requirePlatformAdminPage(APP_ROUTES.admin);
  const { locale } = await resolveRequestLocale();
  const t = createTranslator(locale);

  return (
    <AdminHubShell title={t("admin.hub.title")} subtitle={t("admin.hub.subtitle")}>
      <ul className="grid gap-3 sm:grid-cols-2" aria-label={t("admin.hub.title")}>
        {AREAS.map((area) => (
          <li key={area.href}>
            <Link
              href={area.href}
              className="watch-focus-ring block rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4 transition hover:bg-white/5"
            >
              <p className="font-black">{t(area.titleKey)}</p>
              <p className="mt-1 text-sm text-white/50">{t(area.bodyKey)}</p>
            </Link>
          </li>
        ))}
      </ul>
    </AdminHubShell>
  );
}
