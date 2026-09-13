import LegalDocumentPage from "../components/legal/LegalDocumentPage";
import { loadLegalPageProps } from "../../lib/legal/loadLegalPage";
import { cookiesMetadata } from "../../lib/site/routeMetadata";

export const metadata = cookiesMetadata;

export default async function CookiesPage() {
  const props = await loadLegalPageProps("cookies");
  return <LegalDocumentPage {...props} />;
}
