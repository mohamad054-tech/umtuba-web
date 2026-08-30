# PC2 — 2026-08-30 end-of-day preservation

```text
TASK_ID = PC2_UMTUBA_2026_08_30_END_OF_DAY_PRESERVATION
STATUS = PRESERVED
DEVICE = PC2
HP_MODEL = HP Z440 Workstation
DATE = 2026-08-30
PRODUCTION_TOUCHED = NO
REBOOT_INITIATED = NO
BIOS_VTX_TOMORROW = REQUIRED
```

Owner is shutting down PC2. This file is tomorrow’s start point. Do **not** repeat completed audits or completed implementation.

---

## Tomorrow FIRST TASK

```text
Restart
→ F10 BIOS
→ Security
→ System Security
→ Virtualization Technology (VTx)
→ Enabled
→ Save
→ boot Windows
→ continue WSL2
→ Docker Desktop
→ Local Supabase
→ Communications runtime/RLS
→ Rich Profile runtime/RLS
```

Do **not** reboot tonight. Do **not** apply `20260915` / `20260916` to production. Do **not** merge to Central / `alpha-0.2`. Do **not** deploy, Play, or App Store.

Continue environment work from `docs/ai/PC2_UMTUBA_LOCAL_SUPABASE_RUNTIME_ENVIRONMENT_V1.md`. Windows features are already Enabled (`NoRestart`). Firmware VTx is still **disabled**.

---

## Do not repeat tomorrow

Already complete today (resume from these SHAs; do not re-audit or re-implement):

| Work | Status | SHA / branch |
| --- | --- | --- |
| UM Life Part 1B-A social home | Implemented + owner-review report | `4d4953d8` / tip `8ab99fba` on `pc2/um-life-part1b-a-social-home-candidate` |
| Rich Profile Part 2A | Implemented | `c4f0fbfc` on `pc2/um-life-rich-personal-profile-v1-part2a` |
| Rich Profile Part 2B schema/editor | Implemented + schema report | `3d6ed0eb` / tip `455fdca8` on `pc2/um-life-rich-personal-profile-v1-part2b` |
| Communications Part 1B identity/discovery | Implemented + discovery security | `1abfb94d` / tip `866749ed` on `pc2/umtuba-communications-v1-part1b-identity-discovery` |
| Communications mobile entry | Implemented | `a660e19` on `pc2/umtuba-communications-v1-part1b-mobile-entry` |
| UM Life Home Entry web | Implemented + webpack compile gate + Next 16 PageProps build **PASS** | product `09155b15` / branch tip after docs `ab3f7b03` on `pc2/umtuba-um-life-home-entry-v1` |
| UM Life Home Entry mobile | Implemented | `4d07bd6` on `pc2/umtuba-um-life-home-entry-v1` |
| Next 16 PageProps/searchParams contract | Build gate PASS | `09155b15` |
| Local Supabase Windows-side enable | Stopped at firmware VTx | docs only; no Docker / no local DB |
| Machine audit (HP Z440, VTx off) | Complete | do not re-audit hardware identity |

---

## Required product candidates (owner SHAs)

| Role | Full SHA | Branch |
| --- | --- | --- |
| UM Life web (build PASS) | `09155b158228df7b5523d2388a53a02481f98726` | `pc2/umtuba-um-life-home-entry-v1` |
| UM Life web branch tip (docs after PASS) | `ab3f7b03dcafe8bc70d96b4641e4cdc3188b5bcf` | same |
| UM Life mobile | `4d07bd6c0eca5514a2e4df139203d929c9943b68` | `pc2/umtuba-um-life-home-entry-v1` |
| Communications web | `866749ed76ac1975deeceeb73dfa42c333ed05bd` | `pc2/umtuba-communications-v1-part1b-identity-discovery` |
| Communications mobile | `a660e196bb7f1c1276f8a94f69783632c32d3658` | `pc2/umtuba-communications-v1-part1b-mobile-entry` |
| Authorized mobile base | `09e94f80775855d7e2036fa7d83d63b9202fb8a4` | `pc2/a3-android-unused-permissions-v2` (also UM Life mobile parent) |
| Part 1B-A social feat | `4d4953d8` | `pc2/um-life-part1b-a-social-home-candidate~1` |
| Part 1B-A social tip | `8ab99fba6c02267c7efc576dd6ff79d131b52b5f` | `pc2/um-life-part1b-a-social-home-candidate` |
| Rich Profile 2A | `c4f0fbfc810eb39bfd48b13e933a41374df2df93` | `pc2/um-life-rich-personal-profile-v1-part2a` |
| Rich Profile 2B impl | `3d6ed0eb` | `pc2/um-life-rich-personal-profile-v1-part2b~1` |
| Rich Profile 2B tip | `455fdca8805b39cc5716861583109a4ab6600dbe` | `pc2/um-life-rich-personal-profile-v1-part2b` |
| EAS-preview divergent mobile | `77e9e287e117fc9a19f9a5df1596f69b0b8bf07f` | `pc2/eas-preview-config-v1` — **not** the comms/UM Life candidate |

Lineage on UM Life web: `866749ed` → `a04cc4a8` (nav) → `b67a7b33` (comms server-action boundary) → `09155b15` (PageProps) → `ab3f7b03` (docs).

---

## Worktrees (today’s trees)

