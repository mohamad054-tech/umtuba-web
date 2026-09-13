import LegalDocumentPage from "../components/legal/LegalDocumentPage";
import { loadLegalPageProps } from "../../lib/legal/loadLegalPage";
import { termsMetadata } from "../../lib/site/routeMetadata";

export const metadata = termsMetadata;

export default async function TermsPage() {
  const props = await loadLegalPageProps("terms");
  return <LegalDocumentPage {...props} />;
}
