import type { User } from "@supabase/supabase-js";
import { createDataExportStore } from "../../lib/dataExport/dataExportStore";
import type { DataExportRequestRecord } from "../../lib/dataExport/requestDataExport";
import { loadLegalPageProps } from "../../lib/legal/loadLegalPage";
import { dataExportMetadata } from "../../lib/site/routeMetadata";
import { createClient, getServerUser } from "../../lib/supabase/server";
import LegalDocumentPage from "../components/legal/LegalDocumentPage";
import DataExportExperience from "./DataExportExperience";

export const metadata = dataExportMetadata;

export default async function DataExportPage() {
  const page = await loadLegalPageProps("export");
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
    <LegalDocumentPage {...page}>
      <DataExportExperience
        signedIn={Boolean(user)}
        email={user?.email ?? null}
        existingRequest={existingRequest}
      />
    </LegalDocumentPage>
  );
}
