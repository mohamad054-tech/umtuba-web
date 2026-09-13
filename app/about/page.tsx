import LegalDocumentPage from "../components/legal/LegalDocumentPage";
import { legalPageMetadata } from "../../lib/legal/legalMetadata";
import { ABOUT_PAGE } from "../../lib/legal/pageSpecs";

export async function generateMetadata() {
  return legalPageMetadata({
    titleKey: "legal.meta.aboutTitle",
    descriptionKey: "legal.meta.aboutDescription",
    path: ABOUT_PAGE.path,
  });
}

export default function AboutPage() {
  return <LegalDocumentPage spec={ABOUT_PAGE} />;
}
