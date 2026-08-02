import { redirect } from "next/navigation";
import CollaborationShell from "../../components/collaboration/CollaborationShell";
import InviteRedeemForm from "../../components/collaboration/InviteRedeemForm";
import { COLLABORATION_UI_COPY, COLLABORATION_UI_ROUTES } from "../../../lib/collaboration/workspaceUi";
import { getServerUser } from "../../../lib/supabase/server";
import { APP_ROUTES } from "../../lib/nav";

export const metadata = {
  title: "دعوة مساحة العمل | UMTUBA",
  robots: { index: false, follow: false },
};

export default async function WorkspaceInviteRedeemPage() {
  const user = await getServerUser();
  if (!user) {
    redirect(
      `${APP_ROUTES.login}?next=${COLLABORATION_UI_ROUTES.inviteRedeem}`
    );
  }

  return (
    <CollaborationShell title={COLLABORATION_UI_COPY.inviteRedeemTitle}>
      <InviteRedeemForm />
    </CollaborationShell>
  );
}
