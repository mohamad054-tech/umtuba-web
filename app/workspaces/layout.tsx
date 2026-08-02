import type { ReactNode } from "react";
import { requireCollaborationPlatformPage } from "../../lib/collaboration/requireCollaborationPlatform";

/**
 * Fail-closed gate for the entire /workspaces tree.
 * Disabled -> notFound() (same policy as experimental routes in surfaceGates).
 */
export default function WorkspacesLayout({ children }: { children: ReactNode }) {
  requireCollaborationPlatformPage();
  return children;
}
