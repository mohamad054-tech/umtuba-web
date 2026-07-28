/**
 * Home Circular Arc Navigation Foundation V1 — fail-closed gate.
 *
 * Home remains locked (`HOME_LOCK_ACTIVE`). This foundation must NOT appear
 * on production Home until an explicit Product GO + Home unlock flips this flag.
 *
 * Default: disabled (Preview / opt-in only).
 */
export const HOME_CIRCULAR_ARC_FOUNDATION_ENABLED = false as const;

/**
 * Human-readable status for docs/tests.
 * When false, DiscoverShell must not mount the arc overlay.
 */
export const HOME_CIRCULAR_ARC_FOUNDATION_MODE = "fail-closed" as const;
