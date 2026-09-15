"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
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
