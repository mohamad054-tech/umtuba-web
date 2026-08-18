"use client";

import { useEffect } from "react";
import Link from "next/link";
import { SANDBOX_PATH } from "../../../lib/sandbox/paths";

/**
 * Real unexpected exceptions only. Missing/invalid exercise IDs must render
 * the Learning unavailable surface — not this fallback.
 */
export default function SandboxBusinessPreviewError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[sandbox-learning-error]", error.digest ?? error.name, error.message);
  }, [error]);

  return (
    <main className="sandbox-preview min-h-[50vh] px-4 py-16">
      <div className="sx-card mx-auto max-w-lg" role="alert">
        <h1 className="text-xl font-semibold">Learning sandbox hit a real error</h1>
        <p className="mt-3 text-sm text-[var(--sx-muted)]">
          This is not the missing-exercise unavailable state. A real exception
          reached the sandbox route. Retry, or return to the Learning catalog.
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          <button type="button" className="sx-btn sx-btn-ok" onClick={reset}>
            Retry
          </button>
          <Link className="sx-btn" href={`${SANDBOX_PATH}/learning/catalog`}>
            Learning catalog
          </Link>
        </div>
      </div>
    </main>
  );
}
