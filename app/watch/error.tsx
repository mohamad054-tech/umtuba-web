"use client";

import RouteErrorFallback from "../components/product/RouteErrorFallback";

export default function WatchError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorFallback error={error} reset={reset} title="Watch hit a snag" />
  );
}