| Path | Branch | HEAD |
| --- | --- | --- |
| `C:\Users\Giga store\Desktop\umtuba\umtuba-web-translation-trunk-port-v1` | `pc2/umtuba-communications-v1-part1b-identity-discovery` | `866749ed` + this EOD docs commit |
| `C:\Users\Giga store\Desktop\umtuba\umtuba-web-um-life-home-entry-v1` | `pc2/umtuba-um-life-home-entry-v1` | `ab3f7b03` (product `09155b15`) |
| `C:\Users\Giga store\Desktop\umtuba\umtuba-mobile` | `pc2/eas-preview-config-v1` | `77e9e287` |
| `C:\Users\Giga store\Desktop\umtuba\umtuba-mobile-pc2-comms-part1b-entry` | `pc2/umtuba-communications-v1-part1b-mobile-entry` | `a660e19` clean |
| `C:\Users\Giga store\Desktop\umtuba\umtuba-mobile-um-life-home-entry-v1` | `pc2/umtuba-um-life-home-entry-v1` | `4d07bd6` clean |

Many historical PC2-A1/A2 iOS/Store worktrees remain on disk. Not deleted. Not used tomorrow unless a later task names them.

---

## Migrations (in git, NOT applied to production)

| File | Tracked at | Applied locally | Applied production |
| --- | --- | --- | --- |
| `supabase/migrations/20260915_rich_personal_profile_foundation_v1.sql` | `3d6ed0eb` | NO (no local Supabase) | **NO** |
| `supabase/migrations/20260916_communications_identity_discovery_v1.sql` | `866749ed` | NO (no local Supabase) | **NO** |

```text
PRODUCTION_MIGRATIONS_APPLIED = NO
PRODUCTION_DATABASE_CHANGED = NO
PRODUCTION_DATA_CHANGED = NO
```

Pending **local** validation only, after VTx → WSL2 → Docker → `supabase start`.

---

## Local Supabase / BIOS checkpoint

```text
HP_MODEL = HP Z440 Workstation
BIOS = Hewlett-Packard M60 v02.50, 2019-11-07
VIRTUALIZATION_FIRMWARE_ENABLED = NO
WSL_FEATURES_ENABLED = YES
WSL_RUNTIME_READY = NO
DOCKER_DESKTOP = NOT_INSTALLED
LOCAL_SUPABASE_STARTED = NO
REBOOT_REQUIRED = YES
REBOOT_INITIATED = NO
BIOS_MENU_PATH = F10 Computer Setup → Security → System Security → Virtualization Technology (VTx)
```

Full environment report: `docs/ai/PC2_UMTUBA_LOCAL_SUPABASE_RUNTIME_ENVIRONMENT_V1.md`.

---

## Commits made this preservation pass

| Repo / branch | Commit | What |
| --- | --- | --- |
| web `pc2/umtuba-um-life-home-entry-v1` | `ab3f7b03` | Build-gate report + PageProps SHA stamp |
| web `pc2/umtuba-communications-v1-part1b-identity-discovery` | this EOD docs commit | Checkpoint + CURRENT_TASK + CURSOR_REPORT + local Supabase env doc |

---

## Left uncommitted (preserved on disk — do not delete)

### Unattributed / historical (comms web worktree)

- `M .env.example` — Android App Links comment only; not today’s product task
- `M vitest.config.ts` — adds `lib/android` + `lib/sandbox` test globs
- Untracked historical PC2 A1–A3 / iOS / Store / partnership docs under `docs/ai/`
- Untracked `app/sandbox/`, `lib/sandbox/`, `lib/android/`, `lib/learning/learningProviderContracts*`, `lib/store/commerceProviderContracts*`, `scripts/sandbox/`, `app.json`, `app/.well-known/assetlinks.json/`
- Probe logs (`_a2_inventory_vitest.log`, `_d1_money_locale_vitest.log`, …)
- Nested `worktrees/_pc2_*` QA dirs
- Duplicate `docs/ai/PC2_UMTUBA_UM_LIFE_HOME_ENTRY_V1_BUILD_GATE.md` copy in the comms tree (canonical committed on UM Life branch)
- stash `stash@{0}: On office/pc2-a3-ready: pc2-a3-pre-audit-temp` — not popped

### Mobile primary `pc2/eas-preview-config-v1` @ `77e9e287`

- `M docs/ai/CURSOR_REPORT.md`
- Untracked App Store screenshot zip/folder
- Untracked `worktrees/`
- stash `stash@{0}: On pc2/ios-app-store-execution-prep-v2: pc2-a2-temp-local-dirty`

---

## Push record

Filled after `git push -u origin <branch>` (normal push only). See `CURSOR_REPORT.md` if this section is updated in the same commit vs post-push note.

Intended backup remotes (`origin` = `https://github.com/mohamad054-tech/umtuba-web.git` / `umtuba-mobile.git`):

**Web:** `pc2/umtuba-um-life-home-entry-v1`, `pc2/umtuba-communications-v1-part1b-identity-discovery`, `pc2/um-life-rich-personal-profile-v1-part2b`, `pc2/um-life-part1b-a-social-home-candidate`, `pc2/um-life-rich-personal-profile-v1-part2a`

**Mobile:** `pc2/umtuba-um-life-home-entry-v1`, `pc2/umtuba-communications-v1-part1b-mobile-entry`, `pc2/eas-preview-config-v1` (already on remote at `77e9e287`)
