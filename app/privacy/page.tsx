import LegalDocumentPage from "../components/legal/LegalDocumentPage";
import { PRIVACY_SECTIONS } from "../../lib/legal/legalDocuments";
import { privacyMetadata } from "../../lib/site/routeMetadata";

export const metadata = privacyMetadata;

export default function PrivacyPage() {
  return (
    <LegalDocumentPage
      title="Privacy Policy"
      description="How UMTUBA processes account, content, usage, and device information during Beta — and the choices available to you."
      sections={PRIVACY_SECTIONS}
    />
  );
}
