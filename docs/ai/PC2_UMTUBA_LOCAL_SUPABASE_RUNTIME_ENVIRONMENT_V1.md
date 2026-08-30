# PC2 isolated local Supabase runtime — environment checkpoint

```text
TASK_ID = PC2_UMTUBA_LOCAL_SUPABASE_RUNTIME_ENVIRONMENT_V1
STATUS = FIRMWARE_VTX_DISABLED
PRIMARY_TARGET = LOCAL
PRODUCTION_TOUCHED = NO
REBOOT_REQUIRED = YES
REBOOT_INITIATED = NO
CURRENT_WORK_PRESERVED = YES
HP_MODEL = HP Z440 Workstation
```

Do not treat this as PASS. Firmware Intel VT-x is disabled and cannot be changed from Windows. Docker, local Supabase, migrations, test users, and runtime gates were **not** started. Production was not used as a workaround.

---

## OUTPUT

```text
TASK_ID = PC2_UMTUBA_LOCAL_SUPABASE_RUNTIME_ENVIRONMENT_V1
STATUS = FIRMWARE_VTX_DISABLED
PRIMARY_TARGET = LOCAL
PRODUCTION = STRICTLY_FORBIDDEN
PRODUCTION_DATABASE_CHANGED = NO
PRODUCTION_DATA_CHANGED = NO
WEB_PRODUCTION_CHANGED = NO
PLAY_UPLOAD = NO
APP_STORE_UPLOAD = NO
REBOOT_REQUIRED = YES
REBOOT_INITIATED = NO
CURRENT_WORK_PRESERVED = YES
WSL_INSTALLED_BEFORE = NO
WSL_FEATURES_ENABLED = YES
WSL_RUNTIME_READY = NO
VIRTUALIZATION_FIRMWARE_ENABLED = NO
HYPERVISOR_PRESENT = NO
HYPER_V_FEATURE_ENABLED = YES
CONTAINERS_FEATURE_ENABLED = YES
DOCKER_DESKTOP = NOT_INSTALLED
DOCKER_ENGINE_RUNNING = NO
LOCAL_SUPABASE_STARTED = NO
TARGET_CONFIRMED_LOCAL = NOT_STARTED
DATABASE_HISTORY_APPLIED = NOT_STARTED
COMMUNICATIONS_MIGRATION_APPLIED = NO
RICH_PROFILE_MIGRATION_APPLIED = NO
TEST_USERS_CREATED = NO
COMMS_1B_RUNTIME_AUTHENTICATED = NOT_TESTED
PHONE_VERIFICATION_RUNTIME = FOUNDATION_ONLY
UNVERIFIED_PHONE_DISCOVERY_BLOCKED = NOT_TESTED
RICH_PROFILE_CRUD_RLS = NOT_TESTED
WEB_AGAINST_LOCAL = NOT_STARTED
EXISTING_NPM_RUN_DEV_LEFT_RUNNING = YES
MOBILE_SOURCE_CHANGED = NO
MOBILE_09E94F8_PRESERVED = YES
MOBILE_A660E19_PRESERVED = YES
UM_LIFE_NAV_WORKTREE_UNTOUCHED = YES
PRODUCT_SOURCE_CHANGED = NO
HP_MODEL = HP Z440 Workstation
BIOS_MENU_PATH = F10 Computer Setup → Security → System Security → Virtualization Technology (VTx)
OWNER_PHYSICAL_ACTIONS_ONLY = Restart the PC. At the HP screen tap F10. Open Security → System Security. Set Virtualization Technology (VTx) to Enabled. Press F10 to save and leave setup. If VTx is greyed out: Security → System Security → restore security to factory defaults, then set VTx to Enabled and F10 save.
BLOCKER_IF_ANY = Intel VT-x disabled in HP Z440 firmware (Win32_Processor.VirtualizationFirmwareEnabled=False; systeminfo Virtualization Enabled In Firmware=No). Cannot be enabled from Windows. WSL2/Docker/local Supabase cannot start until VTx is Enabled. Reboot not initiated: UM Life nav uncommitted; npm run dev still on :3000.
READY_FOR_COMMUNICATIONS_PART2_AUTHORIZATION = NO
READY_FOR_RICH_PROFILE_PRODUCTION_GATE = NO
```

---

## Continue-pass hardware identity (exact)

| Field | Value |
| --- | --- |
| Manufacturer | Hewlett-Packard |
| Model | **HP Z440 Workstation** |
| SKU | L8W58UC#ABU |
| Hostname | DESKTOP-NJOEHQB |
| Chassis | 6 (mini tower / desktop workstation) |
| Baseboard | HP 212B v1.01 |
| Serial | CZC6387719 (not a secret; asset ID) |
| BIOS | Hewlett-Packard M60 v02.50, 2019-11-07 |
| CPU | Intel Xeon E5-1650 v3 @ 3.50 GHz (VT-x capable) |
| `VirtualizationFirmwareEnabled` | **False** |
| systeminfo Virtualization Enabled In Firmware | **No** |
| HypervisorPresent | False |

