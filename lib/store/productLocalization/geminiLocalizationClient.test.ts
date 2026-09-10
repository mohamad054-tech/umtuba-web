import { describe, expect, it } from "vitest";
import {
  backoffSeconds,
  looksLikeQuotaExhausted,
  parseRetryAfterSeconds,
  parseRetryDelayFromBody,
} from "./geminiLocalizationClient";

describe("gemini retry helpers", () => {
  it("parses Retry-After seconds and dates", () => {
    expect(parseRetryAfterSeconds("12")).toBe(12);
    expect(parseRetryAfterSeconds(null)).toBeNull();
    expect(parseRetryAfterSeconds("999")).toBe(180);
  });

  it("uses Retry-After over exponential backoff", () => {
    expect(backoffSeconds(1, 8)).toBe(8);
    expect(backoffSeconds(1, null)).toBe(15);
    expect(backoffSeconds(2, null)).toBe(30);
    expect(backoffSeconds(5, null)).toBe(180);
  });

  it("parses retryDelay from provider JSON without exposing the body", () => {
    expect(parseRetryDelayFromBody('{"retryDelay":"48s"}')).toBe(48);
    expect(looksLikeQuotaExhausted("RESOURCE_EXHAUSTED")).toBe(true);
    expect(looksLikeQuotaExhausted("rate limited, try later")).toBe(false);
  });
});
