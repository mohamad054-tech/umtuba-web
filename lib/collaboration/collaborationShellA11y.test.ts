import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();

describe("COLLABORATION_WORKSPACE_CARD_AND_SHELL_A11Y_V1", () => {
  it("shell exposes skip link and main content landmark target", () => {
    const path = join(
      ROOT,
      "app/components/collaboration/CollaborationShell.tsx"
    );
    expect(existsSync(path)).toBe(true);
    const src = readFileSync(path, "utf8");
    expect(src).toMatch(/data-testid="collaboration-skip-link"/);
    expect(src).toMatch(/href="#collaboration-main-content"/);
    expect(src).toMatch(/id="collaboration-main-content"/);
    expect(src).toMatch(/aria-label=\{COLLABORATION_UI_COPY\.brand\}/);
    expect(src).toMatch(/dir="rtl"/);
    expect(src).toMatch(/lang="ar"/);
  });

  it("workspace card is a single keyboard-accessible link", () => {
    const path = join(ROOT, "app/components/collaboration/WorkspaceCard.tsx");
    const src = readFileSync(path, "utf8");
    expect(src).toMatch(/data-testid="collaboration-workspace-card-link"/);
    expect(src).toMatch(/watch-focus-ring/);
    expect(src).toMatch(/COLLABORATION_UI_ROUTES\.workspace\(workspace\.id\)/);
    // CTA is a non-interactive span inside the card link (no nested Link).
    expect(src).toMatch(/<span className="inline-flex rounded-full bg-white/);
    expect(src.match(/<Link\b/g)?.length).toBe(1);
    expect(src).toMatch(/text-white\/55/);
  });

  it("invite form exposes busy/invalid and token status semantics", () => {
    const path = join(
      ROOT,
      "app/components/collaboration/InviteMemberForm.tsx"
    );
    const src = readFileSync(path, "utf8");
    expect(src).toMatch(/data-testid="collaboration-invite-member-form"/);
    expect(src).toMatch(/aria-busy=\{pending\}/);
    expect(src).toMatch(/aria-invalid=\{showError \|\| undefined\}/);
    expect(src).toMatch(/text-white\/60/);
    expect(src).toMatch(/data-testid="collaboration-invite-token"/);
    expect(src).toMatch(/role="status"/);
  });
});
