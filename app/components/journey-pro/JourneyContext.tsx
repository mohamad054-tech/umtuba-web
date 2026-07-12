"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
} from "react";

type JourneyContextType = {
  currentCityIndex: number;
  setCurrentCityIndex: (index: number) => void;

  isPlaying: boolean;
  setIsPlaying: (value: boolean) => void;

  speed: number;
  setSpeed: (value: number) => void;
};

const JourneyContext = createContext<JourneyContextType | null>(
  null
);

export function JourneyProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [currentCityIndex, setCurrentCityIndex] =
    useState(0);

  const [isPlaying, setIsPlaying] =
    useState(true);

  const [speed, setSpeed] =
    useState(1);

  const value = useMemo(
    () => ({
      currentCityIndex,
      setCurrentCityIndex,
      isPlaying,
      setIsPlaying,
      speed,
      setSpeed,
    }),
    [currentCityIndex, isPlaying, speed]
  );

  return (
    <JourneyContext.Provider value={value}>
      {children}
    </JourneyContext.Provider>
  );
}

export function useJourney() {
  const context = useContext(JourneyContext);

  if (!context) {
    throw new Error(
      "useJourney must be used inside JourneyProvider"
    );
  }

  return context;
}