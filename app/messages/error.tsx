"use client";

import RouteErrorFallback from "../components/product/RouteErrorFallback";

export default function MessagesError({
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
      title="Messages hit a snag"
    />
  );
}
