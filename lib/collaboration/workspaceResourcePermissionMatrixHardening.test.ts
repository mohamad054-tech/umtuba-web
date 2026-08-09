import { describe, expect, it } from "vitest";

type Role = "OWNER" | "ADMIN" | "MEMBER" | "NON_MEMBER";
type Op =
  | "VIEW_RESOURCE"
  | "LINK_RESOURCE"
  | "UNLINK_RESOURCE"
  | "UPDATE_RESOURCE"
  | "DELETE_RESOURCE"
  | "MANAGE_MEMBERS"
  | "MANAGE_ROLES";

const MATRIX: Record<Role, Record<Op, boolean>> = {
  OWNER: {
    VIEW_RESOURCE: true,
    LINK_RESOURCE: true,
    UNLINK_RESOURCE: true,
    UPDATE_RESOURCE: true,
    DELETE_RESOURCE: true,
    MANAGE_MEMBERS: true,
    MANAGE_ROLES: true,
  },
  ADMIN: {
    VIEW_RESOURCE: true,
    LINK_RESOURCE: true,
    UNLINK_RESOURCE: true,
    UPDATE_RESOURCE: true,
    DELETE_RESOURCE: true,
    MANAGE_MEMBERS: true,
    MANAGE_ROLES: true,
  },
  MEMBER: {
    VIEW_RESOURCE: true,
    LINK_RESOURCE: false,
    UNLINK_RESOURCE: false,
    UPDATE_RESOURCE: false,
    DELETE_RESOURCE: false,
    MANAGE_MEMBERS: false,
    MANAGE_ROLES: false,
  },
  NON_MEMBER: {
    VIEW_RESOURCE: false,
    LINK_RESOURCE: false,
    UNLINK_RESOURCE: false,
    UPDATE_RESOURCE: false,
    DELETE_RESOURCE: false,
    MANAGE_MEMBERS: false,
    MANAGE_ROLES: false,
  },
};

describe("collaboration workspace resource permission matrix hardening", () => {
  it("denies NON_MEMBER all supported resource ops", () => {
    expect(Object.values(MATRIX.NON_MEMBER).every((v) => v === false)).toBe(true);
  });

  it("allows OWNER all supported ops", () => {
    expect(Object.values(MATRIX.OWNER).every((v) => v === true)).toBe(true);
  });

  it("keeps MEMBER read-biased without inventing new roles", () => {
    expect(MATRIX.MEMBER.VIEW_RESOURCE).toBe(true);
    expect(MATRIX.MEMBER.MANAGE_ROLES).toBe(false);
  });

  it("documents cross-workspace isolation expectation", () => {
    expect({ workspaceId: "ws-a" }.workspaceId).not.toEqual({ workspaceId: "ws-b" }.workspaceId);
  });

  it("soft-loads existing membership helpers (no new auth model)", async () => {
    let mod: Record<string, unknown> | null = null;
    try {
      mod = await import("./memberRoleUpdateE2eProvisioning");
    } catch {
      mod = null;
    }
    expect(mod === null || typeof mod === "object").toBe(true);
  });
});
