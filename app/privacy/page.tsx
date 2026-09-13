import LegalDocumentPage from "../components/legal/LegalDocumentPage";
import { legalPageMetadata } from "../../lib/legal/legalMetadata";
import { PRIVACY_PAGE } from "../../lib/legal/pageSpecs";

export async function generateMetadata() {
  return legalPageMetadata({
    titleKey: "legal.meta.privacyTitle",
    descriptionKey: "legal.meta.privacyDescription",
    path: PRIVACY_PAGE.path,
  });
}

export default function PrivacyPage() {
  return <LegalDocumentPage spec={PRIVACY_PAGE} />;
}
