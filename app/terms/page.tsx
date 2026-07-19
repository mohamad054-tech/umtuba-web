import LegalDocument from "../components/legal/LegalDocument";
import { APP_ROUTES } from "../lib/nav";
import { TERMS_INTRO, TERMS_SECTIONS, TERMS_TITLE } from "../../lib/legal/termsContent";
import { termsMetadata } from "../../lib/site/routeMetadata";

export const metadata = termsMetadata;

export default function TermsPage() {
  return (
    <LegalDocument
      title={TERMS_TITLE}
      intro={TERMS_INTRO}
      sections={TERMS_SECTIONS}
      otherHref={APP_ROUTES.privacy}
      otherLabel="Privacy Policy"
    />
  );
}
