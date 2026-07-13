import * as THREE from "three";
import { latLngToVector3 } from "../../journey/globeCoordinates";

export function createArcCurve(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number,
  radius: number,
  altitude = 2.32
) {
  const start = latLngToVector3(fromLat, fromLng, radius);
  const end = latLngToVector3(toLat, toLng, radius);
  const middle = start
    .clone()
    .add(end)
    .multiplyScalar(0.5)
    .normalize()
    .multiplyScalar(altitude);

  return new THREE.QuadraticBezierCurve3(start, middle, end);
}
