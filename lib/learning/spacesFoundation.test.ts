import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  LEARNING_SPACE_DEFAULT_MEMBER_ROLES,
  LEARNING_SPACE_HELPERS,
  LEARNING_SPACE_INVITE_ROLES,
  LEARNING_SPACE_INVITE_STATUSES,
  LEARNING_SPACE_MEMBER_STATUSES,
  LEARNING_SPACE_MODES,
  LEARNING_SPACE_ROLE_RANKS,
  LEARNING_SPACE_ROLES,
  LEARNING_SPACE_RPCS,
  LEARNING_SPACE_STATUSES,
  LEARNING_SPACE_VISIBILITIES,
  learningSpaceRoleAtLeast,
  learningSpaceRoleRank,
} from "./spacesFoundation";

const ROOT = process.cwd();
const MIGRATION =
  "supabase/migrations/20260828_learning_spaces_membership_foundation_v1.sql";
const DOC =
  "docs/learning/implementation/SPACES_MEMBERSHIP_FOUNDATION_V1.md";

function read(rel: string) {
  return readFileSync(join(ROOT, rel), "utf8");
}

describe("Spaces Membership Foundation V1 — files", () => {
  it("ships migration, constants module, and documentation", () => {
    expect(existsSync(join(ROOT, MIGRATION))).toBe(true);
    expect(existsSync(join(ROOT, DOC))).toBe(true);
    expect(existsSync(join(ROOT, "lib/learning/spacesFoundation.ts"))).toBe(
      true
    );
  });
});

describe("Spaces Membership Foundation V1 — TS role rank fail-closed", () => {
  it("ranks known roles and rejects unknown", () => {
    expect(learningSpaceRoleRank("owner")).toBe(100);
    expect(learningSpaceRoleRank("admin")).toBe(80);
    expect(learningSpaceRoleRank("instructor")).toBe(60);
    expect(learningSpaceRoleRank("teaching_assistant")).toBe(50);
    expect(learningSpaceRoleRank("content_editor")).toBe(40);
    expect(learningSpaceRoleRank("reviewer")).toBe(30);
    expect(learningSpaceRoleRank("viewer")).toBe(20);
    expect(learningSpaceRoleRank("superadmin")).toBeNull();
    expect(learningSpaceRoleRank("")).toBeNull();
    expect(LEARNING_SPACE_ROLE_RANKS.owner).toBe(100);
  });

  it("role_at_least fail-closes on unknown roles", () => {
    expect(learningSpaceRoleAtLeast("admin", "viewer")).toBe(true);
    expect(learningSpaceRoleAtLeast("viewer", "admin")).toBe(false);
    expect(learningSpaceRoleAtLeast("owner", "admin")).toBe(true);
    expect(learningSpaceRoleAtLeast("nope", "viewer")).toBe(false);
    expect(learningSpaceRoleAtLeast("admin", "nope")).toBe(false);
  });
});

describe("Spaces Membership Foundation V1 — constants mirror SQL", () => {
  const sql = read(MIGRATION);

  it("exposes modes, statuses, visibility, roles, invite/member statuses", () => {
    expect([...LEARNING_SPACE_MODES]).toEqual([
      "university",
      "school",
      "bootcamp",
      "company_training",
      "creator_academy",
      "personal_learning",
      "general_academy",
    ]);
    expect([...LEARNING_SPACE_STATUSES]).toEqual([
      "draft",
      "active",
      "suspended",
      "archived",
    ]);
    expect([...LEARNING_SPACE_VISIBILITIES]).toEqual([
      "private",
      "unlisted",
      "public",
    ]);
    expect([...LEARNING_SPACE_ROLES]).toEqual([
      "owner",
      "admin",
      "instructor",
      "teaching_assistant",
      "content_editor",
      "reviewer",
      "viewer",
    ]);
    expect([...LEARNING_SPACE_INVITE_ROLES]).not.toContain("owner");
    expect([...LEARNING_SPACE_MEMBER_STATUSES]).toEqual([
      "invited",
      "active",
      "suspended",
      "removed",
    ]);
    expect([...LEARNING_SPACE_INVITE_STATUSES]).toEqual([
      "pending",
      "accepted",
      "revoked",
      "expired",
    ]);
    expect([...LEARNING_SPACE_DEFAULT_MEMBER_ROLES]).toEqual([
      "viewer",
      "reviewer",
      "content_editor",
    ]);
    for (const mode of LEARNING_SPACE_MODES) {
      expect(sql).toContain(`'${mode}'`);
    }
  });

  it("names all client RPCs and helpers", () => {
    for (const name of Object.values(LEARNING_SPACE_RPCS)) {
      expect(sql).toMatch(
        new RegExp(`create or replace function public\\.${name}`, "i")
      );
    }
    for (const name of Object.values(LEARNING_SPACE_HELPERS)) {
      expect(sql).toMatch(
        new RegExp(`create or replace function public\\.${name}`, "i")
      );
    }
  });
});

