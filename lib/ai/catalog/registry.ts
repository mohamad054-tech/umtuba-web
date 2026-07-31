import { buildBuiltinCapabilityCatalogEntries } from "./definitions";
import {
  checkCapabilityCompatibility,
  validateCapabilityEntry,
  versionsCompatible,
} from "./validation";
import type {
  AiCapabilityCatalogEntry,
  AiCapabilityLifecycle,
  CapabilityLookupQuery,
  CapabilityVersionNegotiation,
} from "./types";

const LIFECYCLE_FORWARD: Record<AiCapabilityLifecycle, AiCapabilityLifecycle[]> =
  {
    draft: ["registered", "retired"],
    registered: ["active", "deprecated", "retired"],
    active: ["deprecated", "retired"],
    deprecated: ["active", "retired"],
    retired: [],
    planned: ["draft", "registered", "retired"],
  };

export class AiCapabilityServiceRegistry {
  private readonly byId = new Map<string, AiCapabilityCatalogEntry>();

  constructor(seed: AiCapabilityCatalogEntry[] = []) {
    for (const entry of seed) {
      this.register(entry, { skipDuplicateCheck: false });
    }
  }

  list(): AiCapabilityCatalogEntry[] {
    return [...this.byId.values()].sort((a, b) =>
      a.capabilityId.localeCompare(b.capabilityId)
    );
  }

  lookup(capabilityId: string): AiCapabilityCatalogEntry | null {
    return this.byId.get(capabilityId) ?? null;
  }

  register(
    entry: AiCapabilityCatalogEntry,
    opts?: { skipDuplicateCheck?: boolean }
  ): AiCapabilityCatalogEntry {
    const existing = new Set(this.byId.keys());
    if (opts?.skipDuplicateCheck) {
      existing.delete(entry.capabilityId);
    }
    const validation = validateCapabilityEntry(entry, existing);
    if (!validation.ok) {
      throw new Error(
        `Invalid capability ${entry.capabilityId}: ${validation.errors.join(",")}`
      );
    }
    if (this.byId.has(entry.capabilityId) && !opts?.skipDuplicateCheck) {
      throw new Error(`Duplicate capability id: ${entry.capabilityId}`);
    }
    const now = new Date().toISOString();
    const stored: AiCapabilityCatalogEntry = {
      ...entry,
      updatedAt: now,
      registeredAt: this.byId.get(entry.capabilityId)?.registeredAt ?? now,
    };
    this.byId.set(stored.capabilityId, stored);
    return stored;
  }

  unregister(capabilityId: string): boolean {
    return this.byId.delete(capabilityId);
  }

  advanceLifecycle(
    capabilityId: string,
    to: AiCapabilityLifecycle
  ): AiCapabilityCatalogEntry {
    const current = this.lookup(capabilityId);
    if (!current) throw new Error(`Unknown capability: ${capabilityId}`);
    if (
      current.lifecycle !== to &&
      !(LIFECYCLE_FORWARD[current.lifecycle] ?? []).includes(to)
    ) {
      throw new Error(
        `Invalid capability lifecycle transition: ${current.lifecycle} → ${to}`
      );
    }
    const next: AiCapabilityCatalogEntry = {
      ...current,
      lifecycle: to,
      deprecated: to === "deprecated" || to === "retired" || current.deprecated,
      updatedAt: new Date().toISOString(),
    };
    this.byId.set(capabilityId, next);
    return next;
  }

  filter(query: CapabilityLookupQuery = {}): AiCapabilityCatalogEntry[] {
    return this.list().filter((e) => {
      if (query.category && e.category !== query.category) return false;
      if (query.lifecycle && e.lifecycle !== query.lifecycle) return false;
      if (query.executableOnly && !e.executable) return false;
      if (!query.includeDeprecated && e.deprecated) return false;
      if (
        query.providerId &&
        !e.supportedProviders.includes(query.providerId)
      ) {
        return false;
      }
      if (
        query.runtimeKind &&
        !e.supportedRuntimes.includes(query.runtimeKind)
      ) {
        return false;
      }
      if (
        query.permission &&
        e.requiredPermissions.length > 0 &&
        !e.requiredPermissions.includes(query.permission) &&
        !e.requiredPermissions.includes("*")
      ) {
        return false;
      }
      return true;
    });
  }

  negotiateVersion(
    capabilityId: string,
    requestedVersion: string | null
  ): CapabilityVersionNegotiation {
    const entry = this.lookup(capabilityId);
    if (!entry) {
      return {
        capabilityId,
        requestedVersion,
        selectedVersion: null,
        ok: false,
        reason: "capability_not_found",
      };
    }
    if (!versionsCompatible(entry.version, requestedVersion)) {
      return {
        capabilityId,
        requestedVersion,
        selectedVersion: null,
        ok: false,
        reason: "version_incompatible",
      };
    }
    return {
      capabilityId,
      requestedVersion,
      selectedVersion: entry.version,
      ok: true,
      reason: "matched",
    };
  }

  checkCompatibility(
    capabilityId: string,
    opts?: Parameters<typeof checkCapabilityCompatibility>[1]
  ) {
    const entry = this.lookup(capabilityId);
    if (!entry) {
      return { ok: false, blockers: ["capability_not_found"] };
    }
    return checkCapabilityCompatibility(entry, opts);
  }

  /** Fail-closed lookup for Shared AI execution path. */
  requireExecutable(capabilityId: string): AiCapabilityCatalogEntry {
    const entry = this.lookup(capabilityId);
    if (!entry) {
      throw new Error(`Unknown capability: ${capabilityId}`);
    }
    if (!entry.executable || entry.lifecycle !== "active") {
      throw new Error(`Capability not executable: ${capabilityId}`);
    }
    if (entry.executionSurface !== "shared_ai_service") {
      throw new Error(`Capability surface not shared_ai_service: ${capabilityId}`);
    }
    return entry;
  }
}

let singleton: AiCapabilityServiceRegistry | null = null;

export function createCapabilityCatalogRegistry(
  seed?: AiCapabilityCatalogEntry[]
): AiCapabilityServiceRegistry {
  return new AiCapabilityServiceRegistry(
    seed ?? buildBuiltinCapabilityCatalogEntries()
  );
}

export function getCapabilityCatalogRegistry(): AiCapabilityServiceRegistry {
  if (!singleton) {
    singleton = createCapabilityCatalogRegistry();
  }
  return singleton;
}

export function resetCapabilityCatalogRegistryForTests(): void {
  singleton = null;
}
