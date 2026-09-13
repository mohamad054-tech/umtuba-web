import LegalDocumentPage from "../components/legal/LegalDocumentPage";
import { loadLegalPageProps } from "../../lib/legal/loadLegalPage";
import { aboutMetadata } from "../../lib/site/routeMetadata";

export const metadata = aboutMetadata;

export default async function AboutPage() {
  const props = await loadLegalPageProps("about");
  return <LegalDocumentPage {...props} />;
}
