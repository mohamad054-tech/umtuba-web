"use client";

import { useRouter } from "next/navigation";
import { useState, type MouseEvent } from "react";
import { useTranslation } from "../i18n";
import { openDirectConversationAction } from "../../actions/messenger";
import {
  APP_ROUTES,
  buildConversationHref,
  buildMessageCreatorHref,
  isUuid,
} from "../../lib/nav";

type StartDirectMessageButtonProps = {
  peerUserId: string;
  peerName: string;
  className?: string;
  label?: string;
  /** When true, renders nothing (e.g. viewing own profile / own Discover clip). */
  hidden?: boolean;
};

/**
 * E2E entry: get-or-create a direct conversation, then open
 * `/messages?conversation=…`. Falls back to `?creatorId=` so Messages can retry.
 */
export default function StartDirectMessageButton({
  peerUserId,
  peerName,
  className,
  label,
  hidden = false,
}: StartDirectMessageButtonProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const buttonLabel = label ?? t("home.message");

  // Non-empty non-UUID means a bad DTO stand-in (e.g. post id). Empty = intentionally missing.
  if (
    peerUserId &&
    !isUuid(peerUserId) &&
    process.env.NODE_ENV === "development"
  ) {
    console.warn(
      "[Message] peerUserId is not a Supabase auth UUID — Message button hidden.",
      { peerUserId, peerName }
    );
  }

  if (hidden || !isUuid(peerUserId)) {
    return null;
  }

  const creatorHref = buildMessageCreatorHref({
    id: peerUserId,
    name: peerName,
  });

  async function handleClick(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();

    if (loading) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await openDirectConversationAction(peerUserId);

      if (result.ok) {
        const href = buildConversationHref(result.conversationId);
        console.info("[Message] opened conversation", href);
        router.push(href);
        return;
      }

      if (result.requiresAuth) {
        console.info("[Message] auth required, redirecting to login");
        router.push(
          `${APP_ROUTES.login}?next=${encodeURIComponent(creatorHref)}`
        );
        return;
      }

      console.error("[Message] openDirectConversationAction failed:", result.message);
      setError(result.message);
      // Keep peer context so /messages can retry create/open.
      router.push(creatorHref);
    } catch (err) {
      console.error("[Message] unexpected error:", err);
      setError(
        err instanceof Error ? err.message : "Unable to open conversation."
      );
      router.push(creatorHref);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="inline-flex flex-col items-stretch gap-1">
      <button
        type="button"
        onClick={(event) => void handleClick(event)}
        disabled={loading}
        aria-busy={loading}
        className={
          className ??
          "watch-focus-ring rounded-full border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-bold text-white/85 transition hover:bg-white/10 hover:text-white disabled:cursor-wait disabled:opacity-60"
        }
      >
        {loading ? t("home.messageOpening") : buttonLabel}
      </button>
      {error ? (
        <p
          role="alert"
          className="max-w-[14rem] text-[11px] font-semibold leading-snug text-red-300"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
