# DESKTOP_V5_REAL_PACKET_BYTES_DELIVERY_V1

**DEVICE:** DESKTOP  
**DEVICE_ROLE:** ANDROID_GOOGLE_PLAY_PRIMARY / V5_SOURCE_OWNER  
**CENTRAL_COORDINATOR:** SERVER  
**MODE:** RELEASE_CRITICAL / EVIDENCE_BACKED / BYTES_DELIVERY_ONLY  
**DATE:** 2026-08-14 (~19:21 first pass; ~20:00 SURGICAL_TRANSPORT_ONLY re-GO)  
**TASK_ID:** DESKTOP_V5_REAL_PACKET_BYTES_DELIVERY_V1  
**PRIORITY:** RELEASE_CRITICAL  
**WEB:** `C:\Users\1\Desktop\umtuba\umtuba-web`  
**MOBILE:** `C:\Users\1\Desktop\umtuba\umtuba-mobile` (not mutated)

Central blocker: `DESKTOP_V5_BUILD_GO = NO` because `REAL_PACKET_BYTES_NOT_ON_CENTRAL`.  
This task delivered the **existing** v5 packet bytes through the approved SMB intake. Did **not** recreate the delta. Did **not** rebuild. Did **not** EAS. Did **not** invent a commit. Did **not** upload to Play. Did **not** apply migrations.

The receipt is **not** the delivery. The patch bytes are.

---

## DESKTOP REPORT

```
DESKTOP REPORT
TASK_ID = DESKTOP_V5_REAL_PACKET_BYTES_DELIVERY_V1
V5_PACKET_SOURCE_PATH = C:\Users\1\Desktop\umtuba\umtuba-web\docs\ops\closeout\v5-source-deposit
V5_PACKET_FILE_COUNT = 32
V5_PACKET_SIZE = 277209
V5_PACKET_CHECKSUM = 3a73f43035859980c010936c9fa5aa226f10b54c04e3ca4e35888e169fe05ec1
TRANSFER_PERFORMED = YES
CENTRAL_PACKET_PATH = \\192.168.88.11\umtuba-multi-agent-desktop\intake\Desktop\DESKTOP_V5_REAL_PACKET_BYTES_DELIVERY_V1
CENTRAL_BYTES_PRESENT = YES
CENTRAL_FILES_NONZERO = YES
CENTRAL_FILES_READABLE = YES
CENTRAL_CHECKSUM_MATCH = YES
CENTRAL_CAN_OPEN_V5_PATCH = YES
CENTRAL_RECEIVED = YES
V5_BUILD_PERFORMED = NO
BLOCKERS = none for bytes delivery; DESKTOP_V5_BUILD_GO still NO until Central reruns SOURCE ACCEPTANCE
CENTRAL_ACTION_REQUIRED = rerun SOURCE ACCEPTANCE on the intake v5.patch (71755 bytes, SHA256 3a73f43035859980c010936c9fa5aa226f10b54c04e3ca4e35888e169fe05ec1). Do not treat RECEIPT.txt as the packet. If accepted, send DESKTOP_V5_BUILD_GO = YES plus V5_ACCEPTED_SOURCE_SHA.
```

---

## Verdict

| Field | Result |
| --- | --- |
| Local packet complete | **YES** — `v5.patch` 71755 bytes, starts with `diff --git`, plus manifest / checksums / 22 `files/` / test evidence / prior closeout. Zero-byte files: none. |
| Recreated delta | **NO** |
| Transfer | **YES** — unbuffered `robocopy /COPY:DAT /J /IS /IT` of all packet files (re-GO overwrite 32/32) |
| Central-side open | **YES** — UNC `Get-Content` first lines are `diff --git` / `---` / `+++` |
| Central-side hash | **YES** — remote SHA256 matches local and claimed `3a73f430…fe05ec1` |
| `checksums.sha256` rematch | **23/23 OK** on the Central-visible copy |
| `CENTRAL_RECEIVED` | **YES** — from Central-side open + hash, not from Desktop-local copy alone |
| `DESKTOP_V5_BUILD_GO` | **NO** (unchanged; Central must rerun SOURCE ACCEPTANCE) |
| `V5_BUILD_PERFORMED` | **NO** |

**STOP. Central reruns SOURCE ACCEPTANCE only. Do not build until `DESKTOP_V5_BUILD_GO = YES`.**

---

## 1 — Locate (no new delta)

Preferred local export from `DESKTOP_ANDROID_V5_SOURCE_DEPOSIT_TO_CENTRAL_V1` was present and complete:

