import { describe, expect, it } from "vitest";
import {
  ANDROID_PACKAGE_NAME,
  buildAssetLinks,
  normalizeSha256Fingerprint,
  parseAndroidAppLinksFingerprints,
} from "./assetLinks";

const SAMPLE_HEX =
  "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
const SAMPLE_COLON =
  "01:23:45:67:89:AB:CD:EF:01:23:45:67:89:AB:CD:EF:01:23:45:67:89:AB:CD:EF:01:23:45:67:89:AB:CD:EF";

describe("assetLinks", () => {
  it("does not invent a fingerprint or serve statements without one", () => {
    expect(normalizeSha256Fingerprint(undefined)).toBeNull();
    expect(normalizeSha256Fingerprint("")).toBeNull();
    expect(normalizeSha256Fingerprint("too-short")).toBeNull();
    expect(normalizeSha256Fingerprint("PLACEHOLDER")).toBeNull();
    expect(buildAssetLinks(undefined)).toBeNull();
    expect(buildAssetLinks("")).toBeNull();
    expect(ANDROID_PACKAGE_NAME).toBe("com.umtuba.app");
  });

  it("normalizes hex and colon SHA-256 fingerprints", () => {
    expect(normalizeSha256Fingerprint(SAMPLE_HEX)).toBe(SAMPLE_COLON);
    expect(normalizeSha256Fingerprint(SAMPLE_COLON.toLowerCase())).toBe(
      SAMPLE_COLON
    );
  });

  it("builds Digital Asset Links only for well-formed fingerprints", () => {
    const statements = buildAssetLinks(`${SAMPLE_HEX},deadbeef`);
    expect(statements).toEqual([
      {
        relation: ["delegate_permission/common.handle_all_urls"],
        target: {
          namespace: "android_app",
          package_name: "com.umtuba.app",
          sha256_cert_fingerprints: [SAMPLE_COLON],
        },
      },
    ]);
  });

  it("accepts multiple authoritative fingerprints and drops duplicates", () => {
    const second =
      "FFEEDDCCBBAA99887766554433221100FFEEDDCCBBAA99887766554433221100";
    const parsed = parseAndroidAppLinksFingerprints(
      `${SAMPLE_COLON}\n${second}\n${SAMPLE_HEX}`
    );
    expect(parsed).toHaveLength(2);
    expect(parsed[0]).toBe(SAMPLE_COLON);
    expect(parsed[1]).toMatch(/^FF:EE:DD:CC/);
  });
});
