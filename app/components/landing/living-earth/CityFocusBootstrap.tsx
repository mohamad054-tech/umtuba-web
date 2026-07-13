"use client";

import { useEffect } from "react";
import { citiesMatch } from "../../../lib/nav";
import { useLivingEarthHover } from "./LivingEarthHoverContext";
import { LIVING_CITIES } from "./livingEarthData";

type CityFocusBootstrapProps = {
  focusCity: string | null;
};

/** Mock: highlight a Living Earth city when arriving via ?focus=. */
export default function CityFocusBootstrap({
  focusCity,
}: CityFocusBootstrapProps) {
  const { setHoveredCity } = useLivingEarthHover();

  useEffect(() => {
    if (!focusCity?.trim()) {
      return;
    }

    const match =
      LIVING_CITIES.find((city) => citiesMatch(city.name, focusCity)) ?? null;

    if (match) {
      setHoveredCity(match);
    }

    return () => {
      setHoveredCity(null);
    };
  }, [focusCity, setHoveredCity]);

  return null;
}
