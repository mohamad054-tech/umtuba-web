# UM Learning OS — Spaces & Membership Foundation V1

Status: implemented locally (migration not applied remotely in this phase)

Migration: `supabase/migrations/20260828_learning_spaces_membership_foundation_v1.sql`

Constants: `lib/learning/spacesFoundation.ts`

## Purpose

DB-authoritative foundation for **Learning Spaces** and **membership**: create spaces, invite/accept members, role management, ownership transfer, owner publish/archive, and platform moderation — with append-only audit.

## Scope

| Included | Notes |
| --- | --- |
| `learning_spaces` | Modes, status, visibility, slug, owner |
| `learning_space_members` | Roles + status; exactly one active owner |
| `learning_space_invites` | Token-hash invites (7-day expiry) |
| `learning_space_settings` | 1:1 safe defaults |
| `learning_audit_events` | Append-only audit |
| Helpers + RPCs | SECURITY DEFINER; client writes only via RPCs |

## Exclusions (out of scope for V1)

Does not include programs, courses, lessons, modules, enrollments, content libraries, grading, certificates, billing, marketplace, or Learning UI surfaces.

**Next slice = Programs.**

## Roles

| Role | Rank |
| --- | ---: |
| owner | 100 |
| admin | 80 |
| instructor | 60 |
| teaching_assistant | 50 |
| content_editor | 40 |
| reviewer | 30 |
| viewer | 20 |

Unknown roles fail closed (`learning_space_role_rank` → null; `learning_space_role_at_least` → false).

Invite roles exclude `owner`. Default member role from settings is never `owner`/`admin` (viewer / reviewer / content_editor only).

## Space lifecycle

```
draft --publish_learning_space--> active
active|draft|* --archive_learning_space--> archived  (owner)
* --moderate_learning_space--> suspended | active | archived  (platform_admin)
```

- Create always starts as `draft` with active owner membership + default settings.
- Platform moderation sets `suspended_at` / `archived_at` as appropriate.

## Membership lifecycle

```
invite (pending) --accept--> active member
active --suspend--> suspended
active|* --remove--> removed
```

Membership mutations (invite, accept, role update, suspend, remove, ownership
transfer) require the space status to be **`active`**. Archived and suspended
spaces reject new members and membership changes.

### Invites (`allow_member_invites`)

- Owners/admins (and platform admins via `can_manage_learning_space`) always
  retain invite management.
- Non-manager members may invite only when `learning_space_settings.allow_member_invites`
  is true; otherwise invite raises `Member invites are disabled for this space`.
- Non-managers cannot invite `admin`. Invite role cannot exceed the caller's rank.
- Invite email uses the store-consistent pattern `^\S+@\S+\.\S+$` (length 3–320).

### Peer-admin protection

Role update, suspend, and remove require the target's **current** role rank to be
**strictly below** the actor's rank. Equal-rank admins cannot demote, suspend, or
remove each other (platform admin may bypass).

### Member directory (`public_member_directory`)

When `public_member_directory` is false (default), members may SELECT only their
own membership row. Full membership enumeration requires the setting to be true,
or manager / platform-admin privilege.
## Ownership transfer

`transfer_learning_space_ownership`:

1. Caller must be current owner or platform admin
2. Sets session GUC `umtuba.learning_ownership_transfer = 1`
3. Updates `learning_spaces.owner_user_id`
4. Demotes previous owner membership to **admin** (active)
5. Upserts new owner membership as **owner** (active)
6. Clears GUC; audits `ownership.transfer`

Direct client `UPDATE` of `owner_user_id` is blocked by trigger unless the GUC is set.

Partial unique index enforces **exactly one active owner** per space:  
`UNIQUE (space_id) WHERE role = 'owner' AND status = 'active'`.

## Invite security

- Token: `encode(gen_random_bytes(32), 'hex')`
- Stored: `encode(digest(token, 'sha256'), 'hex')` via `extensions.digest` (pgcrypto)
- Plaintext token returned **once** from `invite_learning_space_member`; never stored
- Expiry: 7 days
- Re-invite for same user/email revokes prior pending invite
- Accept: pending + not expired; `invited_user_id = auth.uid()` **or** email match via `auth.jwt() ->> 'email'`

## RLS

**World hardening lesson:** public/anon SELECT on spaces must **never** call `is_platform_admin()`.

| Table | RLS | SELECT |
| --- | --- | --- |
| `learning_spaces` | ENABLE | anon+auth: active+public; auth members; auth platform admins (separate policy) |
| `learning_space_members` | FORCE | own row always; full directory only if `public_member_directory`; managers; platform admin |
| `learning_space_invites` | FORCE | managers / platform admin / invitee pending |
| `learning_space_settings` | ENABLE | members / platform admin |
| `learning_audit_events` | FORCE | managers / platform admin |

No client INSERT/UPDATE/DELETE on these tables — RPCs only.

## RPCs

| RPC | Who |
| --- | --- |
| `create_learning_space` | authenticated |
| `invite_learning_space_member` | owner/admin always; members if `allow_member_invites`; space must be active |
| `accept_learning_space_invite` | invitee; space must be active |
| `update_learning_space_member_role` | manage; peer-rank protected; space must be active |
| `suspend_learning_space_member` | manage; peer-rank protected; cannot suspend active owner |
| `remove_learning_space_member` | manage; peer-rank protected; cannot remove active owner |
| `transfer_learning_space_ownership` | current owner or platform admin; space must be active |
| `publish_learning_space` | owner (draft→active) |
| `archive_learning_space` | owner |
| `moderate_learning_space` | platform admin only |

Helpers used in RLS (`is_learning_space_member`, `can_manage_learning_space`, role helpers) are granted EXECUTE to authenticated + service_role.  
`learning_audit_write` is internal only (revoked from public/anon/authenticated).

## Audit

Actions include `space.create`, `invite.create`, `invite.accept`, `member.role_update`, `member.suspend`, `member.remove`, `ownership.transfer`, `space.publish`, `space.archive`, `space.moderation`.

Update/delete on `learning_audit_events` are forbidden by trigger; clients have no insert policy.
