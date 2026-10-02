import type { Vector3 } from 'three';

import type { ScenePlanet } from './universe-data';

export const REALISTIC_KM_PER_UNIT = 1_000_000;
const radians = Math.PI / 180;

// Concentrate vertices near the focused body, with a local origin to retain float precision.
export function updateOrbitPath(
  planet: ScenePlanet,
  anomaly: number | null,
  positions: Float32Array,
  origin: Vector3,
  point: Vector3,
) {
  if (anomaly === null) origin.set(0, 0, 0);
  else getOrbitPosition(planet, anomaly, origin);
  const count = positions.length / 3;
  for (let index = 0; index < count; index++) {
    const offset = (index * 2) / count - 1;
    const angle =
      anomaly === null ? (index / count) * Math.PI * 2 : anomaly + Math.PI * offset ** 3;
    getOrbitPosition(planet, angle, point);
    point.sub(origin).toArray(positions, index * 3);
  }
}

// Fixed Keplerian ellipses, following JPL's approximate-position formulae.
// Phases are illustrative, not an ephemeris for the current date.
export function getOrbitPosition(
  planet: ScenePlanet,
  meanAnomaly: number,
  target: { set: (x: number, y: number, z: number) => unknown },
) {
  const { orbit, eccentricity: e } = planet;
  const mean = meanAnomaly % (2 * Math.PI);
  let anomaly = mean;
  for (let iteration = 0; iteration < 6; iteration++)
    anomaly -= (anomaly - e * Math.sin(anomaly) - mean) / (1 - e * Math.cos(anomaly));
  const x = orbit * (Math.cos(anomaly) - e);
  const y = orbit * Math.sqrt(1 - e * e) * Math.sin(anomaly);
  const argument = (planet.perihelion - planet.ascendingNode) * radians;
  const node = planet.ascendingNode * radians;
  const inclination = planet.inclination * radians;
  const along = x * Math.cos(argument) - y * Math.sin(argument);
  const across = x * Math.sin(argument) + y * Math.cos(argument);
  // Ecliptic Z-up -> Three Y-up, preserving prograde orbital direction.
  target.set(
    along * Math.cos(node) - across * Math.sin(node) * Math.cos(inclination),
    across * Math.sin(inclination),
    -along * Math.sin(node) - across * Math.cos(node) * Math.cos(inclination),
  );
}
