import LegalDocumentPage from "../components/legal/LegalDocumentPage";
import { loadLegalPageProps } from "../../lib/legal/loadLegalPage";
import { supportMetadata } from "../../lib/site/routeMetadata";

export const metadata = supportMetadata;

export default async function SupportPage() {
  const props = await loadLegalPageProps("contact");
  return <LegalDocumentPage {...props} />;
}
