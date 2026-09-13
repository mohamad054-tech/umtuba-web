import type { User } from "@supabase/supabase-js";
import { createDataExportStore } from "../../lib/dataExport/dataExportStore";
import type { DataExportRequestRecord } from "../../lib/dataExport/requestDataExport";
import { legalPageMetadata } from "../../lib/legal/legalMetadata";
import { EXPORT_PAGE } from "../../lib/legal/pageSpecs";
import { createClient, getServerUser } from "../../lib/supabase/server";
import LegalDocumentPage from "../components/legal/LegalDocumentPage";
import DataExportExperience from "./DataExportExperience";

export async function generateMetadata() {
  return legalPageMetadata({
    titleKey: "legal.meta.exportTitle",
    descriptionKey: "legal.meta.exportDescription",
    path: EXPORT_PAGE.path,
  });
}

export default async function DataExportPage() {
  let user: User | null = null;

  try {
    user = await getServerUser();
  } catch {
    user = null;
  }

  let existingRequest: DataExportRequestRecord | null = null;

  if (user) {
    try {
      const supabase = await createClient();
      existingRequest = await createDataExportStore(supabase).findOpenRequest(
        user.id
      );
    } catch {
      existingRequest = null;
    }
  }

  return (
    <LegalDocumentPage spec={EXPORT_PAGE}>
      <DataExportExperience
        signedIn={Boolean(user)}
        email={user?.email ?? null}
        existingRequest={existingRequest}
      />
    </LegalDocumentPage>
  );
}
