import { describe, expect, it } from "vitest";
import {
  applyMentionInsertion,
  getActiveMentionQuery,
  normalizeMentionUsername,
  splitMentionText,
} from "./mentions";

describe("mention parsing", () => {
  it("normalizes handles", () => {
    expect(normalizeMentionUsername("@Ada.Lovelace")).toBe("ada.lovelace");
    expect(normalizeMentionUsername("Maya")).toBe("maya");
  });

  it("splits clickable @mentions from surrounding text", () => {
    const parts = splitMentionText("hello @Maya and @ada_1!");
    expect(parts).toEqual([
      { kind: "text", value: "hello " },
      { kind: "mention", username: "maya", raw: "@Maya" },
      { kind: "text", value: " and " },
      { kind: "mention", username: "ada_1", raw: "@ada_1" },
      { kind: "text", value: "!" },
    ]);
  });

  it("finds the active mention at the caret", () => {
    const text = "hi @ma";
    expect(getActiveMentionQuery(text, text.length)).toEqual({
      query: "ma",
      start: 3,
      end: 6,
    });
    expect(getActiveMentionQuery("no mention", 4)).toBeNull();
    expect(getActiveMentionQuery("email a@b.com", 8)).toBeNull();
  });

  it("inserts a completed handle and moves the caret", () => {
    const text = "see @ma";
    const next = applyMentionInsertion(text, text.length, "Maya");
    expect(next?.text).toBe("see @maya ");
    expect(next?.caret).toBe("see @maya ".length);
  });
});
