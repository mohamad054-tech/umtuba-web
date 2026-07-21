"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  buildExactContextHref,
  clearExactReturnContext,
  EXACT_CONTEXT_RESTORE_EVENT,
  markExternalNavigationDeparted,
  readExactReturnContext,
  saveWatchExactContextDeparture,
  shouldRestoreExternalNavigation,
} from "../../../lib/world/exactContext";

export default function ExactContextResume() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    function restore() {
      if (
        document.visibilityState !== "visible" ||
        !shouldRestoreExternalNavigation()
      ) {
        return;
      }
      const context = readExactReturnContext();
      if (!context) return;
      const href = buildExactContextHref(context);
      const preservedVideo = context.video;

      if (pathname !== context.internalPath) {
        router.replace(href);
        return;
      }
      if (`${pathname}${window.location.search}` !== href) {
        router.replace(href, { scroll: false });
      }

      requestAnimationFrame(() => {
        window.scrollTo({ top: context.scrollY, behavior: "instant" });
        window.dispatchEvent(
          new CustomEvent(EXACT_CONTEXT_RESTORE_EVENT, { detail: context })
        );
        clearExactReturnContext();
        // Keep Watch video seek available after restoring a non-Watch surface.
        if (preservedVideo && context.internalPath !== "/watch") {
          saveWatchExactContextDeparture({
            videoId: preservedVideo.videoId,
            playbackTimeSeconds: preservedVideo.playbackTimeSeconds,
            departure: "preserved-after-external",
          });
        }
      });
    }

    function markDeparted() {
      markExternalNavigationDeparted();
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "hidden") {
        markDeparted();
        return;
      }
      restore();
    }

    const initialRestoreFrame = requestAnimationFrame(restore);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pageshow", restore);
    window.addEventListener("focus", restore);
    window.addEventListener("blur", markDeparted);
    window.addEventListener("pagehide", markDeparted);
    return () => {
      cancelAnimationFrame(initialRestoreFrame);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pageshow", restore);
      window.removeEventListener("focus", restore);
      window.removeEventListener("blur", markDeparted);
      window.removeEventListener("pagehide", markDeparted);
    };
  }, [pathname, router]);

  return null;
}
