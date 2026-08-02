import { redirect, notFound } from "next/navigation";
import CollaborationWorkspaceShell from "../../../../components/learning/CollaborationWorkspaceShell";
import { createClient, getServerUser } from "../../../../../lib/supabase/server";
import {
  LEARNING_COLLABORATION_WORKSPACE_ROUTES,
  loadCollaborationWorkspaceSpine,
} from "../../../../../lib/learning/collaborationWorkspaceSpine";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ courseId: string }> | { courseId: string };
};

export async function generateMetadata({ params }: PageProps) {
  await Promise.resolve(params);
  return { title: `Workspace · Learning | UMTUBA` };
}

export default async function LearningCourseWorkspacePage({
  params,
}: PageProps) {
  const { courseId } = await Promise.resolve(params);
  const user = await getServerUser();
  if (!user) {
    redirect(
      `/login?next=${encodeURIComponent(
        LEARNING_COLLABORATION_WORKSPACE_ROUTES.workspace(courseId)
      )}`
    );
  }

  const supabase = await createClient();
  const loaded = await loadCollaborationWorkspaceSpine(supabase, {
    courseId,
    learnerUserId: user.id,
  });
  if (!loaded.ok) {
    notFound();
  }

  return <CollaborationWorkspaceShell view={loaded.data} />;
}
