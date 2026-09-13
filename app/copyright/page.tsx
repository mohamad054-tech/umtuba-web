import LegalDocumentPage from "../components/legal/LegalDocumentPage";
import { loadLegalPageProps } from "../../lib/legal/loadLegalPage";
import { copyrightMetadata } from "../../lib/site/routeMetadata";

export const metadata = copyrightMetadata;

export default async function CopyrightPage() {
  const props = await loadLegalPageProps("copyright");
  return <LegalDocumentPage {...props} />;
}
