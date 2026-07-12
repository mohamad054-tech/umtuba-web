"use client";

import { Canvas, useLoader } from "@react-three/fiber";
import { Line, OrbitControls, Stars } from "@react-three/drei";
import { useMemo } from "react";
import * as THREE from "three";

type City = {
  name: string;
  lat: number;
  lng: number;
  color: string;
};

type Route = {
  from: City;
  to: City;
  color: string;
};

const cities: City[] = [
  {
    name: "Jerusalem",
    lat: 31.7683,
    lng: 35.2137,
    color: "#ffffff",
  },
  {
    name: "Amman",
    lat: 31.9539,
    lng: 35.9106,
    color: "#67e8f9",
  },
  {
    name: "Istanbul",
    lat: 41.0082,
    lng: 28.9784,
    color: "#a78bfa",
  },
  {
    name: "Berlin",
    lat: 52.52,
    lng: 13.405,
    color: "#34d399",
  },
];

const routes: Route[] = [
  {
    from: cities[0],
    to: cities[1],
    color: "#67e8f9",
  },
  {
    from: cities[1],
    to: cities[2],
    color: "#a78bfa",
  },
  {
    from: cities[2],
    to: cities[3],
    color: "#34d399",
  },
];

function latLngToVector3(
  lat: number,
  lng: number,
  radius: number
): THREE.Vector3 {
  const latitude = THREE.MathUtils.degToRad(lat);
  const longitude = THREE.MathUtils.degToRad(lng);

  const x =
    -radius * Math.cos(latitude) * Math.cos(longitude);

  const y = radius * Math.sin(latitude);

  const z =
    radius * Math.cos(latitude) * Math.sin(longitude);

  return new THREE.Vector3(x, y, z);
}

function CityMarker({ city }: { city: City }) {
  const position = useMemo(
    () => latLngToVector3(city.lat, city.lng, 2.035),
    [city.lat, city.lng]
  );

  return (
    <group position={position}>
      <mesh>
        <sphereGeometry args={[0.035, 24, 24]} />

        <meshBasicMaterial
          color={city.color}
          toneMapped={false}
        />
      </mesh>

      <mesh scale={2.2}>
        <sphereGeometry args={[0.035, 24, 24]} />

        <meshBasicMaterial
          color={city.color}
          transparent
          opacity={0.18}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}

function JourneyRoute({ route }: { route: Route }) {
  const points = useMemo(() => {
    const start = latLngToVector3(
      route.from.lat,
      route.from.lng,
      2.04
    );

    const end = latLngToVector3(
      route.to.lat,
      route.to.lng,
      2.04
    );

    const middle = start
      .clone()
      .add(end)
      .multiplyScalar(0.5)
      .normalize()
      .multiplyScalar(2.35);

    const curve = new THREE.QuadraticBezierCurve3(
      start,
      middle,
      end
    );

    return curve.getPoints(80);
  }, [route]);

  return (
    <>
      <Line
        points={points}
        color={route.color}
        lineWidth={2.4}
        transparent
        opacity={0.95}
      />

      <Line
        points={points}
        color={route.color}
        lineWidth={7}
        transparent
        opacity={0.08}
      />
    </>
  );
}

function Earth() {
  const earthTexture = useLoader(
    THREE.TextureLoader,
    "/textures/earth-blue-marble.jpg"
  );

  earthTexture.colorSpace = THREE.SRGBColorSpace;

  return (
    <group rotation={[0, -0.55, 0]}>
      <mesh>
        <sphereGeometry args={[2, 96, 96]} />

        <meshStandardMaterial
          map={earthTexture}
          roughness={0.8}
          metalness={0.05}
        />
      </mesh>

      <mesh>
        <sphereGeometry args={[2.06, 96, 96]} />

        <meshBasicMaterial
          color="#67e8f9"
          transparent
          opacity={0.08}
          side={THREE.BackSide}
        />
      </mesh>

      {routes.map((route, index) => (
        <JourneyRoute
          key={`${route.from.name}-${route.to.name}-${index}`}
          route={route}
        />
      ))}

      {cities.map((city) => (
        <CityMarker key={city.name} city={city} />
      ))}
    </group>
  );
}

export default function JourneyGlobePro() {
  return (
    <div className="h-[620px] w-full overflow-hidden rounded-3xl bg-black">
      <Canvas camera={{ position: [0, 0, 6], fov: 45 }}>
        <ambientLight intensity={1.1} />

        <directionalLight
          position={[5, 3, 5]}
          intensity={2.5}
        />

        <Stars
          radius={120}
          depth={60}
          count={5000}
          factor={4}
          saturation={0}
          fade
        />

        <Earth />

        <OrbitControls
          enablePan={false}
          autoRotate
          autoRotateSpeed={0.6}
          enableDamping
          dampingFactor={0.06}
          minDistance={4.5}
          maxDistance={9}
        />
      </Canvas>
    </div>
  );
}