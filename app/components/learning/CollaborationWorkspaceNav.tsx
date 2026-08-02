import Link from "next/link";
import { LEARNING_LEARNER_ROUTES } from "../../../lib/learning/learnerDelivery";
import { LEARNING_COLLABORATION_WORKSPACE_ROUTES } from "../../../lib/learning/collaborationWorkspaceSpine";

type Props = {
  courseId: string;
  active: "workspace" | "course";
};

const linkClass = (active: boolean) =>
  active
    ? "font-bold text-white underline underline-offset-2"
    : "font-bold text-white/55 hover:text-white";

export default function CollaborationWorkspaceNav({
  courseId,
  active,
}: Props) {
  return (
    <nav
      aria-label="Workspace navigation"
      className="mt-3 flex flex-wrap gap-3 text-sm"
    >
      <Link
        href={LEARNING_COLLABORATION_WORKSPACE_ROUTES.workspace(courseId)}
        className={linkClass(active === "workspace")}
      >
        Workspace
      </Link>
      <Link
        href={LEARNING_LEARNER_ROUTES.course(courseId)}
        className={linkClass(active === "course")}
      >
        Course outline
      </Link>
    </nav>
  );
}
