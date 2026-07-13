"use client";

import AtmosphereHighlight from "./AtmosphereHighlight";
import AtmosphericParticles from "./AtmosphericParticles";
import CityFocusBootstrap from "./CityFocusBootstrap";
import CityPulseMarker from "./CityPulseMarker";
import CloudLayer from "./CloudLayer";
import DayNightTerminator from "./DayNightTerminator";
import FlightPlane from "./FlightPlane";
import FlightRoute from "./FlightRoute";
import { GlobalPulseProvider } from "./GlobalPulseContext";
import { LivingEarthHoverProvider } from "./LivingEarthHoverContext";
import { LIVING_CITIES, LIVING_ROUTES } from "./livingEarthData";

type LivingEarthEffectsProps = {
  reducedMotion: boolean;
  focusCity?: string | null;
};

export default function LivingEarthEffects({
  reducedMotion,
  focusCity = null,
}: LivingEarthEffectsProps) {
  return (
    <LivingEarthHoverProvider>
      <GlobalPulseProvider reducedMotion={reducedMotion}>
        <CityFocusBootstrap focusCity={focusCity} />
        <DayNightTerminator reducedMotion={reducedMotion} />
        <CloudLayer reducedMotion={reducedMotion} />
        <AtmosphericParticles reducedMotion={reducedMotion} />

        {LIVING_ROUTES.map((route) => (
          <FlightRoute
            key={route.id}
            route={route}
            reducedMotion={reducedMotion}
          />
        ))}

        {LIVING_ROUTES.map((route, index) => (
          <FlightPlane
            key={`plane-${route.id}`}
            route={route}
            routeIndex={index}
            reducedMotion={reducedMotion}
          />
        ))}

        {LIVING_CITIES.map((city, index) => (
          <CityPulseMarker
            key={city.name}
            city={city}
            pulseOffset={index * 0.55}
            reducedMotion={reducedMotion}
          />
        ))}

        <AtmosphereHighlight />
      </GlobalPulseProvider>
    </LivingEarthHoverProvider>
  );
}
