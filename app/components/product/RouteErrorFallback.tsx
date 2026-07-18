"use client";

import { useEffect } from "react";
import ProductErrorState from "./ProductErrorState";
import { FRIENDLY_LOAD_ERROR } from "../../lib/product/userFacingMessage";

type RouteErrorFallbackProps = {
  error: Error & { digest?: string };
  reset: () => void;
  title?: string;
};

/**
 * Shared App Router error UI for critical product surfaces.
 */
export default function RouteErrorFallback({
  error,
  reset,
  title = "Something went wrong",
}: RouteErrorFallbackProps) {
  useEffect(() => {
    console.error("[route-error]", error.digest ?? error.name, error.message);
  }, [error]);

  return (
    <main className="flex min-h-[50vh] items-center justify-center bg-[#050510] px-4 py-16 text-white">
      <ProductErrorState
        title={title}
        message={FRIENDLY_LOAD_ERROR}
        onRetry={reset}
      />
    </main>
  );
}