describe("Spaces Membership Foundation V1 — 20 user scenarios (SQL contracts)", () => {
  const sql = read(MIGRATION);

  // 1
  it("scenario: create space as authenticated user → draft + owner membership + settings", () => {
    expect(sql).toMatch(/create or replace function public\.create_learning_space/i);
    expect(sql).toMatch(/status,\s*visibility,\s*default_language\s*\)\s*values\s*\([\s\S]*?'draft'/);
    expect(sql).toMatch(/'owner',\s*'active'/);
    expect(sql).toMatch(/insert into public\.learning_space_settings/);
    expect(sql).toMatch(/'space\.create'/);
  });

  // 2
  it("scenario: anon can only select active+public spaces (no is_platform_admin)", () => {
    expect(sql).toMatch(
      /Public read active public spaces[\s\S]*?to anon, authenticated[\s\S]*?status = 'active' and visibility = 'public'/
    );
    const publicPolicyStart = sql.indexOf(
      'create policy "Public read active public spaces"'
    );
    const publicPolicyEnd = sql.indexOf(
      'create policy "Members read own spaces"',
      publicPolicyStart
    );
    const publicPolicy = sql.slice(publicPolicyStart, publicPolicyEnd);
    expect(publicPolicy).not.toMatch(/is_platform_admin/i);
    expect(sql).toMatch(
      /World hardening lesson: public\/anon SELECT policies on spaces must NEVER/
    );
  });

  // 3
  it("scenario: platform admin reads all spaces via separate authenticated policy", () => {
    expect(sql).toMatch(
      /Platform admins read all spaces[\s\S]*?to authenticated[\s\S]*?is_platform_admin\(\)/
    );
  });

  // 4
  it("scenario: members read own spaces including private/unlisted drafts", () => {
    expect(sql).toMatch(
      /Members read own spaces[\s\S]*?is_learning_space_member\(id\)/
    );
  });

  // 5
  it("scenario: managers always invite; members only when allow_member_invites", () => {
    expect(sql).toMatch(/Member invites are disabled for this space/);
    expect(sql).toMatch(/Only owner or admin can invite administrators/);
    expect(sql).toMatch(/allow_member_invites/);
    expect(sql).toMatch(/can_manage_learning_space\(p_space_id, v_uid\)/);
  });

  // 6
  it("scenario: invite cannot assign owner role", () => {
    expect(sql).toMatch(/Invite role cannot be owner/);
    expect(sql).toMatch(
      /learning_space_invites_role_check[\s\S]*?'admin'[\s\S]*?'viewer'/
    );
    expect(sql).not.toMatch(
      /learning_space_invites_role_check[\s\S]{0,200}'owner'/
    );
  });

  // 7
  it("scenario: invite returns plaintext token once; stores sha256 hex only", () => {
    expect(sql).toMatch(
      /v_token := encode\(extensions\.gen_random_bytes\(32\), 'hex'\)/
    );
    expect(sql).toMatch(
      /v_hash := encode\(extensions\.digest\(v_token, 'sha256'\), 'hex'\)/
    );
    expect(sql).toMatch(/'token', v_token/);
    expect(sql).toMatch(/Plaintext token returned once; never stored/);
    expect(sql).toMatch(/token_hash text not null/);
  });

  // 8
  it("scenario: re-invite same user/email revokes prior pending invite", () => {
    expect(sql).toMatch(/set status = 'revoked'/);
    expect(sql).toMatch(/and status = 'pending'/);
    expect(sql).toMatch(
      /learning_space_invites_pending_user_uidx[\s\S]*?status = 'pending'/
    );
    expect(sql).toMatch(
      /learning_space_invites_pending_email_uidx[\s\S]*?lower\(invited_email\)/
    );
  });

  // 9
  it("scenario: accept invite hashes token, rejects expired/revoked/accepted", () => {
    expect(sql).toMatch(/accept_learning_space_invite/);
    expect(sql).toMatch(/Invite expired/);
    expect(sql).toMatch(/Invite is %/);
    expect(sql).toMatch(/status = 'expired'/);
    expect(sql).toMatch(/expires_at <= now\(\)/);
  });

  // 10
  it("scenario: accept requires invited_user_id match or jwt email match", () => {
    expect(sql).toMatch(/Invite is not addressed to this user/);
    expect(sql).toMatch(/Invite email does not match authenticated user/);
    expect(sql).toMatch(/auth\.jwt\(\) ->> 'email'/);
  });

  // 11
  it("scenario: update role cannot set owner or change active owner", () => {
    expect(sql).toMatch(
      /Cannot set owner via update_learning_space_member_role; use transfer/
    );
    expect(sql).toMatch(/Cannot change the active owner via this RPC/);
    expect(sql).toMatch(/Cannot assign a role above your own/);
  });

  // 12
  it("scenario: cannot suspend or remove active owner", () => {
    expect(sql).toMatch(/Cannot suspend the active owner/);
    expect(sql).toMatch(/Cannot remove the active owner/);
  });

  // 13
  it("scenario: transfer ownership GUC-gated; previous owner demoted to admin", () => {
    expect(sql).toMatch(/umtuba\.learning_ownership_transfer/);
    expect(sql).toMatch(
      /owner_user_id can only change via transfer_learning_space_ownership/
    );
    expect(sql).toMatch(/set_config\('umtuba\.learning_ownership_transfer', '1'/);
    expect(sql).toMatch(/set role = 'admin'/);
    expect(sql).toMatch(/'ownership\.transfer'/);
    expect(sql).toMatch(
      /Exactly one active owner per space \(partial unique\)/
    );
  });

  // 14
  it("scenario: exactly one active owner enforced by partial unique index", () => {
    expect(sql).toMatch(
      /learning_space_members_one_active_owner_uidx[\s\S]*?where role = 'owner' and status = 'active'/
    );
  });

  // 15
  it("scenario: owner publish draft→active; archive; platform moderate suspend/unsuspend/archive", () => {
    expect(sql).toMatch(/Only draft spaces can be published/);
    expect(sql).toMatch(/'space\.publish'/);
    expect(sql).toMatch(/'space\.archive'/);
    expect(sql).toMatch(/Platform admin required/);
    expect(sql).toMatch(
      /moderate_learning_space status must be suspended\|active\|archived/
    );
    expect(sql).toMatch(/'space\.moderation'/);
  });

  // 16
  it("scenario: clients cannot write spaces/members/invites/settings/audit", () => {
    expect(sql).toMatch(
      /revoke insert, update, delete on table public\.learning_spaces/
    );
    expect(sql).toMatch(
      /revoke insert, update, delete on table public\.learning_space_members/
    );
    expect(sql).toMatch(
      /revoke insert, update, delete on table public\.learning_space_invites/
    );
    expect(sql).toMatch(
      /revoke insert, update, delete on table public\.learning_space_settings/
    );
    expect(sql).toMatch(
      /revoke insert, update, delete on table public\.learning_audit_events/
    );
  });

  // 17
  it("scenario: FORCE RLS on members, invites, audit; spaces ENABLE RLS", () => {
    expect(sql).toMatch(
      /alter table public\.learning_space_members[\s\S]*?force row level security/i
    );
    expect(sql).toMatch(
      /alter table public\.learning_space_invites[\s\S]*?force row level security/i
    );
    expect(sql).toMatch(
      /alter table public\.learning_audit_events[\s\S]*?force row level security/i
    );
    expect(sql).toMatch(
      /alter table public\.learning_spaces enable row level security/i
    );
  });

  // 18
  it("scenario: audit append-only — forbid update/delete; no client insert; audit_write revoked", () => {
    expect(sql).toMatch(/learning_audit_events is append-only/);
    expect(sql).toMatch(/learning_audit_events_forbid_update/);
    expect(sql).toMatch(/learning_audit_events_forbid_delete/);
    expect(sql).toMatch(
      /revoke all on function public\.learning_audit_write\([\s\S]*?\)\s+from public, anon, authenticated/i
    );
    expect(sql).not.toMatch(
      /grant execute on function public\.learning_audit_write/i
    );
  });

  // 19
  it("scenario: slug/mode/language checks and role rank helpers fail-closed", () => {
    expect(sql).toMatch(/slug ~ '\^\[a-z0-9\]\+\(\?:-\[a-z0-9\]\+\)\*\$'/);
    expect(sql).toMatch(/default_language ~ '\^\[a-z\]\{2\}\(-\[A-Z\]\{2\}\)\?\$'/);
    expect(sql).toMatch(/when 'owner' then 100/);
    expect(sql).toMatch(/when 'viewer' then 20/);
    expect(sql).toMatch(/else null/);
    expect(sql).toMatch(
      /if v_role_rank is null or v_min_rank is null then\s+return false/
    );
  });

  // 20
  it("scenario: RPC grants to authenticated+service_role; helpers granted; anon revoked", () => {
    expect(sql).toMatch(
      /grant execute on function public\.create_learning_space\([\s\S]*?\)\s+to authenticated, service_role/i
    );
    expect(sql).toMatch(
      /revoke all on function public\.create_learning_space\([\s\S]*?\)\s+from public, anon/i
    );
    expect(sql).toMatch(
      /grant execute on function public\.is_learning_space_member\(uuid, uuid\)\s+to authenticated, service_role/i
    );
    expect(sql).toMatch(
      /grant execute on function public\.can_manage_learning_space\(uuid, uuid\)\s+to authenticated, service_role/i
    );
    expect(sql).toMatch(
      /grant select on table public\.learning_spaces to anon, authenticated/i
    );
    expect(sql).toMatch(/create extension if not exists pgcrypto/i);
  });
});

describe("Spaces Membership Foundation V1 — documentation", () => {
  it("documents scope, exclusions, and next slice Programs", () => {
    const doc = read(DOC);
    expect(doc).toMatch(/Spaces & Membership Foundation V1/i);
    expect(doc).toMatch(/learning_spaces/);
    expect(doc).toMatch(/ownership transfer/i);
    expect(doc).toMatch(/is_platform_admin/);
    expect(doc).toMatch(/Programs/);
    expect(doc).toMatch(/Does not include|exclusions|out of scope/i);
  });
});

describe("Spaces Membership Foundation V1 — review fixes", () => {
  const sql = read(MIGRATION);

  it("rejects invites on archived spaces", () => {
    expect(sql).toMatch(
      /invite_learning_space_member[\s\S]*?Learning space must be active for membership changes/
    );
    expect(sql).toMatch(/v_space_status is distinct from 'active'/);
  });

  it("rejects invites on suspended spaces", () => {
    // Same ACTIVE gate covers suspended and archived (status ≠ active).
    const inviteStart = sql.indexOf(
      "create or replace function public.invite_learning_space_member"
    );
    const inviteEnd = sql.indexOf(
      "create or replace function public.accept_learning_space_invite",
      inviteStart
    );
    const inviteFn = sql.slice(inviteStart, inviteEnd);
    expect(inviteFn).toContain(
      "Learning space must be active for membership changes"
    );
    expect(inviteFn).toMatch(/v_space_status is distinct from 'active'/);
  });

  it("rejects accept when space is not active (archived/suspended)", () => {
    const acceptStart = sql.indexOf(
      "create or replace function public.accept_learning_space_invite"
    );
    const acceptEnd = sql.indexOf(
      "create or replace function public.update_learning_space_member_role",
      acceptStart
    );
    const acceptFn = sql.slice(acceptStart, acceptEnd);
    expect(acceptFn).toContain(
      "Learning space must be active for membership changes"
    );
  });

  it("rejects peer-admin demotion (current target rank must be strictly below actor)", () => {
    const updateStart = sql.indexOf(
      "create or replace function public.update_learning_space_member_role"
    );
    const updateEnd = sql.indexOf(
      "create or replace function public.suspend_learning_space_member",
      updateStart
    );
    const updateFn = sql.slice(updateStart, updateEnd);
    expect(updateFn).toContain("Cannot manage a peer or higher-ranked member");
    expect(updateFn).toMatch(/v_target_rank < v_caller_rank/);
  });

  it("rejects peer-admin suspension", () => {
    const suspendStart = sql.indexOf(
      "create or replace function public.suspend_learning_space_member"
    );
    const suspendEnd = sql.indexOf(
      "create or replace function public.remove_learning_space_member",
      suspendStart
    );
    const suspendFn = sql.slice(suspendStart, suspendEnd);
    expect(suspendFn).toContain("Cannot manage a peer or higher-ranked member");
    expect(suspendFn).toMatch(/v_target_rank < v_caller_rank/);
  });

  it("rejects peer-admin removal", () => {
    const removeStart = sql.indexOf(
      "create or replace function public.remove_learning_space_member"
    );
    const removeEnd = sql.indexOf(
      "create or replace function public.transfer_learning_space_ownership",
      removeStart
    );
    const removeFn = sql.slice(removeStart, removeEnd);
    expect(removeFn).toContain("Cannot manage a peer or higher-ranked member");
    expect(removeFn).toMatch(/v_target_rank < v_caller_rank/);
  });

  it("enforces allow_member_invites for non-managers", () => {
    expect(sql).toMatch(/Member invites are disabled for this space/);
    expect(sql).toMatch(/s\.allow_member_invites/);
    expect(sql).toMatch(
      /Owners\/admins \(and platform admins\) retain invite management/
    );
  });

  it("gates full member directory on public_member_directory", () => {
    const policyStart = sql.indexOf(
      'create policy "Members read space memberships"'
    );
    const policyEnd = sql.indexOf(
      'create policy "Managers and invitees read invites"',
      policyStart
    );
    const policy = sql.slice(policyStart, policyEnd);
    expect(policy).toMatch(/user_id = \(select auth\.uid\(\)\)/);
    expect(policy).toMatch(/public_member_directory is true/);
    expect(policy).toMatch(/can_manage_learning_space\(space_id\)/);
    // Must not grant blanket member enumeration without the setting.
    expect(policy).not.toMatch(
      /user_id = \(select auth\.uid\(\)\)\s+or public\.is_learning_space_member\(space_id\)\s+or/
    );
  });

  it("validates invite email with store-consistent pattern", () => {
    expect(sql).toMatch(/learning_space_invites_email_check/);
    expect(sql).toMatch(/btrim\(invited_email\) ~ '\^\\S\+@\\S\+\\.\\S\+\$'/);
    expect(sql).toMatch(/Invite email is invalid/);
    expect(sql).toMatch(/v_email !~ '\^\\S\+@\\S\+\\.\\S\+\$'/);
  });
});
