import { notFound } from "next/navigation";
import { isCollaborationPlatformEnabled } from "./collaborationPlatformGate";

/**
 * App Router guard — matches feed / journey-pro experimental surface policy:
 * disabled → notFound() (no feature teaser).
 */
export function requireCollaborationPlatformPage(
  source: Record<string, string | undefined> = process.env
): void {
  if (!isCollaborationPlatformEnabled(source)) {
    notFound();
  }
}
