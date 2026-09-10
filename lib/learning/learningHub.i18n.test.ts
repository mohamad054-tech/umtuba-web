import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES,
  getLocaleDirection,
  translate,
} from "../i18n";
import { formatDate } from "../i18n/format";
import { MESSAGE_CATALOGS } from "../i18n/messages/catalogs";
import {
  LEARNING_HUB_CATALOGS,
  LEARNING_HUB_MESSAGE_KEYS,
  learningHubEnMessages,
} from "../i18n/messages/learningHubCatalogs";
import type { LearningHubMessages } from "../i18n/messages/types";

const ROOT = process.cwd();
const PLACEHOLDER_RE = /\{(\w+)\}/g;
const ARABIC_LETTER = /[\u0600-\u06FF]/;

const LEAK_KEYS: Array<keyof LearningHubMessages> = [
  "learning.hub.section.home",
  "learning.hub.section.myLearning",
  "learning.hub.section.discover",
  "learning.hub.section.oneToOne",
  "learning.home.continueEmptyCta",
  "learning.oneToOne.book",
  "learning.oneToOne.noTimes",
  "learning.oneToOne.paymentDisabled",
];

const HUB_SOURCES = [
  "app/components/learning/hub/LearningHubNav.tsx",
  "app/components/learning/hub/LearningHubShell.tsx",
  "app/components/learning/hub/LearningHubPanels.tsx",
  "app/components/learning/hub/OneToOnePanel.tsx",
  "app/components/learning/hub/TeacherAvailabilityPanel.tsx",
  "app/components/learning/home/LearningDashboardView.tsx",
  "app/components/learning/home/LearningGreeting.tsx",
  "app/components/learning/home/ContinueLearningCard.tsx",
  "app/components/learning/home/OneToOnePreview.tsx",
  "app/learning/page.tsx",
];

const FORBIDDEN_LITERALS = [
  '"Overview"',
  '"Courses & lessons"',
  '"Partner marketplace"',
  '"Book session"',
  '"No times are available."',
  '"Find a teacher"',
  '"Teacher availability"',
  '"Available times"',
  '"Discover courses"',
];

function placeholders(value: string): string[] {
  return [...value.matchAll(PLACEHOLDER_RE)].map((match) => match[1]).sort();
}

describe("Learning Hub i18n completeness", () => {
  it("covers every hub key in all supported locales without empties", () => {
    expect(SUPPORTED_LOCALES).toHaveLength(13);
    expect(Object.keys(LEARNING_HUB_CATALOGS)).toHaveLength(13);
    expect(DEFAULT_LOCALE).toBe("en");
    expect(LEARNING_HUB_MESSAGE_KEYS.length).toBeGreaterThan(40);
    for (const locale of SUPPORTED_LOCALES) {
      expect(Object.keys(LEARNING_HUB_CATALOGS[locale]).sort()).toEqual(
        [...LEARNING_HUB_MESSAGE_KEYS].sort()
      );
    }

    let missing = 0;
    let empty = 0;
    let placeholderMismatches = 0;

    for (const locale of SUPPORTED_LOCALES) {
      const catalog = MESSAGE_CATALOGS[locale];
      for (const key of LEARNING_HUB_MESSAGE_KEYS) {
        const value = catalog[key];
        if (typeof value !== "string") {
          missing += 1;
          continue;
        }
        if (value.trim().length === 0) {
          empty += 1;
          continue;
        }
        const rendered = translate(locale, key, {
          values: { start: "A", end: "B" },
        });
        expect(rendered).not.toBe(key);
        expect(rendered).not.toBe("[object Object]");
        if (
          placeholders(value).join(",") !==
          placeholders(learningHubEnMessages[key]).join(",")
        ) {
          placeholderMismatches += 1;
        }
      }
    }

    expect(missing).toBe(0);
    expect(empty).toBe(0);
    expect(placeholderMismatches).toBe(0);
  });

  it("keeps professional native chrome instead of English leakage", () => {
    for (const locale of SUPPORTED_LOCALES) {
      if (locale === "en") continue;
      for (const key of LEAK_KEYS) {
        expect(translate(locale, key), `${locale} ${key}`).not.toBe(
          learningHubEnMessages[key]
        );
      }
    }
    expect(translate("ar", "learning.hub.section.home")).toMatch(ARABIC_LETTER);
    expect(translate("ar", "learning.oneToOne.book")).toMatch(ARABIC_LETTER);
    expect(translate("fr", "learning.hub.section.home")).toBe("Accueil");
    expect(translate("fr", "learning.hub.section.courses")).toBe(
      "Cours et leçons"
    );
  });

  it("marks Arabic RTL and formats 1-to-1 times with locale Intl", () => {
    expect(getLocaleDirection("ar")).toBe("rtl");
    expect(getLocaleDirection("en")).toBe("ltr");
    expect(getLocaleDirection("fr")).toBe("ltr");
    const instant = "2026-09-10T15:00:00.000Z";
    const en = formatDate("en", instant, {
      dateStyle: "medium",
      timeStyle: "short",
    });
    const ar = formatDate("ar", instant, {
      dateStyle: "medium",
      timeStyle: "short",
    });
    const fr = formatDate("fr", instant, {
      dateStyle: "medium",
      timeStyle: "short",
    });
    expect(en.length).toBeGreaterThan(0);
    expect(ar.length).toBeGreaterThan(0);
    expect(fr.length).toBeGreaterThan(0);
    expect(ar).not.toBe(en);
    expect(translate("en", "learning.oneToOne.range", {
      values: { start: en, end: en },
    })).toContain(en);
  });

  it("does not hardcode hub chrome English in new surfaces", () => {
    for (const rel of HUB_SOURCES) {
      const source = readFileSync(join(ROOT, rel), "utf8");
      for (const literal of FORBIDDEN_LITERALS) {
        expect(source, `${rel} ${literal}`).not.toContain(literal);
      }
    }
  });
});
