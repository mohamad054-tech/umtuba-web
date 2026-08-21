import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

function read(rel: string) {
  return readFileSync(join(root, rel), "utf8");
}

describe("Arabic readability / accessibility tokens", () => {
  const css = read("app/globals.css");
  const settings = read("app/settings/SettingsExperience.tsx");
  const notifications = read("app/settings/NotificationPreferencesPanel.tsx");
  const authField = read("app/components/auth/AuthField.tsx");
  const language = read("app/components/i18n/LanguageSelector.tsx");
  const nav = read("app/components/AppTopNav.tsx");

  it("defines solid ink tokens with readable hierarchy (not alpha whites)", () => {
    expect(css).toContain("--app-ink-primary: #f4f5f8");
    expect(css).toContain("--app-ink-secondary: #d5dae6");
    expect(css).toContain("--app-ink-muted: #c2c8d6");
    expect(css).toContain("--app-ink-helper: #b4bbcc");
    expect(css).toContain("--app-ink-placeholder: #8b92a3");
    expect(css).toContain(".app-ink-primary");
    expect(css).toContain(".app-ink-secondary");
    expect(css).toContain(".app-ink-muted");
    expect(css).toContain(".app-ink-helper");
    expect(css).not.toMatch(/--app-ink-muted:\s*rgba/);
    expect(css).not.toMatch(/--app-ink-helper:\s*rgba/);
  });

  it("uses a local Arabic font stack and disables hazy smoothing/tracking", () => {
    expect(css).toContain('html[lang="ar"] body');
    expect(css).toContain("Noto Sans Arabic");
    expect(css).toContain("Segoe UI");
    expect(css).toContain("Geeza Pro");
    expect(css).toContain("-webkit-font-smoothing: auto");
    expect(css).toMatch(/html\[lang="ar"\] \[class\*="tracking-"\]/);
    expect(css).toContain('html[lang="ar"] .text-xs');
    expect(css).toContain('html[lang="ar"] .text-white\\/45');
  });

  it("keeps Settings chrome on tokens instead of dim white/45", () => {
    expect(settings).not.toMatch(/text-white\/4[05]/);
    expect(settings).not.toMatch(/text-white\/55/);
    expect(settings).toContain("app-ink-secondary");
    expect(settings).toContain("app-ink-muted");
    expect(settings).toContain("app-ink-helper");
    expect(notifications).not.toMatch(/text-white\/4[05]/);
    expect(notifications).toContain("app-ink-helper");
    expect(notifications).toContain("app-ink-primary");
  });

  it("keeps AuthField and language helper text on tokens", () => {
    expect(authField).not.toMatch(/text-white\/45/);
    expect(authField).toContain("app-ink-muted");
    expect(authField).toContain("app-ink-helper");
    expect(language).not.toMatch(/text-white\/55/);
    expect(language).toContain("app-ink-secondary");
  });

  it("preserves header design while using high-contrast inactive ink", () => {
    expect(nav).toContain("app-top-nav-link");
    expect(nav).toContain("app-top-nav-link--active");
    expect(nav).toContain("watch-focus-ring");
    expect(nav).not.toMatch(/text-white\/45/);
    expect(css).toContain("--app-top-nav-ink-inactive: #e8eaef");
    expect(css).toContain("--app-top-nav-ink-active: #dbeafe");
  });
});
