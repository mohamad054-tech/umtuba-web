"use client";

import RouteErrorFallback from "../components/product/RouteErrorFallback";

export default function DiscoverError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorFallback
      error={error}
      reset={reset}
      title="Discover hit a snag"
    />
  );
}
