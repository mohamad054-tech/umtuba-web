# PC2_BUILD25_FOLLOWERS_FOLLOWING_LIST_NOT_OPENING_V1

Report + read-only classification only. No product fix. No handler added. No Build 26. No Add for Review. No commit / push.

```text
TASK_ID = PC2_BUILD25_FOLLOWERS_FOLLOWING_LIST_NOT_OPENING_V1
AREA = PROFILE
DEVICE = iPhone 13
BUILD = 25
DEFECT = FOLLOWERS_FOLLOWING_LIST_NOT_OPENING
REPRODUCED_ON_PHYSICAL_IPHONE13 = YES
DO_NOT_FIX_ON_PC2 = YES
REPORT_TO_CENTRAL = YES
SOURCE_CHANGED_BY_PC2 = NO
LOCAL_FIX_ATTEMPTED = NO
BUILD26_CREATED = NO
APP_STORE_REVIEW_SUBMITTED = NO
AUTHORITATIVE_MOBILE_SHA = 21ec0311a1f0c4075b6192d512ca17c864da82a8
ROUTES_EXIST = NO
LIST_SCREENS_EXIST = NO
COUNTERS_HAVE_PRESS_HANDLERS = NO
LIST_QUERY_HELPERS_EXIST = NO
OWN_AND_OTHER_USER_SHARE_SAME_STATS_ROW = YES
LIKELY_SHARED_DEFECT = YES
IOS_ONLY_DEFECT = NO
PLAYBACK_REGRESSION_LOCK = UNCHANGED_INCOMPLETE
```

---

## Operator observation (physical iPhone 13 / Build 25)

Profile shows Followers / Following **counts**. Tap Followers or Following does **not** open a user list.

Expected:

- Tap Followers → Followers list
- Tap Following → Following list
- Row → that user’s Profile
- Back → originating Profile

```text
REPRODUCED_ON_PHYSICAL_IPHONE13 = YES
PC2_VISUAL_TAP = NO
```

---

## Read-only classification (SHA `21ec031`)

Mobile checkout: `C:/Users/Giga store/Desktop/umtuba/umtuba-mobile-pc2-ios-watch-lifecycle-build25-v1`.

### Screens / routes — missing

| Path | Role |
| --- | --- |
| `app/profile/index.tsx` — `ProfileScreen` | Own + other-user Profile (query `u` / `id`) |
| `app/profile/user.tsx` | Re-export of `index` for stacked `/profile/user` |
| `app/profile/followers.tsx` | **ABSENT** |
| `app/profile/following.tsx` | **ABSENT** |

No `FollowersList` / `FollowingList` / `listFollowers` / `listFollowing` in the mobile tree.

`src/lib/profile/profileNav.ts` only defines `STACKED_PROFILE_PATH = "/profile/user"` and Watch-origin Back. It does **not** define a followers/following stack path.

### Counters — display-only (no `onPress`)

`components/profile/ProfileStatsRow.tsx` — `ProfileStatsRow`:

- Imports `View` + `Text` only (no `Pressable`).
- Renders three `<View style={styles.stat}>` blocks: Followers, Following, Posts.
- Props are counts only. No `onFollowersPress` / `onFollowingPress` / `router`.

`app/profile/index.tsx` — `ProfileScreen` mounts:

```text
<ProfileStatsRow locale t followersCount followingCount postsCount={timeline.length} />
```

Same row for **own** (`isOwn`) and **other-user** (`otherProfile`). `ProfileActionsRow.onFollow` is the Follow **button**, not the list.

### Data — snapshot counts only

`src/lib/social/follows.ts`:

- `getProfileFollowSnapshot` → RPC `get_profile_follow_snapshot`
- `toggleProfileFollow` → RPC `toggle_profile_follow`
- Type `FollowSnapshot` = `{ following, followersCount, followingCount }`
- **No** list-of-users helper

### Web (shared product gap, not iOS-only)

`app/profile/components/ProfileStats.tsx` — `ProfileStats`: `<dl>` / `<dt>` / `<dd>` labels only. No `<a>`, no `onClick`, no `/followers` or `/following` under `app/`. No `listFollowers` / `FollowersList` in the web `app/` tree.

```text
ROUTES_EXIST = NO
COUNTERS_HAVE_PRESS_HANDLERS = NO
LIKELY_SHARED_DEFECT = YES
IOS_ONLY_DEFECT = NO
OWN_PROFILE = SAME_DEAD_STATS_ROW
OTHER_USER_PROFILE = SAME_DEAD_STATS_ROW
BACK_FROM_LIST = NOT_APPLICABLE_LIST_DOES_NOT_OPEN
```

Operator saw this on iOS Build 25. Source shape matches a **shared missing feature** (dead counters + no list routes on mobile and web), not an iOS press-system bug.

---

## Central should check

- Confirm no hidden Followers/Following route on another mobile branch
- Whether a list RPC should exist beside `get_profile_follow_snapshot`
- Own vs other-user list privacy
- Back from list → originating Profile (and Watch → @eman → Profile → list → Back must not regress the nested Profile Back gate)
- Web `ProfileStats` parity if Central implements lists

---

## Safety

- No product / shared source edit. No handler implemented.
- Playback lock **not** flipped to PASS or FAIL by this defect.
- `SOURCE_CHANGED_BY_PC2 = NO`
- `LOCAL_FIX_ATTEMPTED = NO`
- `BUILD26_CREATED = NO`

---

## Next

`RETURN_DEFECT_TO_CENTRAL`. Central owns classify-to-fix. PC2 does not implement.
