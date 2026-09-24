"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { pauseFeedVideosForHiddenPage } from "../../../lib/video/feedHiddenPlayback";
import {
  persistUserWantsSound,
  readUserWantsSound,
  subscribeFeedSoundPreference,
} from "../../../lib/video/feedMutePreference";

type FeedMuteContextValue = {
  /** Visitor intent. Only unmute/mute controls change this. */
  userWantsSound: boolean;
  setUserWantsSound: (userWantsSound: boolean) => void;
  toggleUserWantsSound: () => void;
};

const FeedMuteContext = createContext<FeedMuteContextValue | null>(null);

function getClientSnapshot(): boolean {
  return readUserWantsSound();
}

function getServerSnapshot(): boolean {
  return false;
}

export function FeedMuteProvider({ children }: { children: ReactNode }) {
  const userWantsSound = useSyncExternalStore(
    subscribeFeedSoundPreference,
    getClientSnapshot,
    getServerSnapshot
  );

  const setUserWantsSound = useCallback((next: boolean) => {
    persistUserWantsSound(next);
  }, []);

  const toggleUserWantsSound = useCallback(() => {
    persistUserWantsSound(!readUserWantsSound());
  }, []);

  useEffect(() => {
    function onPageHidden() {
      pauseFeedVideosForHiddenPage();
    }

    function onVisibilityChange() {
      if (document.visibilityState === "hidden") {
        onPageHidden();
      }
    }

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("pagehide", onPageHidden);
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("pagehide", onPageHidden);
    };
  }, []);

  const value = useMemo(
    () => ({
      userWantsSound,
      setUserWantsSound,
      toggleUserWantsSound,
    }),
    [setUserWantsSound, toggleUserWantsSound, userWantsSound]
  );

  return (
    <FeedMuteContext.Provider value={value}>{children}</FeedMuteContext.Provider>
  );
}

export function useFeedMutePreference(): FeedMuteContextValue {
  const context = useContext(FeedMuteContext);
  if (!context) {
    throw new Error("useFeedMutePreference must be used within FeedMuteProvider");
  }
  return context;
}
