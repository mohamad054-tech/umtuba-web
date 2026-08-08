import type { CollaborationWorkspaceSummary } from "../../../lib/collaboration/workspaceQueries";
import ProductEmptyState from "../product/ProductEmptyState";
import {
  COLLABORATION_UI_COPY,
} from "../../../lib/collaboration/workspaceUi";
import WorkspaceCard from "./WorkspaceCard";

type WorkspaceListProps = {
  workspaces: CollaborationWorkspaceSummary[];
  onCreateClickId?: string;
};

export default function WorkspaceList({
  workspaces,
  onCreateClickId = "create-workspace-trigger",
}: WorkspaceListProps) {
  if (workspaces.length === 0) {
    return (
      <ProductEmptyState
        compact
        eyebrow={COLLABORATION_UI_COPY.brand}
        title={COLLABORATION_UI_COPY.emptyTitle}
        description={COLLABORATION_UI_COPY.emptyDescription}
        primaryHref={`#${onCreateClickId}`}
        primaryLabel={COLLABORATION_UI_COPY.createCta}
        secondaryHref={null}
        secondaryLabel={null}
      />
    );
  }

  return (
    <ul
      className="grid gap-4"
      aria-label={COLLABORATION_UI_COPY.workspacesTitle}
      data-testid="collaboration-workspace-list"
    >
      {workspaces.map((workspace) => (
        <li key={workspace.id}>
          <WorkspaceCard workspace={workspace} />
        </li>
      ))}
    </ul>
  );
}
