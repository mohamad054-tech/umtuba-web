import LegalDocumentPage from "../components/legal/LegalDocumentPage";
import { legalPageMetadata } from "../../lib/legal/legalMetadata";
import { COMMUNITY_PAGE } from "../../lib/legal/pageSpecs";

export async function generateMetadata() {
  return legalPageMetadata({
    titleKey: "legal.meta.communityTitle",
    descriptionKey: "legal.meta.communityDescription",
    path: COMMUNITY_PAGE.path,
  });
}

export default function CommunityGuidelinesPage() {
  return <LegalDocumentPage spec={COMMUNITY_PAGE} />;
}
