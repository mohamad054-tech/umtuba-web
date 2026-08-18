import type { Metadata } from "next";
import { notFound } from "next/navigation";
import SandboxView from "../../../components/sandbox/SandboxView";
import { resolveBusinessSandboxAccess } from "../../../../lib/sandbox/access/resolve";
import { parseSandboxSection, SANDBOX_PATH } from "../../../../lib/sandbox/paths";
import { getStoreListingView } from "../../../../lib/sandbox/store/listings";
import { sandboxProductTitle, sandboxStoreTitle } from "../../../../lib/sandbox/store/titles";
import { resolveRequestLocale } from "../../../../lib/i18n/server";

export const dynamic = "force-dynamic";

type PageProps = {
  params?: Promise<{ section?: string[] }>;
  searchParams?: Promise<{ sandbox_token?: string; q?: string; category?: string; sort?: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const resolvedParams = (await params) ?? {};
  const parsed = parseSandboxSection(resolvedParams.section ?? []);
  if (parsed.kind === "product") {
    const listing = getStoreListingView(parsed.slug);
    return {
      title: sandboxProductTitle(listing?.product.title ?? "Product"),
      robots: { index: false, follow: false },
    };
  }
  if (parsed.kind === "order") {
    return { title: sandboxStoreTitle(`Order ${parsed.id}`), robots: { index: false, follow: false } };
  }
  if (parsed.kind === "section") {
    return { title: sandboxStoreTitle(parsed.section), robots: { index: false, follow: false } };
  }
  return { title: "Business preview sandbox", robots: { index: false, follow: false } };
}

export default async function SandboxBusinessPreviewSectionPage({
  params,
  searchParams,
}: PageProps) {
  const resolvedParams = (await params) ?? {};
  const query = (await searchParams) ?? {};
  const segments = resolvedParams.section ?? [];
  const parsed = parseSandboxSection(segments);
  if (parsed.kind === "unknown") {
    notFound();
  }

  const { locale } = await resolveRequestLocale();
  const access = await resolveBusinessSandboxAccess(query.sandbox_token);
  const pathname = `${SANDBOX_PATH}/${segments.join("/")}`;
  return (
    <SandboxView
      locale={locale}
      pathname={pathname}
      allowed={access.ok}
      segments={segments}
      catalogQuery={{ q: query.q, category: query.category, sort: query.sort }}
    />
  );
}
