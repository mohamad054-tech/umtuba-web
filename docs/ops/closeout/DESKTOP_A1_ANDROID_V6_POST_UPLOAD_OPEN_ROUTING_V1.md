# DESKTOP_A1_ANDROID_V6_POST_UPLOAD_OPEN_ROUTING_V1

**DEVICE:** DESKTOP-A1  
**DATE:** 2026-08-16  
**TASK_ID:** DESKTOP_A1_ANDROID_V6_POST_UPLOAD_OPEN_ROUTING_V1  
**PACKAGE:** `com.umtuba.app`  
**KIND:** Open-after-publish routing fix + versionCode 7 build/device/Play loop. No Production submit.

Installed v6 binary (`f1dbd1cc`, versionCode 6) **uploads/publishes successfully**. Defect is Open routing to generic Watch.

```
V6_SOURCE_SHA = f1dbd1cc84fcb96d4784c9e664bf417ee4ad8604
FIX_SHA = 7841b7263ae9b30a096bfdb147c1fa67dfcb491b
UPLOAD_SUCCESS = YES
NEW_VIDEO_ID_CAPTURED = NO (v6 binary drops postId)
OPEN_ROUTE_CURRENT = /(tabs)/watch
OPEN_ROUTE_EXPECTED = /(tabs)/watch?post=<publishedPostId>
BUG_REPRODUCED = YES
ROOT_CAUSE = dropped ID + generic Watch route
FIX_IMPLEMENTED = YES
TARGETED_TESTS = PASS
TYPECHECK = PASS
NEW_BUILD_REQUIRED = YES
RECOMMENDED_VERSION_CODE = 7
PLAY_V6_ACTION = leave Closed Testing v6 in place until a passing v7 replaces it
PRODUCTION_SUBMISSION = NO
```

---

## Status (this packet is live — fields below update as the loop finishes)

v7 binaries now exist. Consume evidence from `DESKTOP_A1_ANDROID_V7_BUILD_EVIDENCE_V1.md`. Fold6 Open retest and Closed Testing are still **NOT_PERFORMED**. This packet is not a full-loop FINAL RETURN.

```
EAS_V7_BUILD = PASS
A2_CONSUME_ARTIFACTS = GO
FOLD6_V7_INSTALL = NOT_PERFORMED
CLOSED_TESTING_V7 = NOT_PERFORMED
PRODUCTION_SUBMISSION = NO
```

See **FINAL RETURN** at the bottom.