`C:\Users\1\Desktop\umtuba\umtuba-web\docs\ops\closeout\v5-source-deposit\`

| Required | Bytes | Status |
| --- | ---: | --- |
| `v5.patch` | 71755 | PRESENT — `diff --git a/app/(auth)/signup.tsx …` |
| `checksums.sha256` | 2282 | PRESENT |
| `MANIFEST.md` / `MANIFEST.json` | 4171 / 2316 | PRESENT — base `3b335610ced48aa2595fe49eef5b97511c7f4cb5`, 22 files |
| `README.md` | 1326 | PRESENT |
| `TEST_EVIDENCE.md` | 1018 | PRESENT |
| `DESKTOP_A1_ANDROID_V5_SOURCE_FINALIZATION_V1.md` | 12934 | PRESENT |
| `DESKTOP_ANDROID_V5_SOURCE_DEPOSIT_TO_CENTRAL_V1.md` | 7445 | PRESENT |
| `files/` (22 V5_REQUIRED copies) | non-zero | PRESENT |
| Packet file count / total | 32 / 277209 | no zero-byte files (31 original + this-task receipt) |

Local `v5.patch` SHA256 = `3a73f43035859980c010936c9fa5aa226f10b54c04e3ca4e35888e169fe05ec1` (matches claimed). Mobile WT was **not** opened for export and was **not** mutated.

---

## 2 — Why Central may have said bytes were missing

Approved transport (unchanged): `\\192.168.88.11\umtuba-multi-agent-desktop\intake\Desktop\`

Before this copy, the **prior** folder already listed a 71755-byte `v5.patch` with the matching hash and real diff headers. Offline Files / CSC is **absent** on Desktop (not a local stub cache). Share comment still says “read-only”; `intake\Desktop` is writable from Desktop.

Likely Central-side miss (not an empty packet):

1. Prior `RECEIPT.txt` still said `CENTRAL_RECEIVED=NO` (that task refused to claim received). A1 watches reported that flag. Central may have treated the receipt as the delivery.
2. Central may have looked at `inbox\Desktop\` (AUTH_ENV pubkey drop). Inbox has **no** v5 packet.
3. Central may have looked for this TASK_ID folder, which did not exist until this pass.

This pass does **not** invent a new channel. It places a fresh binary copy under the same intake, named for this TASK_ID, and refreshes the known prior folder.

`inbox` was **not** used (not the approved v5 transport).

---

## 3 — Copy

Unbuffered binary `robocopy` (not a pointer / shortcut):

```text
robocopy <local v5-source-deposit> <dest> /E /COPY:DAT /DCOPY:DAT /J /IS /IT /R:1 /W:1
```

| Destination | Result |
| --- | --- |
| `\\192.168.88.11\umtuba-multi-agent-desktop\intake\Desktop\DESKTOP_V5_REAL_PACKET_BYTES_DELIVERY_V1\` | First pass: 31 New File. Re-GO: **32/32 overwritten** / FAILED=0 (robocopy exit 1 = copied OK) |
| `\\192.168.88.11\umtuba-multi-agent-desktop\intake\Desktop\DESKTOP_ANDROID_V5_SOURCE_DEPOSIT_TO_CENTRAL_V1\` | Both passes: **overwrite** (`/IS /IT`) / FAILED=0 |

Excluded: secrets, `.env`, AAB, keystore (none were in the source packet).

---

## 4 — Central-side verify (UNC as Central sees the share)

Performed against **both** intake folders via `Get-ChildItem` / `Get-Content` / `Get-FileHash` on the UNC path (not the Desktop-local tree).

| Check | New TASK_ID folder | Prior known folder |
| --- | --- | --- |
| Visible | YES (32 files after re-GO) | YES (32 files after re-GO) |
| Total bytes | 277209 | 277209 |
| Zero-byte files | 0 | 0 |
| `v5.patch` size | 71755 | 71755 |
| SHA256 | `3a73f43035859980c010936c9fa5aa226f10b54c04e3ca4e35888e169fe05ec1` | same |
| First line | `diff --git a/app/(auth)/signup.tsx b/app/(auth)/signup.tsx` | same |
| Also contains | `---` / `+++` hunk headers | same |
| `checksums.sha256` | 23/23 match | 23/23 match |
| Size vs local | 0 mismatches | 0 mismatches |

`CENTRAL_RECEIVED = YES` is claimed **only** because this Central-visible open + hash succeeded.

---

## 5 — No build

`V5_BUILD_PERFORMED = NO`.  
`DESKTOP_V5_BUILD_GO` remains **NO**. Do not weaken it. Central must rerun SOURCE ACCEPTANCE.

---

## Exact files changed (this task — web docs only)

- `docs/ops/closeout/DESKTOP_V5_REAL_PACKET_BYTES_DELIVERY_V1.md` (this file)
- `docs/ops/closeout/v5-source-deposit/RECEIPT_REAL_PACKET_BYTES_DELIVERY_V1.txt`
- `docs/ai/CURRENT_TASK.md`
- `docs/ai/CURSOR_REPORT.md`
- `docs/ai/PROJECT_STATE.md`

Mobile product files: **not modified**.

---

## STOP

Central: open `v5.patch` on

`\\192.168.88.11\umtuba-multi-agent-desktop\intake\Desktop\DESKTOP_V5_REAL_PACKET_BYTES_DELIVERY_V1\v5.patch`

(or the refreshed twin under `DESKTOP_ANDROID_V5_SOURCE_DEPOSIT_TO_CENTRAL_V1`). Confirm SHA256 `3a73f43035859980c010936c9fa5aa226f10b54c04e3ca4e35888e169fe05ec1`. Rerun SOURCE ACCEPTANCE. If accepted, send `DESKTOP_V5_BUILD_GO = YES` plus `V5_ACCEPTED_SOURCE_SHA`. Until then Desktop will not EAS-build v5 and will not upload v4.
