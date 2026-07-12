import * as THREE from "three";

/**
 * Y-rotation applied to the Earth group in JourneyGlobe.
 * Markers/routes live in that local space; camera targets must use world space.
 */
export const EARTH_Y_ROTATION = -0.55;

/**
 * Lat/lng → local sphere position matching Three.js SphereGeometry UVs for
 * equirectangular textures (Blue Marble: u=0 at lon −180°, u=0.5 at lon 0°).
 *
 * JourneyGlobe previously used theta = lng (no +180), which placed cities
 * ~180° off — e.g. Jerusalem on the Pacific instead of the Levant.
 */
export function latLngToVector3(
  lat: number,
  lng: number,
  radius: number
): THREE.Vector3 {
  const phi = THREE.MathUtils.degToRad(90 - lat);
  const theta = THREE.MathUtils.degToRad(lng + 180);

  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const y = radius * Math.cos(phi);
  const z = radius * Math.sin(phi) * Math.sin(theta);

  return new THREE.Vector3(x, y, z);
}

/** Apply the Earth group's Y rotation (local → world for camera targets). */
export function applyEarthYRotation(local: THREE.Vector3): THREE.Vector3 {
  return local.clone().applyAxisAngle(
    new THREE.Vector3(0, 1, 0),
    EARTH_Y_ROTATION
  );
}

/** World-space point for cameras outside the rotated Earth group. */
export function latLngToWorldVector3(
  lat: number,
  lng: number,
  radius: number
): THREE.Vector3 {
  return applyEarthYRotation(latLngToVector3(lat, lng, radius));
}