Z440 Computer Setup path is documented in the HP Z440/Z640/Z840 Maintenance and Service Guide (Security → System Security → Virtualization Technology (VTx)) and matches HP workstation VTx guidance. A Windows-only reboot cannot flip this flag.

---

## Step 1 — Machine safety audit (no software removed)

| Check | Result |
| --- | --- |
| OS | Microsoft Windows 11 Pro, 10.0.26100 Build 26100 |
| Machine | **HP Z440 Workstation** (L8W58UC#ABU), DESKTOP-NJOEHQB, BIOS M60 v02.50 (2019-11-07) |
| CPU | Intel Xeon E5-1650 v3 @ 3.50 GHz (VT-x capable; firmware flag off) |
| RAM | 65,443 MB |
| Disk C: | ~45.21 GB free / ~177.62 GB used |
| Disk D: | ~931.29 GB free (prefer Docker data here after reboot) |
| Disk E: | ~207.18 GB free |
| WSL runtime | Still not installed/usable until VTx + reboot (`wsl --status` install hint) |
| Windows features now Enabled (NoRestart) | WSL, VirtualMachinePlatform, HypervisorPlatform, Containers, Microsoft-Hyper-V-All |
| Docker Desktop | Not installed; `docker` not on PATH |
| HypervisorPresent | False |
| Virtualization Enabled In Firmware | **False** (hard WSL2 prerequisite; not programmable) |
| VM Monitor Mode Extensions | Yes |
| SLAT | Yes |
| Session admin token | False (elevation via UAC used only for feature enable) |
| Existing tools | Left in place. Nothing uninstalled. |

### Exact audit excerpts

```text
OS Name:                       Microsoft Windows 11 Pro
OS Version:                    10.0.26100 N/A Build 26100
System Type:                   x64-based PC
BIOS Version:                  Hewlett-Packard M60 v02.50, 11/07/2019
Total Physical Memory:         65,443 MB
Virtualization-based security: Status: Not enabled
Hyper-V Requirements:          VM Monitor Mode Extensions: Yes
                               Virtualization Enabled In Firmware: No
HyperVisorPresent=False
HyperVRequirementVirtualizationFirmwareEnabled=False
```

---

## Git / worktree safety (before any reboot)

`git fetch --prune` ran. No merge, rebase, reset, stash, or force.

| Tree | Branch | HEAD | Notes |
| --- | --- | --- | --- |
| web workspace | `pc2/umtuba-communications-v1-part1b-identity-discovery` | `866749ed76ac1975deeceeb73dfa42c333ed05bd` | Candidate SHA confirmed. Pre-existing uncommitted docs/logs/sandbox dirt left untouched. Stash forbidden. |
| web UM Life worktree `C:\Users\Giga store\Desktop\umtuba\umtuba-web-um-life-home-entry-v1` | `pc2/umtuba-um-life-home-entry-v1` | `866749ed` | **Still uncommitted nav** (more files than first checkpoint: nav contracts/tests + i18n + `app/life/`). Not checked out, reset, merged, or stashed. |
| mobile primary | `pc2/eas-preview-config-v1` | `77e9e287` | Left as-is. Not used as implementation base. |
| mobile comms worktree | `pc2/umtuba-communications-v1-part1b-mobile-entry` | `a660e196bb7f1c1276f8a94f69783632c32d3658` | Preserved. |
| mobile UM Life worktree | `pc2/umtuba-um-life-home-entry-v1` | `09e94f80775855d7e2036fa7d83d63b9202fb8a4` | Preserved. |

Uncommitted UM Life web paths as of this continue-pass (do not lose; disk files survive reboot, unsaved editor buffers do not):

```text
 M app/components/AppMobileBottomNav.tsx
 M app/components/AppTopNav.tsx
 M app/lib/nav/deepLinkAliasContract.test.ts
 M app/lib/nav/deepLinkAliasContract.ts
 M app/lib/nav/index.ts
 M app/lib/nav/mobileNav.test.ts
 M app/lib/nav/mobileNav.ts
 M app/lib/nav/mobileWorldAffordanceContract.test.ts
 M app/lib/nav/mobileWorldAffordanceContract.ts
 M app/lib/nav/pageAssembly.test.ts
 M app/lib/nav/platformNavContract.test.ts
 M app/lib/nav/platformNavContract.ts
 M app/lib/nav/routes.ts
 M app/lib/nav/shellCoherence.test.ts
 M app/lib/nav/userMenuItems.test.ts
 M app/lib/nav/userMenuItems.ts
 M lib/i18n/appShellTranslation.test.ts
 M lib/i18n/messages/ar.ts
 M lib/i18n/messages/en.ts
 M lib/i18n/messages/types.ts
 M lib/i18n/shellLabels.ts
?? app/components/nav/
?? app/lib/nav/umLifeHomeEntry.test.ts
?? app/lib/nav/umLifeHomeEntry.ts
?? app/life/
```

Existing `npm run dev` in this web workspace is still running (Next listens on **:3000**, PID 20848). Not retargeted. Not killed.

There is a leftover stash `stash@{0}: On office/pc2-a3-ready: pc2-a3-pre-audit-temp` — not popped, not dropped.

---

## Step 2 — Enable WSL2

Supported Microsoft mechanism only. Elevated PowerShell (`RunAs`, UAC approved, `IS_ADMIN=True`):

```text
Enable-WindowsOptionalFeature -Online -FeatureName Microsoft-Windows-Subsystem-Linux -All -NoRestart
Enable-WindowsOptionalFeature -Online -FeatureName VirtualMachinePlatform -All -NoRestart
```

Result:

```text
WARNING: Restart is suppressed because NoRestart is specified.
Microsoft-Windows-Subsystem-Linux State=Enabled  RestartNeeded=True
VirtualMachinePlatform            State=Enabled  RestartNeeded=True
```

Continue-pass also enabled (elevated, `NoRestart`): `HypervisorPlatform`, `Containers`, `Microsoft-Hyper-V-All` → State=Enabled, RestartNeeded=True.

Post-enable `wsl --status` still reports “Windows Subsystem for Linux is not installed” because firmware VTx is off and reboot was **not** initiated.

**Reboot not initiated** because:

1. UM Life nav worktree has uncommitted files.
2. `npm run dev` and other agent processes are running.
3. Task says prefer STOP after enable when reboot would interrupt UM Life nav.
4. Firmware virtualization is still off; a Windows-only reboot is not sufficient for WSL2.

---

## Steps 3–12 — not started (stop after WSL enable)

| Step | Status |
| --- | --- |
| 3 Docker Desktop WSL2 backend | NOT_STARTED (needs working WSL2) |
| 4–6 `supabase start` + history + `20260916` | NOT_STARTED |
| 7 Rich profile `20260915` local apply | NOT_STARTED (file present; not applied) |
| 8 TEST_USER_A / TEST_USER_B | NOT_CREATED |
| 9–11 Comms 1B + phone + profile RLS | NOT_TESTED |
| 12 Separate Next against local | NOT_STARTED (port 3000 left on existing cloud-remote env) |

Verified read-only: `supabase/config.toml` `project_id = umtuba-web`, API port `54321`, DB port `54322`, `major_version = 17`. CLI `npx supabase` **2.116.0**. Nothing listening on 54321.

Migrations exist and were **not** edited or applied:

- `supabase/migrations/20260916_communications_identity_discovery_v1.sql`
- `supabase/migrations/20260915_rich_personal_profile_foundation_v1.sql`

Historical note (unchanged): `docs/operations/MIGRATION_BASELINE_CUTOVER_PLAN_V1.md` records production history vs local `supabase/migrations/` is not a safe 1:1 chronology. A future isolated `db reset` may fail on older files. Do not silently edit historical migrations.

---

## Step 13 — Mobile (no source changes)

Preserved SHAs: `09e94f8` (authorized base / UM Life mobile worktree) and `a660e19` (comms mobile candidate). Primary mobile tree remains `77e9e287`. No Expo launch. No device QA.

### Expo → local Supabase endpoint strategy (document only)

After local `supabase start`, use a **process-local / shell-local** env for Expo — do not retarget production `.env` in the primary mobile tree.

From `a660e19` `src/lib/env.ts`, the app reads only:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

Suggested isolated values after local start (keys come from `npx supabase status` on the **local** stack only):

| Client | `EXPO_PUBLIC_SUPABASE_URL` |
| --- | --- |
| iOS Simulator | `http://127.0.0.1:54321` |
| Android emulator | `http://10.0.2.2:54321` |
| Physical device on LAN | `http://<PC2-LAN-IPv4>:54321` (Windows firewall allow that port only if needed; no public daemon expose) |

Do not put the service-role key in Expo. Do not point a device build at production for this gate. Device QA remains unauthorized until the local stack is isolated and confirmed.

---

## Resume after owner enables VTx

Owner physical action only (this agent cannot do it): F10 → Security → System Security → Virtualization Technology (VTx) → Enabled → F10 save.

After Windows is back and UM Life work is safe, a follow-up agent continues Docker Desktop WSL2 backend + local `supabase start` on `866749ed` only. Do not use production.

---

## Security

No production project, auth.users, or comms rows were read or written. No service-role key printed. No new paid cloud project. No product source edits.
