import LegalDocumentPage from "../components/legal/LegalDocumentPage";
import { loadLegalPageProps } from "../../lib/legal/loadLegalPage";
import { communityGuidelinesMetadata } from "../../lib/site/routeMetadata";

export const metadata = communityGuidelinesMetadata;

export default async function CommunityGuidelinesPage() {
  const props = await loadLegalPageProps("guidelines");
  return <LegalDocumentPage {...props} />;
}
