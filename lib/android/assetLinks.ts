/**
 * Android Digital Asset Links builder for verified App Links.
 *
 * Package is taken from umtuba-mobile Expo config (`com.umtuba.app`).
 * SHA-256 signing-certificate fingerprints are NEVER invented — operator
 * must supply ANDROID_APP_LINKS_SHA256 from Play Console / EAS upload
 * (and Play App Signing cert when Google holds the signing key).
 * Until then this module returns null and the well-known route stays 404.
 */

export const ANDROID_PACKAGE_NAME = "com.umtuba.app";

const SHA256_HEX_RE = /^[0-9A-F]{64}$/;

export type AndroidAssetLinkStatement = {
  relation: ["delegate_permission/common.handle_all_urls"];
  target: {
    namespace: "android_app";
    package_name: string;
    sha256_cert_fingerprints: string[];
  };
};

export function normalizeSha256Fingerprint(
  raw: string | undefined | null
): string | null {
  if (!raw || typeof raw !== "string") return null;
  const hex = raw.trim().toUpperCase().replace(/[:\s]/g, "");
  if (!SHA256_HEX_RE.test(hex)) return null;
  return hex.match(/.{2}/g)!.join(":");
}

export function parseAndroidAppLinksFingerprints(
  raw: string | undefined | null
): string[] {
  if (!raw || typeof raw !== "string") return [];
  const fingerprints: string[] = [];
  for (const part of raw.split(/[,;\n]+/)) {
    const normalized = normalizeSha256Fingerprint(part);
    if (normalized && !fingerprints.includes(normalized)) {
      fingerprints.push(normalized);
    }
  }
  return fingerprints;
}

export function buildAssetLinks(
  fingerprintsRaw: string | undefined | null
): AndroidAssetLinkStatement[] | null {
  const fingerprints = parseAndroidAppLinksFingerprints(fingerprintsRaw);
  if (fingerprints.length === 0) return null;

  return [
    {
      relation: ["delegate_permission/common.handle_all_urls"],
      target: {
        namespace: "android_app",
        package_name: ANDROID_PACKAGE_NAME,
        sha256_cert_fingerprints: fingerprints,
      },
    },
  ];
}
