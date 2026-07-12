# UMTUBA Motion Engine

Reusable, UI-agnostic orchestration for every connected-world transition in UMTUBA.

This package does **not** own Watch, Journey, Globe, Live, or routing. Features register transitions and call `startTransition`.

## Public API (core)

```ts
import {
  createMotionRegistry,
  createMotionRunner,
  resolveMotionProfile,
  MotionEngineError,
} from "@/app/lib/motion";
import { registerDefaultMotionTransitions } from "@/app/motion/transitions";

const registry = createMotionRegistry();
registerDefaultMotionTransitions(registry); // explicit — no hidden side effects

const motion = createMotionRunner({ registry });

const result = await motion.startTransition({
  type: "watch-to-journey",
  profile: "cinematic",
  payload: { videoId: "v1" },
  concurrency: "reject", // default
  onComplete: () => {
    // consumer-owned navigation / UI
  },
});

// result.status: "completed" | "cancelled" | "failed"
```

### React

```tsx
import { MotionProvider, useMotion, MotionSurface } from "@/app/components/motion";

function Example() {
  const motion = useMotion();

  return (
    <button
      type="button"
      onClick={() =>
        void motion.startTransition({
          type: "watch-to-journey",
          profile: "cinematic",
          payload: { videoId: "v1" },
        })
      }
    >
      Start
    </button>
  );
}
```

`AppMotionRoot` wraps the app in `layout.tsx` and mounts a hidden, feature-agnostic `MotionSurface`.

## Profiles

| Profile | Behavior |
|---------|----------|
| `fast` | Shorter durations |
| `normal` | Base durations (default) |
| `cinematic` | Longer durations |
| `reduced` | Short durations; heavy primitives stripped |

`prefers-reduced-motion: reduce` automatically resolves to `reduced`, unless the caller already passed `profile: "reduced"`.

## Concurrency

```ts
concurrency?: "reject" | "replace" // default "reject"
```

- **reject** — if a run is active, return `{ status: "failed", error.code: "CONCURRENT_REJECTED" }`
- **replace** — cancel the active run, then start the new one

## Consumer rules

1. **Register explicitly** via `registry.register(...)` or `registerDefaultMotionTransitions(registry)`.
2. **Do not import feature UI into the engine** (no Watch/Journey/Globe inside `app/lib/motion`).
3. **Own navigation yourself** in `onComplete` (or a subscriber). The engine does not call `router.push`.
4. **Treat `startTransition` as async** — always handle `completed | cancelled | failed`.
5. **Subscribers must be safe** — exceptions are caught; do not assume they abort the engine.
6. **Unknown ids fail typed** — `MotionEngineError` with code `UNKNOWN_TRANSITION`.
7. Prefer thin feature adapters (e.g. `JourneyTransitionDirector`) over embedding product logic in the engine.

## First registered transition

`watch-to-journey` is registered and **driven live** through `JourneyTransitionDirector` as a thin Motion Engine adapter:

- Engine = single timing source (`phase:start` / complete)
- Adapter = pause, sessionStorage handoff, overlay mapping, `router.push` + hard fallback
