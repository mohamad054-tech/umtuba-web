/**
 * In-memory Naming Registry Foundation (UM Core P11).
 *
 * Pure deterministic derived read-only index over existing Core registries.
 * NAMING INDEXING IS NOT NAME AUTHORING.
 *
 * @see UM_CORE_SPECIFICATION_V1
 * @see UM_CORE_ENGINEERING_STANDARDS_V1 (§2 naming)
 */

import type { UmNamedArtifactKind } from "../identity/types";
import type {
  UmInMemoryNamingRegistry,
  UmNamedArtifact,
  UmNamingRegistryDeps,
} from "./types";

/** Stable kind order matching identity vocabulary declaration order. */
const KIND_ORDER: readonly UmNamedArtifactKind[] = [
  "platform",
  "module",
  "capability",
  "event_type",
  "flag",
  "job",
  "contract",
  "extension",
  "service",
  "runtime",
] as const;

const KIND_RANK = new Map(
  KIND_ORDER.map((kind, index) => [kind, index] as const),
);

function artifactKey(kind: UmNamedArtifactKind, id: string): string {
  return `${kind}\0${id}`;
}

function compareArtifacts(a: UmNamedArtifact, b: UmNamedArtifact): number {
  const ka = KIND_RANK.get(a.kind) ?? Number.MAX_SAFE_INTEGER;
  const kb = KIND_RANK.get(b.kind) ?? Number.MAX_SAFE_INTEGER;
  if (ka !== kb) return ka - kb;
  return a.id.localeCompare(b.id);
}

function compareById(a: UmNamedArtifact, b: UmNamedArtifact): number {
  return a.id.localeCompare(b.id);
}

function buildIndex(deps: UmNamingRegistryDeps): Map<string, UmNamedArtifact> {
  const index = new Map<string, UmNamedArtifact>();
  const { platforms, capabilities, eventTypes, flags } = deps;

  for (const platform of platforms.list()) {
    index.set(artifactKey("platform", platform.platformId), {
      id: platform.platformId,
      kind: "platform",
      ownerPlatformId: platform.platformId,
      displayName: platform.displayName,
    });

    for (const mod of platform.modules) {
      index.set(artifactKey("module", mod.moduleId), {
        id: mod.moduleId,
        kind: "module",
        ownerPlatformId: platform.platformId,
        displayName: mod.displayName,
      });
    }
  }

  if (capabilities) {
    for (const cap of capabilities.list()) {
      index.set(artifactKey("capability", cap.capabilityId), {
        id: cap.capabilityId,
        kind: "capability",
        ownerPlatformId: cap.platformId,
        stability: cap.stability,
        displayName: cap.displayName,
      });
    }
  } else {
    for (const platform of platforms.list()) {
      for (const cap of platform.capabilities) {
        index.set(artifactKey("capability", cap.capabilityId), {
          id: cap.capabilityId,
          kind: "capability",
          ownerPlatformId: platform.platformId,
          stability: cap.stability,
          displayName: cap.displayName,
        });
      }
    }
  }

  if (eventTypes) {
    for (const event of eventTypes.list()) {
      // Event types expose description, not displayName — do not synthesize.
      index.set(artifactKey("event_type", event.eventType), {
        id: event.eventType,
        kind: "event_type",
        ownerPlatformId: event.producerPlatformId,
        stability: event.stability,
      });
    }
  }

  if (flags) {
    for (const flag of flags.list()) {
      // Flags expose description, not displayName — do not synthesize.
      // Flags have no stability field — leave stability absent.
      index.set(artifactKey("flag", flag.flagId), {
        id: flag.flagId,
        kind: "flag",
        ownerPlatformId: flag.ownerPlatformId,
      });
    }
  }

  return index;
}

/**
 * Create a pure in-memory naming index over existing Core registries.
 * Does not author names or replace naming policy.
 *
 * Snapshot semantics: indexes deps at construction; call `rebuild()` to refresh
 * after source registry mutations. No watchers/polling/subscriptions.
 */
export function createInMemoryNamingRegistry(
  deps: UmNamingRegistryDeps,
): UmInMemoryNamingRegistry {
  let store = buildIndex(deps);

  const sortedAll = (): UmNamedArtifact[] =>
    [...store.values()].sort(compareArtifacts);

  return {
    rebuild() {
      store = buildIndex(deps);
    },

    get(kind, id) {
      return store.get(artifactKey(kind, id));
    },

    listByKind(kind) {
      return [...store.values()]
        .filter((a) => a.kind === kind)
        .sort(compareById);
    },

    list() {
      return sortedAll();
    },

    listByPlatform(platformId) {
      return [...store.values()]
        .filter((a) => a.ownerPlatformId === platformId)
        .sort(compareArtifacts);
    },

    has(kind, id) {
      return store.has(artifactKey(kind, id));
    },

    size() {
      return store.size;
    },
  };
}
