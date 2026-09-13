# DESKTOP_A1_ANDROID_V5_RELEASE_DECISION_HOLD_V1

**DEVICE:** DESKTOP-A1  
**DATE:** 2026-08-15  
**TASK_ID:** DESKTOP_A1_ANDROID_V5_RELEASE_DECISION_HOLD_V1  
**KIND:** Release decision record only. No implementation. No rebuild. No Closed Testing rollout.

This packet records a **HOLD**. It does not authorize a source patch, a new EAS/AAB, versionCode 6, or any Play track mutation.

---

## Decision (literal; do not upgrade any field)

```
ANDROID_V5_VERSION_CODE = 5
DEVICE_QA = PARTIAL
V5_FINAL_RELEASE_CANDIDATE = NO
BLOCKING_DEFECTS:
1. PROFILE deep-link target bug: umtuba://profile?u=eman opens viewer profile @mohamad.
2. Native Watch has no Follow/Following/Unfollow control.
SOURCE_FIX_REQUIRED = YES
NEW_BUILD_REQUIRED = YES
CURRENT_V5_ALPHA_ROLLOUT = HOLD
VERSION_CODE_5 = OBSOLETE_FOR_FINAL_RELEASE
REQUESTED_CENTRAL_ACTION = AUTHORIZE minimal source patch for PROFILE + native FOLLOW, then build next Android candidate with VERSION_CODE = 6.
DO NOT REBUILD until Central authorizes.
DO NOT ROLL OUT current v5 Closed Testing.
```

`V5_FINAL_RELEASE_CANDIDATE` stays **NO**. `DEVICE_QA` stays **PARTIAL**. Central has **not** authorized versionCode 6. This session did **not** apply the Watch-profile fix, rebuild, or roll out Alpha / Closed Testing.

---

## Installed candidate (already evidenced)

| Item | Value |
|------|--------|
| Package | `com.umtuba.app` |
| versionName | `1.0.0` |
| versionCode | **5** |
| targetSdk | **36** |
| Device | SM-F956B `RFCX718LVHK` (Galaxy Z Fold6) |
| ANDROID_SOURCE_SHA | `822d893c78505d7db99e892190510cf202cbbc6d` |

Evidence already exists (not re-run this session):

- `docs/ops/closeout/DESKTOP_A1_ANDROID_V5_FINAL_DEVICE_RELEASE_GATE_V1.md`
- `docs/ops/closeout/a1-v5-device-qa/`

---

## Device QA summary (from existing A1 gate; not re-executed)

Fold6 USB debugging was authorized. Installed package matched the v5 candidate (`1.0.0` / versionCode 5 / targetSdk 36). Functional QA ran on the **cover** display (folded).

Observed on that binary:

- Cold launch, session persistence, Watch, playback, Saved star, Messages, Create form, account-deletion entry, UGC report sheet, background resume, and no FATAL/ANR: evidenced.
- Login / Discover / fold-unfold / save-persistence / UGC block / delete-menu: **PARTIAL**.
- Real upload and upload-to-Watch playback: **NOT_RUN**.
- Live: intentionally unavailable (out of scope).

**DEVICE_QA = PARTIAL** because the install was exercised and several surfaces passed, but two release-blocking defects failed and several gates were only partial or not run. This is **not** a device PASS and **not** a final-release candidate.

---

## Blocking defects (do not upgrade)

1. **PROFILE deep-link target bug.** `umtuba://profile?u=eman` opened the signed-in viewer profile `@mohamad`, not eman. Confirmed on installed versionCode 5 / SHA `822d893`. Same class as the uncommitted Watch-profile destination fix on dirty mobile parent. **Not applied this session.**
2. **Native Watch has no Follow / Following / Unfollow control.** On `@eman` Watch there is no follow control. This is an Android app gap on `822d893` (web has a FOLLOW button). Cannot verify follow-state transitions on this binary.

These two defects keep `V5_FINAL_RELEASE_CANDIDATE = NO`.

---

## Why versionCode 5 is obsolete for final release

```
VERSION_CODE_5 = OBSOLETE_FOR_FINAL_RELEASE
```

- Installed SHA `822d893c78505d7db99e892190510cf202cbbc6d` exhibits the PROFILE `?u=` target defect on device.
- Native Watch follow control is absent on that SHA.
- A Watch-profile destination fix was previously noted as **uncommitted on dirty mobile parent**. It is **absent** from `822d893`. It must **not** be applied now.
- Therefore current v5 cannot be a profile-fix-verified or follow-capable final release. A later binary is required.

`NEW_BUILD_REQUIRED = YES`. `SOURCE_FIX_REQUIRED = YES`.

---

## What Central must authorize

```
REQUESTED_CENTRAL_ACTION = AUTHORIZE minimal source patch for PROFILE + native FOLLOW, then build next Android candidate with VERSION_CODE = 6.
```

Central has **not** authorized that action. Desktop must not treat this packet as a build GO.

If Central later authorizes, the requested scope is:

1. Minimal source patch for the PROFILE deep-link / Watch-profile target binding.
2. Minimal source patch so native Watch exposes Follow / Following / Unfollow.
3. Then build the **next** Android candidate with `VERSION_CODE = 6`.

Until that AUTHORIZE exists:

- **DO NOT REBUILD.**
- **DO NOT ROLL OUT** current v5 Closed Testing.
- **DO NOT** apply the dirty-parent Watch-profile fix from Desktop.
- **DO NOT** claim versionCode 6 is authorized.

---

## Alpha / Closed Testing HOLD

```
CURRENT_V5_ALPHA_ROLLOUT = HOLD
```

Do **not** promote, upload, or roll out the current v5 Alpha / Closed Testing candidate. Play last-known binary remains historically versionCode 3 unless a later operator packet says otherwise; this decision does not change Play. Current EAS/sideload v5 stays **HOLD**.

---

## This session (explicit non-actions)

| Action | Performed? |
|--------|------------|
| Implement PROFILE patch | **NO** |
| Implement native FOLLOW control | **NO** |
| Apply dirty-parent Watch-profile fix | **NO** |
| Rebuild / EAS / AAB / APK | **NO** |
| Closed Testing / Alpha rollout | **NO** |
| git commit / push | **NO** |
| Writes to Windows Desktop | **NO** |
| Touch `_port_extract` | **NO** |

---

## Related evidence (preserve)

- Device gate (QA evidence kept): `docs/ops/closeout/DESKTOP_A1_ANDROID_V5_FINAL_DEVICE_RELEASE_GATE_V1.md`
- Device artifacts: `docs/ops/closeout/a1-v5-device-qa/`
- Prior Watch-profile delta (do not apply now): `docs/ops/closeout/DESKTOP_WATCH_PROFILE_FIX_REAL_DELTA_DEPOSIT_V1.md` / `ANDROID_V5_WATCH_PROFILE_TARGET_FIX_V1.md`

Learning V1 remains APPROVED/FROZEN. Store ownership is not reopened. Unrelated dirty WIP is preserved.

---

## STOP

`CURRENT_V5_ALPHA_ROLLOUT = HOLD`.  
`V5_FINAL_RELEASE_CANDIDATE = NO`.  
`VERSION_CODE_5 = OBSOLETE_FOR_FINAL_RELEASE`.  

Wait Central AUTHORIZE. Do not rebuild this session. Do not roll out current v5 Closed Testing.
