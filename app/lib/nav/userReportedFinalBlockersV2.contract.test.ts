import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { APP_ROUTES } from "./routes";

const ROOT = process.cwd();

function read(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8");
}

/**
 * CENTRAL_A1_USER_REPORTED_FINAL_BLOCKERS_V2 — source contracts that lock the
 * six user-reported final blockers so they cannot silently regress.
 */
describe("A1 user-reported final blockers V2", () => {
  it("VIDEO SAVE persists for authenticated users and routes logged-out to auth", () => {
    const rail = read("app/components/video/VideoActionRail.tsx");
    // Save persists through the server action (not a silent local no-op).
    expect(rail).toMatch(/async function handleSave\(/);
    expect(rail).toMatch(/toggleSaveAction\(postId\)/);
    // Logged-out (requiresAuth) must go to login, never fail silently.
    expect(rail).toMatch(/if \(result\.requiresAuth\) redirectToLogin\(\)/);
    expect(rail).toMatch(/APP_ROUTES\.login\}\?next=/);

    // Real (Supabase) videos persist; only demo fallback stays local.
    const overlay = read("app/components/video/VideoOverlay.tsx");
    expect(overlay).toMatch(/persist=\{video\.source === "supabase"\}/);
  });

  it("FOLLOW primary label is Following (never Unfollow as primary)", () => {
    const follow = read("app/components/social/FollowButton.tsx");
    expect(follow).toMatch(
      /following \? t\("social\.following"\) : t\("social\.follow"\)/
    );
    // No "Unfollow" primary label anywhere in the control.
    expect(follow).not.toMatch(/"Unfollow"/);
    expect(follow).not.toMatch(/>\s*Unfollow\s*</);
  });

  it("LOGIN success redirects to Profile by default and does not strand the user", () => {
    const login = read("app/login/page.tsx");
    expect(login).toMatch(
      /getSafeRedirectPath\(\s*searchParams\.get\("next"\),\s*APP_ROUTES\.profile\s*\)/
    );
    // Full document assign so session cookies ride the next request.
    // Soft replace+refresh can strand an authenticated user on /login.
    expect(login).toMatch(/assignAfterAuthSuccess\(nextPath\)/);
    expect(login).not.toMatch(/router\.replace\(nextPath\)/);
    expect(login).not.toMatch(/router\.push\(nextPath\)/);
    expect(APP_ROUTES.profile).toBe("/profile");
  });

  it("BETA public-trial wording removed from user-visible surfaces", () => {
    expect(read("app/terms/page.tsx")).not.toMatch(/Beta/);
    expect(read("app/privacy/page.tsx")).not.toMatch(/Beta/);
    expect(read("app/components/legal/LegalDocumentPage.tsx")).not.toMatch(
      /Legal · Beta/
    );
    expect(
      read("app/learning/lessons/[lessonId]/ai-tutor/page.tsx")
    ).not.toMatch(/for this Beta/);
    const meta = read("lib/site/routeMetadata.ts");
    expect(meta).not.toMatch(/Beta soft launch/);
    const games = read("app/games/page.tsx");
    expect(games).not.toMatch(/Unavailable in this Beta/);
    expect(games).not.toMatch(/Alpha Beta Productization/);
    expect(games).not.toMatch(/\bBeta\b/);
    expect(games).not.toMatch(/\btrial\b/i);
  });

  it("START EXPLORING goes to a content-exploration surface, not Home", () => {
    const hero = read("app/components/landing/LandingHero.tsx");
    // Primary CTA now opens the Watch content/exploration feed.
    expect(hero).toMatch(/router\.push\(APP_ROUTES\.watch\)/);
    // It must NOT drop the user on Home (the /discover alias resolves to `/`).
    expect(hero).not.toMatch(/router\.push\(APP_ROUTES\.discover\)/);
    expect(APP_ROUTES.watch).toBe("/watch");
    expect(APP_ROUTES.discover).toBe("/discover");
  });

  it("VIDEO DELETE menu is edge-safe and RTL/LTR safe", () => {
    const control = read("app/components/social/OwnerContentDeleteControl.tsx");
    // Portaled + viewport-clamped so overflow-hidden parents cannot clip it.
    expect(control).toMatch(/clampDeleteMenuBox/);
    expect(control).toMatch(/createPortal/);
    expect(control).not.toMatch(/\bright-0\b/);
    // Never exceed the viewport on 360/390/430 widths.
    expect(control).toMatch(/max-w-\[calc\(100vw-1\.5rem\)\]/);
    // Destructive action keeps a full 44px touch target (not clipped/tiny).
    expect(control).toMatch(/min-h-\[44px\][^]*?Delete/);
    const videos = read("app/profile/components/ProfileVideoGrid.tsx");
    const photos = read("app/profile/components/ProfilePhotosPanel.tsx");
    expect(videos).toMatch(/absolute end-2 top-2/);
    expect(videos).not.toMatch(/\bright-2\b/);
    expect(photos).toMatch(/absolute end-1 top-1/);
    expect(photos).not.toMatch(/\bright-1\b/);
  });
});
