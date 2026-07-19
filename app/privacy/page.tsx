import LegalDocument from "../components/legal/LegalDocument";
import { APP_ROUTES } from "../lib/nav";
import {
  PRIVACY_INTRO,
  PRIVACY_SECTIONS,
  PRIVACY_TITLE,
} from "../../lib/legal/privacyContent";
import { privacyMetadata } from "../../lib/site/routeMetadata";

export const metadata = privacyMetadata;

export default function PrivacyPage() {
  return (
    <LegalDocument
      title={PRIVACY_TITLE}
      intro={PRIVACY_INTRO}
      sections={PRIVACY_SECTIONS}
      otherHref={APP_ROUTES.terms}
      otherLabel="Terms of Service"
    />
  );
}
