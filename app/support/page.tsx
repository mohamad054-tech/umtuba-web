import LegalDocumentPage from "../components/legal/LegalDocumentPage";
import { legalPageMetadata } from "../../lib/legal/legalMetadata";
import { CONTACT_PAGE } from "../../lib/legal/pageSpecs";

export async function generateMetadata() {
  return legalPageMetadata({
    titleKey: "legal.meta.contactTitle",
    descriptionKey: "legal.meta.contactDescription",
    path: CONTACT_PAGE.path,
  });
}

export default function SupportPage() {
  return <LegalDocumentPage spec={CONTACT_PAGE} />;
}
