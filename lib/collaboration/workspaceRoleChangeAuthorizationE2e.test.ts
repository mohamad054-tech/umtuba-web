import { describe, expect, it } from "vitest";

type WorkspaceRole = "owner" | "admin" | "member";

type Actor = { role: WorkspaceRole; workspaceId: string };
type Target = { role: WorkspaceRole; workspaceId: string; userId: string; actorUserId: string };

function canChangeWorkspaceRole(actor: Actor, target: Target): boolean {
  if (actor.workspaceId !== target.workspaceId) return false;
  if (actor.role !== "owner" && actor.role !== "admin") return false;
  if (target.userId === target.actorUserId) return false;
  if (target.role === "owner") return false;
  return true;
}

describe("collaboration workspace role change authorization e2e", () => {
  it("allows owner to demote admin in same workspace", () => {
    const actor: Actor = { role: "owner", workspaceId: "ws-1" };
    const target: Target = {
      role: "admin",
      workspaceId: "ws-1",
      userId: "u-admin",
      actorUserId: "u-owner",
    };
    expect(canChangeWorkspaceRole(actor, target)).toBe(true);
  });

  it("allows admin to change member role in same workspace", () => {
    const actor: Actor = { role: "admin", workspaceId: "ws-1" };
    const target: Target = {
      role: "member",
      workspaceId: "ws-1",
      userId: "u-member",
      actorUserId: "u-admin",
    };
    expect(canChangeWorkspaceRole(actor, target)).toBe(true);
  });

  it("denies member self-promotion", () => {
    const actor: Actor = { role: "member", workspaceId: "ws-1" };
    const target: Target = {
      role: "member",
      workspaceId: "ws-1",
      userId: "u-member",
      actorUserId: "u-member",
    };
    expect(canChangeWorkspaceRole(actor, target)).toBe(false);
  });

  it("protects owner role from change", () => {
    const actor: Actor = { role: "admin", workspaceId: "ws-1" };
    const target: Target = {
      role: "owner",
      workspaceId: "ws-1",
      userId: "u-owner",
      actorUserId: "u-admin",
    };
    expect(canChangeWorkspaceRole(actor, target)).toBe(false);
  });

  it("denies cross-workspace role change", () => {
    const actor: Actor = { role: "owner", workspaceId: "ws-1" };
    const target: Target = {
      role: "member",
      workspaceId: "ws-2",
      userId: "u-member",
      actorUserId: "u-owner",
    };
    expect(canChangeWorkspaceRole(actor, target)).toBe(false);
  });
});
