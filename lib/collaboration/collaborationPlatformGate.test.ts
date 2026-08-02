import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { COLLABORATION_PLATFORM_ENABLED } from "./workspaceSpineFoundation";
import {
  COLLABORATION_PLATFORM_DISABLED_MESSAGE,
  isCollaborationPlatformEnabled,
  rejectIfCollaborationPlatformDisabled,
} from "./collaborationPlatformGate";

const ROOT = process.cwd();

describe("Collaboration Platform Exposure Gate V1", () => {
  it("defaults to false (compile-time constant + unset env)", () => {
    expect(COLLABORATION_PLATFORM_ENABLED).toBe(false);
    expect(isCollaborationPlatformEnabled({})).toBe(false);
    expect(
      isCollaborationPlatformEnabled({ COLLABORATION_PLATFORM_ENABLED: "" })
    ).toBe(false);
    expect(
      isCollaborationPlatformEnabled({
        COLLABORATION_PLATFORM_ENABLED: "maybe",
      })
    ).toBe(false);
  });

  it("enables only on explicit truthy server env", () => {
    expect(
      isCollaborationPlatformEnabled({
        COLLABORATION_PLATFORM_ENABLED: "true",
      })
    ).toBe(true);
    expect(
      isCollaborationPlatformEnabled({
        COLLABORATION_PLATFORM_ENABLED: "1",
      })
    ).toBe(true);
    expect(
      isCollaborationPlatformEnabled({
        COLLABORATION_PLATFORM_ENABLED: "false",
      })
    ).toBe(false);
    expect(
      isCollaborationPlatformEnabled({
        COLLABORATION_PLATFORM_ENABLED: "0",
      })
    ).toBe(false);
  });

  it("uses public mirror only when primary key is unset", () => {
    expect(
      isCollaborationPlatformEnabled({
        NEXT_PUBLIC_COLLABORATION_PLATFORM_ENABLED: "1",
      })
    ).toBe(true);
    expect(
      isCollaborationPlatformEnabled({
        COLLABORATION_PLATFORM_ENABLED: "false",
        NEXT_PUBLIC_COLLABORATION_PLATFORM_ENABLED: "1",
      })
    ).toBe(false);
  });

  it("rejects server actions fail-closed when disabled", () => {
    expect(rejectIfCollaborationPlatformDisabled({})).toEqual({
      ok: false,
      message: COLLABORATION_PLATFORM_DISABLED_MESSAGE,
    });
    expect(
      rejectIfCollaborationPlatformDisabled({
        COLLABORATION_PLATFORM_ENABLED: "true",
      })
    ).toBeNull();
    expect(COLLABORATION_PLATFORM_DISABLED_MESSAGE).not.toMatch(
      /collaboration|workspace|feature/i
    );
  });

  it("layout/pages/actions wire the gate; disabled uses notFound", () => {
    const layout = readFileSync(
      join(ROOT, "app/workspaces/layout.tsx"),
      "utf8"
    );
    expect(layout).toMatch(/requireCollaborationPlatformPage/);

    const requireSrc = readFileSync(
      join(ROOT, "lib/collaboration/requireCollaborationPlatform.ts"),
      "utf8"
    );
    expect(requireSrc).toMatch(/notFound\(\)/);
    expect(requireSrc).toMatch(/isCollaborationPlatformEnabled/);

    const actions = readFileSync(
      join(ROOT, "app/actions/collaboration.ts"),
      "utf8"
    );
    expect(actions).toMatch(/rejectIfCollaborationPlatformDisabled/);
    expect(
      actions.match(/rejectIfCollaborationPlatformDisabled/g)?.length
    ).toBeGreaterThanOrEqual(5);

    expect(existsSync(join(ROOT, "app/workspaces/page.tsx"))).toBe(true);
    expect(existsSync(join(ROOT, "app/workspaces/invite/page.tsx"))).toBe(
      true
    );
  });

  it("requireCollaborationPlatformPage calls notFound when disabled", async () => {
    vi.resetModules();
    const notFound = vi.fn(() => {
      throw new Error("NEXT_NOT_FOUND");
    });
    vi.doMock("next/navigation", () => ({ notFound }));

    const { requireCollaborationPlatformPage } = await import(
      "./requireCollaborationPlatform"
    );

    expect(() =>
      requireCollaborationPlatformPage({
        COLLABORATION_PLATFORM_ENABLED: "false",
      })
    ).toThrow(/NEXT_NOT_FOUND/);
    expect(notFound).toHaveBeenCalledTimes(1);

    notFound.mockClear();
    expect(() =>
      requireCollaborationPlatformPage({
        COLLABORATION_PLATFORM_ENABLED: "true",
      })
    ).not.toThrow();
    expect(notFound).not.toHaveBeenCalled();

    vi.doUnmock("next/navigation");
    vi.resetModules();
  });

  it("keeps workspace routes noindex in page metadata", () => {
    for (const rel of [
      "app/workspaces/page.tsx",
      "app/workspaces/invite/page.tsx",
      "app/workspaces/[workspaceId]/page.tsx",
      "app/workspaces/[workspaceId]/members/page.tsx",
      "app/workspaces/[workspaceId]/invites/page.tsx",
    ]) {
      const src = readFileSync(join(ROOT, rel), "utf8");
      expect(src).toMatch(/robots:\s*\{\s*index:\s*false/);
    }
    const indexing = readFileSync(join(ROOT, "lib/site/indexing.ts"), "utf8");
    expect(indexing).toMatch(/\/workspaces/);
  });
});
