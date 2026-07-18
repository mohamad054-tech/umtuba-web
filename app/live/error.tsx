"use client";

import RouteErrorFallback from "../components/product/RouteErrorFallback";

export default function LiveError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorFallback error={error} reset={reset} title="Live hit a snag" />
  );
}
