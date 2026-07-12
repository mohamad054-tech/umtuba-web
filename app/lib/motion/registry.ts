import { MotionEngineError } from "./types";
import type { MotionTransitionDefinition } from "./types";

export type MotionRegistry = {
  register: (definition: MotionTransitionDefinition) => void;
  get: (id: string) => MotionTransitionDefinition | undefined;
  has: (id: string) => boolean;
  list: () => MotionTransitionDefinition[];
  clear: () => void;
  size: () => number;
};

export function createMotionRegistry(
  initial: MotionTransitionDefinition[] = []
): MotionRegistry {
  const definitions = new Map<string, MotionTransitionDefinition>();

  function register(definition: MotionTransitionDefinition) {
    if (!definition?.id || !definition.id.trim()) {
      throw new MotionEngineError(
        "INVALID_DEFINITION",
        "Cannot register a transition without a non-empty id."
      );
    }

    if (definitions.has(definition.id)) {
      throw new MotionEngineError(
        "INVALID_DEFINITION",
        `Duplicate transition id "${definition.id}".`,
        definition.id
      );
    }

    if (!definition.phases?.length) {
      throw new MotionEngineError(
        "INVALID_DEFINITION",
        `Transition "${definition.id}" must include at least one phase.`,
        definition.id
      );
    }

    definitions.set(definition.id, Object.freeze({
      ...definition,
      phases: definition.phases.map((phase) =>
        Object.freeze({
          ...phase,
          primitives: phase.primitives
            ? phase.primitives.map((primitive) => Object.freeze({ ...primitive }))
            : [],
        })
      ),
    }));
  }

  for (const definition of initial) {
    register(definition);
  }

  return {
    register,
    get(id) {
      return definitions.get(id);
    },
    has(id) {
      return definitions.has(id);
    },
    list() {
      return Array.from(definitions.values());
    },
    clear() {
      definitions.clear();
    },
    size() {
      return definitions.size;
    },
  };
}
