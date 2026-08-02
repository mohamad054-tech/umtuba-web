import { redirect } from "next/navigation";
import CollaborationShell from "../../components/collaboration/CollaborationShell";
import WorkspaceSwitcher from "../../components/collaboration/WorkspaceSwitcher";
import ProductErrorState from "../../components/product/ProductErrorState";
import {
  getCollaborationWorkspaceDetail,
  listMyCollaborationWorkspaces,
} from "../../../lib/collaboration/workspaceQueries";
import {
  COLLABORATION_UI_COPY,
  COLLABORATION_UI_ROUTES,
  collaborationKindLabel,
  collaborationRoleLabel,
  collaborationStatusLabel,
} from "../../../lib/collaboration/workspaceUi";
import { createClient, getServerUser } from "../../../lib/supabase/server";
import { APP_ROUTES } from "../../lib/nav";

type PageProps = {
  params: Promise<{ workspaceId: string }>;
};

export const metadata = {
  title: "تفاصيل مساحة العمل | UMTUBA",
  robots: { index: false, follow: false },
};

export default async function WorkspaceDetailPage({ params }: PageProps) {
  const { workspaceId } = await params;
  const user = await getServerUser();
  if (!user) {
    redirect(
      `${APP_ROUTES.login}?next=${COLLABORATION_UI_ROUTES.workspace(workspaceId)}`
    );
  }

  const supabase = await createClient();
  const [detail, list] = await Promise.all([
    getCollaborationWorkspaceDetail(supabase, workspaceId, user.id),
    listMyCollaborationWorkspaces(supabase, user.id),
  ]);

  return (
    <CollaborationShell
      title={
        detail.ok
          ? detail.data.displayName
          : COLLABORATION_UI_COPY.detailsTitle
      }
      workspaceId={workspaceId}
      showWorkspaceNav
    >
      {list.ok ? (
        <div className="mb-4">
          <WorkspaceSwitcher
            workspaces={list.data}
            currentWorkspaceId={workspaceId}
          />
        </div>
      ) : null}

      {!detail.ok ? (
        <ProductErrorState
          compact
          title={COLLABORATION_UI_COPY.loadErrorTitle}
          message={detail.message}
        />
      ) : (
        <section className="rounded-[28px] border border-white/10 bg-[#080816]/80 p-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-white/40">
            {collaborationKindLabel(detail.data.kind)}
          </p>
          <h1 className="mt-2 text-2xl font-black tracking-tight">
            {detail.data.displayName}
          </h1>
          <p className="mt-1 text-xs text-white/45" dir="ltr">
            @{detail.data.slug}
          </p>
          {detail.data.description ? (
            <p className="mt-4 text-sm leading-7 text-white/60">
              {detail.data.description}
            </p>
          ) : null}

          <dl className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
              <dt className="text-[11px] text-white/40">
                {COLLABORATION_UI_COPY.statusLabel}
              </dt>
              <dd className="mt-1 text-sm font-bold">
                {collaborationStatusLabel(detail.data.status)}
              </dd>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
              <dt className="text-[11px] text-white/40">
                {COLLABORATION_UI_COPY.myRoleLabel}
              </dt>
              <dd className="mt-1 text-sm font-bold">
                {collaborationRoleLabel(detail.data.myRole)}
              </dd>
            </div>
          </dl>
        </section>
      )}
    </CollaborationShell>
  );
}
