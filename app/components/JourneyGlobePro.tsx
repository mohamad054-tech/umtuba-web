"use client";

import { Canvas } from "@react-three/fiber";
import GlobeScene from "./journey-pro/GlobeScene";
import { JourneyProvider } from "./journey-pro/JourneyContext";
import JourneyStatus from "./journey-pro/JourneyStatus";
import JourneyTimeline from "./journey-pro/JourneyTimeline";

export default function JourneyGlobePro() {
  return (
    <JourneyProvider>
      <div className="relative h-[620px] w-full overflow-hidden rounded-3xl bg-black">
        <Canvas camera={{ position: [0, 0, 6], fov: 45 }}>
          <GlobeScene />
        </Canvas>

        <JourneyStatus />
        <JourneyTimeline />
      </div>
    </JourneyProvider>
  );
}