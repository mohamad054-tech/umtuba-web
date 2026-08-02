import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  COLLABORATION_PLATFORM_ENABLED,
  COLLABORATION_RESOURCE_TYPES_RESERVED,
  COLLABORATION_WORKSPACE_HELPERS,
  COLLABORATION_WORKSPACE_INVITE_ROLES,
  COLLABORATION_WORKSPACE_KINDS,
  COLLABORATION_WORKSPACE_PERMISSIONS,
  COLLABORATION_WORKSPACE_ROLES,
  COLLABORATION_WORKSPACE_ROLE_RANKS,
  COLLABORATION_WORKSPACE_RPCS,
  COLLABORATION_WORKSPACE_SPINE_RPCS,
  COLLABORATION_WORKSPACE_STATUSES,
  collaborationWorkspaceAllows,
  collaborationWorkspaceCanMutatePeer,
  collaborationWorkspaceRoleAtLeast,
  collaborationWorkspaceRoleRank,
} from "./workspaceSpineFoundation";

const ROOT = process.cwd();
const MIGRATION =
  "supabase/migrations/20260896_collaboration_workspace_spine_foundation_v1.sql";

function read(rel: string) {
  return readFileSync(join(ROOT, rel), "utf8");
}

function fnBody(sql: string, name: string): string {
  const re = new RegExp(
    `create or replace function public\\.${name}[\\s\\S]*?^\\$\\$;`,
    "im"
  );
  const m = sql.match(re);
  return m?.[0] ?? "";
}

describe("Collaboration Workspace Spine Foundation V1 — files", () => {
  it("ships migration and constants module", () => {
    expect(existsSync(join(ROOT, MIGRATION))).toBe(true);
    expect(
      existsSync(join(ROOT, "lib/collaboration/workspaceSpineFoundation.ts"))
    ).toBe(true);
  });
});

describe("Collaboration Workspace Spine — role RBAC fail-closed", () => {
  it("ranks fixed roles and rejects unknown", () => {
    expect(collaborationWorkspaceRoleRank("owner")).toBe(100);
    expect(collaborationWorkspaceRoleRank("admin")).toBe(80);
    expect(collaborationWorkspaceRoleRank("manager")).toBe(60);
    expect(collaborationWorkspaceRoleRank("billing_manager")).toBe(50);
    expect(collaborationWorkspaceRoleRank("member")).toBe(40);
    expect(collaborationWorkspaceRoleRank("auditor")).toBe(30);
    expect(collaborationWorkspaceRoleRank("instructor")).toBeNull();
    expect(collaborationWorkspaceRoleRank("campaign_manager")).toBeNull();
    expect(COLLABORATION_WORKSPACE_ROLE_RANKS.owner).toBe(100);
  });

  it("role_at_least and permission matrix fail-closed", () => {
    expect(collaborationWorkspaceRoleAtLeast("admin", "member")).toBe(true);
    expect(collaborationWorkspaceRoleAtLeast("member", "admin")).toBe(false);
    expect(collaborationWorkspaceRoleAtLeast("nope", "member")).toBe(false);
    expect(collaborationWorkspaceAllows("owner", "manage_members")).toBe(true);
    expect(collaborationWorkspaceAllows("member", "manage_members")).toBe(
      false
    );
    expect(collaborationWorkspaceAllows("ghost", "view_members")).toBe(false);
  });

  it("enforces peer-admin strict greater rank", () => {
    expect(collaborationWorkspaceCanMutatePeer("owner", "admin")).toBe(true);
    expect(collaborationWorkspaceCanMutatePeer("admin", "admin")).toBe(false);
    expect(collaborationWorkspaceCanMutatePeer("manager", "admin")).toBe(
      false
    );
  });

  it("keeps platform flag off and invite roles exclude owner", () => {
    expect(COLLABORATION_PLATFORM_ENABLED).toBe(false);
    expect([...COLLABORATION_WORKSPACE_INVITE_ROLES]).not.toContain("owner");
    expect([...COLLABORATION_WORKSPACE_KINDS]).toEqual([
      "team",
      "company",
      "school",
      "academy",
    ]);
  });
});

