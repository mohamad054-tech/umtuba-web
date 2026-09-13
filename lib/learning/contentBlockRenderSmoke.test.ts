/**
 * Learning Production Smoke — content-block renderer coverage (all creatable types).
 * Uses react-dom/server static markup; no browser / DB.
 */

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import ContentBlockRenderer from "../../app/components/learning/ContentBlockRenderer";
import {
  escapeHtmlText,
  isCreatableContentBlockType,
  isSafeHttpUrl,
} from "./contentBlockRender";
import {
  ALL_CREATABLE_TYPES,
  CREATABLE_BLOCK_FIXTURES,
  FALLBACK_BLOCK_FIXTURES,
} from "./contentBlockSmokeFixtures";

function renderBlock(block: Parameters<typeof ContentBlockRenderer>[0]["block"]) {
  return renderToStaticMarkup(
    createElement(ContentBlockRenderer, { block })
  );
}

describe("content block renderer smoke", () => {
  it("covers every creatable block type with non-empty safe markup", () => {
    const failures: string[] = [];
    for (const type of ALL_CREATABLE_TYPES) {
      const fixture = CREATABLE_BLOCK_FIXTURES[type];
      expect(isCreatableContentBlockType(fixture.block_type)).toBe(true);
      let html = "";
      try {
        html = renderBlock(fixture);
      } catch (err) {
        failures.push(`${type}: threw ${String(err)}`);
        continue;
      }
      if (!html || html.trim().length === 0) {
        failures.push(`${type}: blank markup`);
      }
      if (html.includes("<script>") || html.includes("javascript:")) {
        failures.push(`${type}: unsafe markup leaked`);
      }
    }
    expect(failures, failures.join(" | ")).toEqual([]);
  });

  it("escapes rich_text angle brackets as React text (no raw script tags)", () => {
    const html = renderBlock(CREATABLE_BLOCK_FIXTURES.rich_text);
    expect(html).toContain("Hello learner");
    expect(html).not.toContain("<script>alert(1)</script>");
    // React escapes to entities in attributes/text; ensure raw script tag absent
    expect(html.toLowerCase()).not.toMatch(/<script[\s>]/);
  });

  it("fail-closes unsupported / invalid payloads without crashing", () => {
    const failures: string[] = [];
    for (const { name, block } of FALLBACK_BLOCK_FIXTURES) {
      let html = "THREW";
      try {
        html = renderBlock(block);
      } catch (err) {
        failures.push(`${name}: threw ${String(err)}`);
        continue;
      }
      if (html !== "") {
        failures.push(`${name}: expected null/empty, got ${html.slice(0, 80)}`);
      }
    }
    expect(failures, failures.join(" | ")).toEqual([]);
  });

  it("rejects unsafe URL schemes at helper layer", () => {
    expect(isSafeHttpUrl("https://ok.example")).toBe(true);
    expect(isSafeHttpUrl("http://ok.example")).toBe(true);
    expect(isSafeHttpUrl("javascript:alert(1)")).toBe(false);
    expect(isSafeHttpUrl("data:text/html,x")).toBe(false);
    expect(isSafeHttpUrl("/relative")).toBe(false);
    expect(escapeHtmlText("<b>x</b>")).toBe("&lt;b&gt;x&lt;/b&gt;");
  });
});
