import { notFound } from "next/navigation";
import SandboxView from "../../../components/sandbox/SandboxView";
import { resolveBusinessSandboxAccess } from "../../../../lib/sandbox/access/resolve";
import { parseSandboxSection, SANDBOX_PATH } from "../../../../lib/sandbox/paths";
import { resolveRequestLocale } from "../../../../lib/i18n/server";

type PageProps = {
  params?: Promise<{ section?: string[] }>;
  searchParams?: Promise<{ sandbox_token?: string }>;
};

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
    />
  );
}