describe("Collaboration Workspace Spine — SQL contracts", () => {
  const sql = read(MIGRATION);

  it("creates spine tables only (no learning/store/ueos mutation)", () => {
    expect(sql).toMatch(/create table if not exists public\.collaboration_workspaces/i);
    expect(sql).toMatch(
      /create table if not exists public\.collaboration_workspace_profiles/i
    );
    expect(sql).toMatch(
      /create table if not exists public\.collaboration_workspace_members/i
    );
    expect(sql).toMatch(
      /create table if not exists public\.collaboration_workspace_invites/i
    );
    expect(sql).toMatch(
      /create table if not exists public\.collaboration_workspace_settings/i
    );
    expect(sql).toMatch(
      /create table if not exists public\.collaboration_workspace_audit_events/i
    );
    expect(sql).toMatch(
      /create table if not exists public\.collaboration_workspace_resource_links/i
    );
    expect(sql).not.toMatch(/alter table public\.learning_/i);
    expect(sql).not.toMatch(/alter table public\.stores\b/i);
    expect(sql).not.toMatch(/alter table public\.ueos_/i);
    expect(sql).not.toMatch(/owner_type/i);
  });

  it("mirrors kinds, roles, statuses, and one active owner", () => {
    for (const kind of COLLABORATION_WORKSPACE_KINDS) {
      expect(sql).toContain(`'${kind}'`);
    }
    for (const role of COLLABORATION_WORKSPACE_ROLES) {
      expect(sql).toContain(`'${role}'`);
    }
    for (const status of COLLABORATION_WORKSPACE_STATUSES) {
      expect(sql).toContain(`'${status}'`);
    }
    expect(sql).toMatch(
      /collaboration_workspace_members_one_active_owner_uidx/i
    );
    expect(sql).toMatch(
      /unique \(resource_type, resource_id\)/i
    );
  });

  it("FORCE RLS + revoke client writes on spine tables", () => {
    expect(sql).toMatch(
      /alter table public\.collaboration_workspaces force row level security/i
    );
    expect(sql).toMatch(
      /alter table public\.collaboration_workspace_members force row level security/i
    );
    expect(sql).toMatch(
      /revoke insert, update, delete on table public\.collaboration_workspace_members/i
    );
    expect(sql).toMatch(
      /revoke insert, update, delete on table public\.collaboration_workspace_resource_links/i
    );
  });

  it("ships helpers and membership RPCs; no product bind RPCs", () => {
    for (const name of Object.values(COLLABORATION_WORKSPACE_HELPERS)) {
      expect(sql).toMatch(
        new RegExp(`create or replace function public\\.${name}`, "i")
      );
    }
    for (const name of Object.values(COLLABORATION_WORKSPACE_SPINE_RPCS)) {
      expect(sql).toMatch(
        new RegExp(`create or replace function public\\.${name}`, "i")
      );
    }
    expect(COLLABORATION_WORKSPACE_RPCS.revokeInvite).toBe(
      "revoke_collaboration_workspace_invite"
    );
    expect(COLLABORATION_WORKSPACE_RPCS.leaveWorkspace).toBe(
      "leave_collaboration_workspace"
    );
    expect(sql).not.toMatch(/link_collaboration_workspace_resource/i);
    expect(sql).not.toMatch(/unlink_collaboration_workspace_resource/i);
    for (const t of COLLABORATION_RESOURCE_TYPES_RESERVED) {
      expect(sql).toContain(`'${t}'`);
    }
  });

  it("invite security: token hash, peer protection, ownership GUC", () => {
    const invite = fnBody(sql, "invite_collaboration_workspace_member");
    expect(invite).toMatch(/encode\(gen_random_bytes\(32\), 'hex'\)/);
    expect(invite).toMatch(/extensions\.digest/);
    expect(invite).toMatch(/Invite role cannot be owner/);
    expect(invite).toMatch(/Cannot assign a role above your own/);

    const update = fnBody(sql, "update_collaboration_workspace_member_role");
    expect(update).toMatch(/Peer-admin protection/);
    expect(update).toMatch(/Cannot change the active owner role/);

    const transfer = fnBody(sql, "transfer_collaboration_workspace_ownership");
    expect(transfer).toMatch(/umtuba\.collaboration_ownership_transfer/);
    expect(transfer).toMatch(/New owner must be an active workspace member/);
  });

  it("does not call is_platform_admin on anon policies", () => {
    expect(sql).not.toMatch(
      /to anon[\s\S]{0,200}is_platform_admin/i
    );
    expect(sql).not.toMatch(/grant select[^\n]+to anon/i);
  });

  it("permission constants stay workspace-plane only", () => {
    expect(COLLABORATION_WORKSPACE_PERMISSIONS.manage_members).toEqual([
      "owner",
      "admin",
    ]);
    expect(COLLABORATION_WORKSPACE_ROLES).not.toContain("instructor");
    expect(COLLABORATION_WORKSPACE_ROLES).not.toContain("store_manager");
  });
});
