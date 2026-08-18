/**
 * Partner credential hooks — presence / rotation / revocation only.
 * Never stores or returns plaintext secrets.
 */

import type { CredentialRef, CredentialStatus } from "./types";
import { CREDENTIAL_STATUSES } from "./types";

export function emptyCredentialRef(): CredentialRef {
  return {
    status: "ABSENT",
    vaultRef: null,
    rotatedAt: null,
    revokedAt: null,
    lastPresenceCheckAt: null,
  };
}

export function isCredentialStatus(value: unknown): value is CredentialStatus {
  return (
    typeof value === "string" &&
    (CREDENTIAL_STATUSES as readonly string[]).includes(value)
  );
}

export function assertNoPlaintextSecret(input: {
  vaultRef?: string | null;
  secret?: unknown;
  apiKey?: unknown;
  token?: unknown;
  password?: unknown;
}): { ok: true } | { ok: false; message: string } {
  if (input.secret != null || input.apiKey != null || input.token != null || input.password != null) {
    return {
      ok: false,
      message: "Partner credentials must never be supplied as plaintext.",
    };
  }
  const ref = (input.vaultRef ?? "").trim();
  if (ref && /^(sk-|pk_|Bearer\s|-----BEGIN)/i.test(ref)) {
    return { ok: false, message: "vaultRef looks like a secret value, not a pointer." };
  }
  return { ok: true };
}

export function markCredentialPresent(
  current: CredentialRef,
  vaultRef: string,
  at: string
): { ok: true; credential: CredentialRef } | { ok: false; message: string } {
  const check = assertNoPlaintextSecret({ vaultRef });
  if (!check.ok) return check;
  const ref = vaultRef.trim();
  if (!ref || ref.length > 128) {
    return { ok: false, message: "vaultRef must be a 1–128 character opaque pointer." };
  }
  return {
    ok: true,
    credential: {
      status: "PRESENT",
      vaultRef: ref,
      rotatedAt: current.rotatedAt,
      revokedAt: null,
      lastPresenceCheckAt: at,
    },
  };
}

export function markCredentialRotated(
  current: CredentialRef,
  nextVaultRef: string,
  at: string
): { ok: true; credential: CredentialRef } | { ok: false; message: string } {
  if (current.status === "REVOKED") {
    return { ok: false, message: "Revoked credentials cannot be rotated; issue a new ref." };
  }
  const marked = markCredentialPresent(current, nextVaultRef, at);
  if (!marked.ok) return marked;
  return {
    ok: true,
    credential: { ...marked.credential, rotatedAt: at },
  };
}

export function markCredentialRevoked(
  current: CredentialRef,
  at: string
): CredentialRef {
  return {
    status: "REVOKED",
    vaultRef: current.vaultRef,
    rotatedAt: current.rotatedAt,
    revokedAt: at,
    lastPresenceCheckAt: at,
  };
}

export function markRotationDue(current: CredentialRef): CredentialRef {
  if (current.status !== "PRESENT") return current;
  return { ...current, status: "ROTATION_DUE" };
}

/** Live partner secrets are not inventable in this foundation. */
export function canUseLivePartnerCredential(credential: CredentialRef): boolean {
  return (
    credential.status === "PRESENT" &&
    Boolean(credential.vaultRef) &&
    credential.revokedAt == null
  );
}
