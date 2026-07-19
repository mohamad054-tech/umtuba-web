import LegalDocumentPage from "../components/legal/LegalDocumentPage";
import { TERMS_SECTIONS } from "../../lib/legal/legalDocuments";
import { termsMetadata } from "../../lib/site/routeMetadata";

export const metadata = termsMetadata;

export default function TermsPage() {
  return (
    <LegalDocumentPage
      title="Terms of Use"
      description="The rules for using UMTUBA during Beta soft launch — accounts, content, community conduct, rewards, and service limits."
      sections={TERMS_SECTIONS}
    />
  );
}
