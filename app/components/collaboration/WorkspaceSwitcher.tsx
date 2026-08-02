"use client";

import { useRouter } from "next/navigation";
import type { CollaborationWorkspaceSummary } from "../../../lib/collaboration/workspaceQueries";
import {
  COLLABORATION_UI_COPY,
  COLLABORATION_UI_ROUTES,
} from "../../../lib/collaboration/workspaceUi";

type WorkspaceSwitcherProps = {
  workspaces: CollaborationWorkspaceSummary[];
  currentWorkspaceId?: string;
};

export default function WorkspaceSwitcher({
  workspaces,
  currentWorkspaceId,
}: WorkspaceSwitcherProps) {
  const router = useRouter();

  if (workspaces.length === 0) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
      <label
        htmlFor="collaboration-workspace-switcher"
        className="block text-[11px] font-bold text-white/45"
      >
        {COLLABORATION_UI_COPY.switcherLabel}
      </label>
      <select
        id="collaboration-workspace-switcher"
        className="watch-focus-ring mt-2 w-full rounded-xl border border-white/10 bg-[#050510] px-3 py-2.5 text-sm text-white"
        value={currentWorkspaceId ?? ""}
        onChange={(event) => {
          const next = event.target.value;
          if (!next) {
            router.push(COLLABORATION_UI_ROUTES.root);
            return;
          }
          router.push(COLLABORATION_UI_ROUTES.workspace(next));
        }}
      >
        <option value="">{COLLABORATION_UI_COPY.workspacesTitle}</option>
        {workspaces.map((workspace) => (
          <option key={workspace.id} value={workspace.id}>
            {workspace.displayName}
          </option>
        ))}
      </select>
    </div>
  );
}
