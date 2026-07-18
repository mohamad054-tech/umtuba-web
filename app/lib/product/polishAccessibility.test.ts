import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  FRIENDLY_LOAD_ERROR,
  sanitizeUserFacingMessage,
} from "./userFacingMessage";

const ROOT = process.cwd();

function read(rel: string) {
  return readFileSync(join(ROOT, rel), "utf8");
}

describe("sanitizeUserFacingMessage", () => {
  it("keeps short human messages", () => {
    expect(sanitizeUserFacingMessage("Couldn't load videos.")).toBe(
      "Couldn't load videos."
    );
  });

  it("replaces technical leakage", () => {
    expect(sanitizeUserFacingMessage("relation posts does not exist SQL")).toBe(
      "Something went wrong. Please try again."
    );
    expect(sanitizeUserFacingMessage("Error in app/foo.tsx stack")).toBe(
      "Something went wrong. Please try again."
    );
    expect(sanitizeUserFacingMessage("SUPABASE_KEY missing")).toBe(
      "Something went wrong. Please try again."
    );
  });

  it("falls back for empty input", () => {
    expect(sanitizeUserFacingMessage("")).toBe(
      "Something went wrong. Please try again."
    );
    expect(sanitizeUserFacingMessage(null)).toBe(
      "Something went wrong. Please try again."
    );
    expect(FRIENDLY_LOAD_ERROR).toMatch(/try again/i);
  });
});

describe("polish & accessibility contracts", () => {
  it("exposes shared loading, empty, and error primitives", () => {
    expect(read("app/components/product/ProductLoadingState.tsx")).toMatch(
      /aria-live="polite"/
    );
    expect(read("app/components/product/ProductErrorState.tsx")).toMatch(
      /role="alert"/
    );
    expect(read("app/components/product/ProductEmptyState.tsx")).toMatch(
      /role="status"/
    );
    expect(read("app/components/product/ProductEmptyState.tsx")).toMatch(
      /compact/
    );
  });

  it("gates skeleton pulse under reduced motion", () => {
    const css = read("app/globals.css");
    expect(css).toMatch(/prefers-reduced-motion:\s*reduce/);
    expect(css).toMatch(/\.product-skeleton-pulse/);
  });

  it("Watch stage accounts for mobile bottom nav offset", () => {
    const watch = read("app/watch/WatchExperience.tsx");
    expect(watch).toMatch(/--app-mobile-bottom-nav-offset/);
  });

  it("CommentsPanel, WatchPanel, and LiveCollaborationPanel use dialog a11y helper", () => {
    expect(read("app/components/social/CommentsPanel.tsx")).toMatch(
      /useDialogA11y/
    );
    expect(read("app/components/video/WatchPanel.tsx")).toMatch(/useDialogA11y/);
    expect(read("app/live/components/LiveCollaborationPanel.tsx")).toMatch(
      /useDialogA11y/
    );
    expect(read("app/lib/product/useDialogA11y.ts")).toMatch(/Escape/);
  });

  it("AuthAlert errors use role=alert and AuthCheckbox describes errors", () => {
    const alert = read("app/components/auth/AuthAlert.tsx");
    expect(alert).toMatch(/tone === "error"/);
    expect(alert).toMatch(/role=\{tone === "error" \? "alert" : "status"\}/);
    const checkbox = read("app/components/auth/AuthCheckbox.tsx");
    expect(checkbox).toMatch(/aria-describedby=\{errorId\}/);
  });

  it("surface pages use branded loading fallbacks", () => {
    expect(read("app/discover/page.tsx")).toMatch(/ProductLoadingState/);
    expect(read("app/settings/page.tsx")).toMatch(/ProductLoadingState/);
  });
});
