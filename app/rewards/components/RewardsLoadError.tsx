"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import ProductErrorState from "../../components/product/ProductErrorState";
import { FRIENDLY_LOAD_ERROR } from "../../lib/product/userFacingMessage";

export default function RewardsLoadError() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <ProductErrorState
      title="Couldn't load UM Points"
      message={FRIENDLY_LOAD_ERROR}
      retryBusy={pending}
      onRetry={() => {
        startTransition(() => {
          router.refresh();
        });
      }}
    />
  );
}
