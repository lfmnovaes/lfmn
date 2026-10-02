import { expect, test } from '@playwright/test';
import { Line3, Vector3 } from 'three';

import {
  DEFAULT_SIMULATION_SPEED,
  PLANETS,
  SIMULATION_SPEEDS,
} from '../src/components/universe/universe-data';
import {
  getOrbitPosition,
  REALISTIC_KM_PER_UNIT,
  updateOrbitPath,
} from '../src/components/universe/universe-orbits';

test('physical scale and Keplerian paths retain perihelion, aphelion and orbital periods', () => {
  const point = {
    x: 0,
    y: 0,
    z: 0,
    set(x: number, y: number, z: number) {
      Object.assign(this, { x, y, z });
    },
  };
  const distance = () => Math.hypot(point.x, point.y, point.z);
  expect(DEFAULT_SIMULATION_SPEED).toBe(12);
  expect(SIMULATION_SPEEDS.map(({ value }) => value)).toEqual([1, 6, 12, 168, 720]);
  const earth = PLANETS.find(({ id }) => id === 'earth');
  const sun = PLANETS[0];
  if (!earth) throw new Error('Missing Earth');
  expect(earth.semiMajorKm / REALISTIC_KM_PER_UNIT).toBe(149.6);
  expect(sun.radiusKm / earth.radiusKm).toBeCloseTo(109.08, 1);
  for (const body of PLANETS.filter(({ orbitalDays }) => orbitalDays > 0)) {
    const planet = { ...body, orbit: body.semiMajorKm / REALISTIC_KM_PER_UNIT };
    getOrbitPosition(planet, 0, point);
    expect(distance()).toBeCloseTo(planet.orbit * (1 - planet.eccentricity), 8);
    getOrbitPosition(planet, Math.PI, point);
    expect(distance()).toBeCloseTo(planet.orbit * (1 + planet.eccentricity), 8);
    getOrbitPosition(planet, planet.phase, point);
    const start = { x: point.x, y: point.y, z: point.z };
    const secondsPerOrbit = (planet.orbitalDays * 24) / DEFAULT_SIMULATION_SPEED;
    const anomaly =
      planet.phase +
      (secondsPerOrbit * DEFAULT_SIMULATION_SPEED * 2 * Math.PI) / (planet.orbitalDays * 24);
    getOrbitPosition(planet, anomaly, point);
    expect(point.x).toBeCloseTo(start.x, 8);
    expect(point.y).toBeCloseTo(start.y, 8);
    expect(point.z).toBeCloseTo(start.z, 8);
  }
});

test('focused orbit chords stay accurate around true-scale bodies throughout an orbit', () => {
  const positions = new Float32Array(192 * 3);
  const origin = new Vector3();
  const point = new Vector3();
  const closest = new Vector3();
  const segment = new Line3();
  for (const body of PLANETS.filter(({ orbitalDays }) => orbitalDays > 0)) {
    const planet = {
      ...body,
      size: body.radiusKm / REALISTIC_KM_PER_UNIT,
      orbit: body.semiMajorKm / REALISTIC_KM_PER_UNIT,
    };
    for (const anomaly of [0, 0.7, 2.3, 5.9, 23.4]) {
      updateOrbitPath(planet, anomaly, positions, origin, point);
      for (const offset of [-8, -4, -1, 0, 1, 4, 8]) {
        getOrbitPosition(planet, anomaly + (offset * planet.size) / planet.orbit, point);
        point.sub(origin);
        let error = Infinity;
        for (let index = 0; index < 192; index++) {
          segment.start.fromArray(positions, index * 3);
          segment.end.fromArray(positions, ((index + 1) % 192) * 3);
          segment.closestPointToPoint(point, true, closest);
          error = Math.min(error, closest.distanceTo(point));
        }
        expect(error / planet.size).toBeLessThan(0.01);
      }
    }
  }
});
