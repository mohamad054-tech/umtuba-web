# LAPTOP_PREFETCH_CHANGE_HANDOFF_RECOVERY_V3

**TASK_ID:** `LAPTOP_PREFETCH_CHANGE_HANDOFF_RECOVERY_V3`  
**CONTINUE_FROM:** `LAPTOP_PREFETCH_OPTIMIZATION_DEPLOYMENT_VALIDATION_V2`  
**MODE:** CONTINUE_EXISTING_CHECKPOINT  
**PRIORITY:** PERFORMANCE_CLOSEOUT  
**Date:** 2026-08-13

## Locked (not re-investigated)

- ROOT_CAUSE = HOME_LINK_PREFETCH_STORM
- LOCAL_FIX = VERIFIED (`prefetch={false}`)
- NAV_TESTS = 68 PASS
- TSC = PASS
- Current blocker = PRODUCTION_DEPLOY_ACCESS

## Execution context

```
SOURCE_WORKTREE = C:/Users/Admin/Desktop/umtuba/umtuba-web
SOURCE_BRANCH = office/um-core-platform-manifest-validation-p2
SOURCE_HEAD = 99300de78530b25bc19dff877926919957de6d06
```

## Isolation result

```
PREFETCH_DIFF_ISOLATED = YES
CHANGED_FILES = [
  "app/discover/components/HomeSectionCircles.tsx",
  "app/components/AppTopNav.tsx",
  "app/components/AppMobileBottomNav.tsx"
]
READY_FOR_CENTRAL_INTEGRATION = YES
COMMIT_READY = YES
```

### Diff character

- Exactly **4 insertions**, **0 deletions**
- Each insertion is only `prefetch={false}` on an existing `next/link` `<Link>`
- No unrelated edits inside these three files
- No other **code** WIP outside `docs/ai/` (docs handoff noise only — do not include in integration commit)

### Contaminating WIP

| Class | Status |
|-------|--------|
| Prefetch nav (3 files) | **Include** |
| `docs/ai/*` modified/untracked | **Exclude** from performance deploy commit |
| Other app/lib code | **None** |

## Patch artifact

- Repo: `docs/ai/PREFETCH_FALSE_NAV_V1.patch`
- Outbox: `transfer/outbox/PREFETCH_FALSE_NAV_V1.patch`

Apply on a clean tree at/near HEAD `99300de` (same 3-file base):

```bash
git apply --check docs/ai/PREFETCH_FALSE_NAV_V1.patch
git apply docs/ai/PREFETCH_FALSE_NAV_V1.patch
```

**Verified on Laptop:** `git apply --check` = **PASS** against clean HEAD (working-tree stash method); patch re-applied successfully.

## Clean unified diff

```diff
diff --git a/app/components/AppMobileBottomNav.tsx b/app/components/AppMobileBottomNav.tsx
index 9a99cb1..1372f02 100644
--- a/app/components/AppMobileBottomNav.tsx
+++ b/app/components/AppMobileBottomNav.tsx
@@ -149,6 +149,7 @@ export default function AppMobileBottomNav() {
             <li key={item.id} className="min-w-0 flex-1">
               <Link
                 href={href}
+                prefetch={false}
                 aria-current={active ? "page" : undefined}
                 aria-label={item.label}
                 className={`watch-focus-ring flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1 text-[10px] font-bold transition ${
diff --git a/app/components/AppTopNav.tsx b/app/components/AppTopNav.tsx
index 89dbe33..ee83197 100644
--- a/app/components/AppTopNav.tsx
+++ b/app/components/AppTopNav.tsx
@@ -66,6 +66,7 @@ export default function AppTopNav({
               <Link
                 key={item.href}
                 href={item.href}
+                prefetch={false}
                 aria-current={active ? "page" : undefined}
                 className={`watch-focus-ring rounded-full px-2.5 py-1.5 text-[11px] font-bold transition sm:px-3 sm:text-xs focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-300/60 ${
                   active
@@ -88,6 +89,7 @@ export default function AppTopNav({
           ) : null}
           <Link
             href={APP_ROUTES.search}
+            prefetch={false}
             aria-label="Search"
             aria-current={
               pathname === APP_ROUTES.search ||
diff --git a/app/discover/components/HomeSectionCircles.tsx b/app/discover/components/HomeSectionCircles.tsx
index 3aad761..d351005 100644
--- a/app/discover/components/HomeSectionCircles.tsx
+++ b/app/discover/components/HomeSectionCircles.tsx
@@ -23,6 +23,7 @@ export default function HomeSectionCircles() {
           <li key={section.href} className="shrink-0">
             <Link
               href={section.href}
+              prefetch={false}
               className="watch-focus-ring group flex w-[4.5rem] flex-col items-center gap-1.5"
             >
               <span className="flex h-12 w-12 items-center justify-center rounded-full border border-white/12 bg-white/[0.06] text-lg shadow-[0_0_20px_rgba(59,130,246,0.12)] transition group-hover:border-white/25 group-hover:bg-white/[0.1]">
```

## Central integration path (when deploy access available — same task, no new GO)

1. Apply patch or stage **only** the three files above
2. Suggested commit message (when Central/user authorizes commit):  
   `perf(nav): disable Link prefetch on home/platform chrome to cut RSC storm`
3. Run: `npx vitest run app/lib/nav` · `npx tsc --noEmit` · `npm run build` (as required by workflow)
4. Integrate via canonical production path and deploy
5. Prove live: home should no longer burst ~36 `?_rsc=` prefetches for section/nav targets
6. Remeasure BEFORE→AFTER (TTFB / fetch count / load)

## Explicit non-actions (this Laptop wave)

- NO production deploy
- NO DNS / Cloudflare / cPanel
- NO DB / migrations
- NO Learning / Collaboration domain edits
- NO LB003
- NO git commit/push from this recovery wave (COMMIT_READY only)

## Status

```
DEPLOYMENT_EXECUTED = NO
MEASURED_IMPROVEMENT = NO
NEW_CURRENT_RELEASE_BLOCKER_FOUND = NO
BLOCKER_REMAINING = PRODUCTION_DEPLOY_ACCESS
LAPTOP_STATUS_AFTER_REPORT = PREFETCH_HANDOFF_READY_WAITING_CENTRAL_DEPLOY
```
