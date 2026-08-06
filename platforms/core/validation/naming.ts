/**
 * Naming rule helpers for UM Core machine IDs (Standards §2).
 * Pure predicates — no I/O.
 */

/** Single segment: leading letter, then lowercase letters/digits/underscore. */
const SEGMENT = "[a-z][a-z0-9_]*";

/** Dotted machine ID used for platforms, modules, capabilities, events, flags. */
const MACHINE_ID = new RegExp(`^${SEGMENT}(?:\\.${SEGMENT})*$`);

/** Conservative version token suitable for platform/capability/schema versions. */
const VERSION_TOKEN = /^[0-9]+(?:\.[0-9A-Za-z]+)*(?:[-+][0-9A-Za-z.]+)*$/;

export function isNonEmptyTrimmed(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function isUmMachineId(value: string): boolean {
  return MACHINE_ID.test(value);
}

export function isUmVersionToken(value: string): boolean {
  return VERSION_TOKEN.test(value.trim());
}

/**
 * Capability / event IDs SHOULD be scoped under the platform id as a prefix.
 * Example: platform `commerce` → capability `commerce.checkout.capture`.
 */
export function isScopedUnderPlatform(
  artifactId: string,
  platformId: string,
): boolean {
  return (
    artifactId === platformId || artifactId.startsWith(`${platformId}.`)
  );
}
