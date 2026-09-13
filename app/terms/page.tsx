import LegalDocumentPage from "../components/legal/LegalDocumentPage";
import { legalPageMetadata } from "../../lib/legal/legalMetadata";
import { TERMS_PAGE } from "../../lib/legal/pageSpecs";

export async function generateMetadata() {
  return legalPageMetadata({
    titleKey: "legal.meta.termsTitle",
    descriptionKey: "legal.meta.termsDescription",
    path: TERMS_PAGE.path,
  });
}

export default function TermsPage() {
  return <LegalDocumentPage spec={TERMS_PAGE} />;
}
