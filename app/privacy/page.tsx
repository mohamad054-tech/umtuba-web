import LegalDocumentPage from "../components/legal/LegalDocumentPage";
import { loadLegalPageProps } from "../../lib/legal/loadLegalPage";
import { privacyMetadata } from "../../lib/site/routeMetadata";

export const metadata = privacyMetadata;

export default async function PrivacyPage() {
  const props = await loadLegalPageProps("privacy");
  return <LegalDocumentPage {...props} />;
}
