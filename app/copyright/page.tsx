import LegalDocumentPage from "../components/legal/LegalDocumentPage";
import { legalPageMetadata } from "../../lib/legal/legalMetadata";
import { COPYRIGHT_PAGE } from "../../lib/legal/pageSpecs";

export async function generateMetadata() {
  return legalPageMetadata({
    titleKey: "legal.meta.copyrightTitle",
    descriptionKey: "legal.meta.copyrightDescription",
    path: COPYRIGHT_PAGE.path,
  });
}

export default function CopyrightPage() {
  return <LegalDocumentPage spec={COPYRIGHT_PAGE} />;
}
