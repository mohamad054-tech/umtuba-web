import type {
  AiCapabilityCatalogEntry,
  AiCapabilityLifecycle,
  CapabilityCompatibilityResult,
  CapabilityValidationResult,
} from "./types";

const LIFECYCLES: ReadonlySet<AiCapabilityLifecycle> = new Set([
  "draft",
  "registered",
  "active",
  "deprecated",
  "retired",
  "planned",
]);

const KNOWN_PROVIDER_HINTS = new Set([
  "openai",
  "gemini",
  "anthropic",
  "local",
  "stub",
  "external-provider-contract",
  "umtuba-private",
  "umtuba-local",
  "contract-test",
]);

const KNOWN_RUNTIME_HINTS = new Set([
  "shared_ai_gateway",
  "assistant_runtime",
  "learning_tutor",
  "private_ai_runtime",
]);

export function validateCapabilityEntry(
  entry: AiCapabilityCatalogEntry,
  existingIds: Set<string>
): CapabilityValidationResult {
  const errors: string[] = [];

  if (!entry.capabilityId?.trim()) errors.push("capabilityId_required");
  if (existingIds.has(entry.capabilityId)) {
    errors.push("duplicate_capability_id");
  }
  if (!entry.displayName?.trim()) errors.push("displayName_required");
  if (!entry.version?.trim()) errors.push("version_required");
  if (!LIFECYCLES.has(entry.lifecycle)) errors.push("invalid_lifecycle");
  if (!entry.owner?.trim()) errors.push("owner_required");
  if (!entry.documentation?.sourceModule) {
    errors.push("missing_documentation_source");
  }
  if (entry.executable && entry.executionSurface === "hub_placeholder") {
    errors.push("hub_placeholder_cannot_be_executable");
  }
  if (
    entry.executable &&
    entry.executionSurface === "shared_ai_service" &&
    entry.supportedProviders.length < 1
  ) {
    errors.push("missing_supported_providers");
  }
  if (
    entry.executable &&
    entry.executionSurface === "shared_ai_service" &&
    entry.supportedRuntimes.length < 1
  ) {
    errors.push("missing_supported_runtimes");
  }
  for (const p of entry.supportedProviders) {
    if (!KNOWN_PROVIDER_HINTS.has(p)) {
      errors.push(`invalid_provider_${p}`);
    }
  }
  for (const r of entry.supportedRuntimes) {
    if (!KNOWN_RUNTIME_HINTS.has(r)) {
      errors.push(`invalid_runtime_${r}`);
    }
  }
  if (
    entry.deprecated &&
    entry.lifecycle !== "deprecated" &&
    entry.lifecycle !== "retired"
  ) {
    errors.push("deprecated_flag_lifecycle_mismatch");
  }
  if (
    entry.replacementCapabilityId &&
    entry.replacementCapabilityId === entry.capabilityId
  ) {
    errors.push("replacement_cannot_be_self");
  }
  if (
    entry.timeoutPolicy.defaultTimeoutMs <= 0 ||
    entry.timeoutPolicy.maxTimeoutMs < entry.timeoutPolicy.defaultTimeoutMs
  ) {
    errors.push("invalid_timeout_policy");
  }
  if (entry.retryPolicy.maxAttempts < 1) {
    errors.push("invalid_retry_policy");
  }

  return { ok: errors.length === 0, errors };
}

export function checkCapabilityCompatibility(
  entry: AiCapabilityCatalogEntry,
  opts?: {
    providerId?: string | null;
    runtimeKind?: string | null;
    requireExecutable?: boolean;
    requirePermission?: string | null;
  }
): CapabilityCompatibilityResult {
  const blockers: string[] = [];
  if (opts?.requireExecutable && !entry.executable) {
    blockers.push("not_executable");
  }
  if (entry.lifecycle === "retired") blockers.push("lifecycle_retired");
  if (entry.lifecycle === "planned" && opts?.requireExecutable) {
    blockers.push("lifecycle_planned");
  }
  if (
    opts?.providerId &&
    entry.supportedProviders.length > 0 &&
    !entry.supportedProviders.includes(opts.providerId)
  ) {
    blockers.push("provider_incompatible");
  }
  if (
    opts?.runtimeKind &&
    entry.supportedRuntimes.length > 0 &&
    !entry.supportedRuntimes.includes(opts.runtimeKind)
  ) {
    blockers.push("runtime_incompatible");
  }
  if (
    opts?.requirePermission &&
    entry.requiredPermissions.length > 0 &&
    !entry.requiredPermissions.includes(opts.requirePermission) &&
    !entry.requiredPermissions.includes("*")
  ) {
    blockers.push("permission_incompatible");
  }
  return { ok: blockers.length === 0, blockers };
}

/** Semver-ish: exact match or major.minor compatible when requested is prefix. */
export function versionsCompatible(
  registeredVersion: string,
  requestedVersion: string | null | undefined
): boolean {
  if (!requestedVersion) return true;
  if (registeredVersion === requestedVersion) return true;
  const [rMaj, rMin] = registeredVersion.split(".");
  const [qMaj, qMin] = requestedVersion.split(".");
  if (rMaj && qMaj && rMaj === qMaj) {
    if (!qMin) return true;
    return rMin === qMin;
  }
  return false;
}
