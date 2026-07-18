"use client";

import RouteErrorFallback from "../components/product/RouteErrorFallback";

export default function RewardsError({
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
      title="Rewards hit a snag"
    />
  );
}
