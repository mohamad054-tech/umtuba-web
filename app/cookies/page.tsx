import LegalDocumentPage from "../components/legal/LegalDocumentPage";
import { legalPageMetadata } from "../../lib/legal/legalMetadata";
import { COOKIES_PAGE } from "../../lib/legal/pageSpecs";

export async function generateMetadata() {
  return legalPageMetadata({
    titleKey: "legal.meta.cookiesTitle",
    descriptionKey: "legal.meta.cookiesDescription",
    path: COOKIES_PAGE.path,
  });
}

export default function CookiesPage() {
  return <LegalDocumentPage spec={COOKIES_PAGE} />;
}
