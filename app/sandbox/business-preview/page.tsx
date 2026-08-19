import SandboxView from "../../components/sandbox/SandboxView";
import { resolveBusinessSandboxAccess } from "../../../lib/sandbox/access/resolve";
import { SANDBOX_PATH } from "../../../lib/sandbox/paths";
import { resolveRequestLocale } from "../../../lib/i18n/server";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<{ sandbox_token?: string }>;
};

export default async function SandboxBusinessPreviewPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const { locale } = await resolveRequestLocale();
  const access = await resolveBusinessSandboxAccess(params.sandbox_token);
  return (
    <SandboxView locale={locale} pathname={SANDBOX_PATH} allowed={access.ok} />
  );
}
