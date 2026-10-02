import type messages from '@/messages/en.json';

// NASA NSSDCA radii, periods and obliquities; JPL J2000 orbit orientations.
// Sources and model limits: docs/UNIVERSE-PLAN.md. Sizes/orbits here are the artistic profile.
export const PLANETS = [
  {
    id: 'sun',
    tilt: 7.25,
    size: 8,
    orbit: 0,
    phase: 0,
    color: '#ffbd59',
    radiusKm: 695700,
    semiMajorKm: 0,
    orbitalDays: 0,
    rotationHours: 609.12,
    eccentricity: 0,
    inclination: 0,
    ascendingNode: 0,
    perihelion: 0,
  },
  {
    id: 'mercury',
    radiusKm: 2439.5,
    semiMajorKm: 57900000,
    orbitalDays: 88,
    rotationHours: 1407.6,
    eccentricity: 0.206,
    inclination: 7,
    ascendingNode: 48.3308,
    perihelion: 77.4578,
    tilt: 0.03,
    size: 0.55,
    orbit: 15,
    phase: 0.6,
    color: '#b3aaa0',
  },
  {
    id: 'venus',
    radiusKm: 6052,
    semiMajorKm: 108200000,
    orbitalDays: 224.7,
    rotationHours: -5832.5,
    eccentricity: 0.007,
    inclination: 3.4,
    ascendingNode: 76.6798,
    perihelion: 131.6025,
    tilt: 177.4,
    size: 0.9,
    orbit: 24,
    phase: 2.1,
    color: '#e9bd83',
  },
  {
    id: 'earth',
    radiusKm: 6378,
    semiMajorKm: 149600000,
    orbitalDays: 365.2,
    rotationHours: 23.9,
    eccentricity: 0.017,
    inclination: 0,
    ascendingNode: 0,
    perihelion: 102.9377,
    tilt: 23.4,
    size: 1,
    orbit: 36,
    phase: 4.3,
    color: '#6eabec',
  },
  {
    id: 'mars',
    radiusKm: 3396,
    semiMajorKm: 228000000,
    orbitalDays: 687,
    rotationHours: 24.6,
    eccentricity: 0.094,
    inclination: 1.8,
    ascendingNode: 49.5595,
    perihelion: -23.9436,
    tilt: 25.2,
    size: 0.75,
    orbit: 48,
    phase: 5.4,
    color: '#db7e62',
  },
  {
    id: 'jupiter',
    radiusKm: 71492,
    semiMajorKm: 778500000,
    orbitalDays: 4331,
    rotationHours: 9.9,
    eccentricity: 0.049,
    inclination: 1.3,
    ascendingNode: 100.4739,
    perihelion: 14.7285,
    tilt: 3.1,
    size: 2.4,
    orbit: 68,
    phase: 0.9,
    color: '#d5b598',
  },
  {
    id: 'saturn',
    radiusKm: 60268,
    semiMajorKm: 1432000000,
    orbitalDays: 10747,
    rotationHours: 10.7,
    eccentricity: 0.052,
    inclination: 2.5,
    ascendingNode: 113.6624,
    perihelion: 92.5989,
    tilt: 26.7,
    size: 2,
    orbit: 90,
    phase: 2.8,
    color: '#e5cda0',
  },
  {
    id: 'uranus',
    radiusKm: 25559,
    semiMajorKm: 2867000000,
    orbitalDays: 30589,
    rotationHours: -17.2,
    eccentricity: 0.047,
    inclination: 0.8,
    ascendingNode: 74.0169,
    perihelion: 170.9543,
    tilt: 97.8,
    size: 1.5,
    orbit: 110,
    phase: 4.8,
    color: '#98d5dc',
  },
  {
    id: 'neptune',
    radiusKm: 24764,
    semiMajorKm: 4515000000,
    orbitalDays: 59800,
    rotationHours: 16.1,
    eccentricity: 0.01,
    inclination: 1.8,
    ascendingNode: 131.7842,
    perihelion: 44.9648,
    tilt: 28.3,
    size: 1.4,
    orbit: 130,
    phase: 3.6,
    color: '#738ee8',
  },
  {
    id: 'pluto',
    radiusKm: 1188,
    semiMajorKm: 5906400000,
    orbitalDays: 90560,
    rotationHours: -153.3,
    eccentricity: 0.244,
    inclination: 17.2,
    ascendingNode: 110.3035,
    perihelion: 224.0668,
    tilt: 119.6,
    size: 0.5,
    orbit: 150,
    phase: 5.9,
    color: '#c5b7ae',
  },
] as const;

export type UniverseScale = 'artistic' | 'realistic';
export const DEFAULT_SIMULATION_SPEED = 12;
export const SIMULATION_SPEEDS = [
  { value: 1, label: 'hour' },
  { value: 6, label: 'sixHours' },
  { value: 12, label: 'twelveHours' },
  { value: 168, label: 'week' },
  { value: 720, label: 'month' },
] as const;
export type ScenePlanet = Omit<(typeof PLANETS)[number], 'size' | 'orbit' | 'phase'> & {
  size: number;
  orbit: number;
  phase: number;
};

export type PlanetId = (typeof PLANETS)[number]['id'];
export type PlanetSummary = {
  id: PlanetId;
  name: string;
  source: string;
} & typeof messages.universe.content.sun;

// Facts verified against these NASA pages on October 1, 2026; measurements are rounded.
const NASA_SOURCES: Record<PlanetId, string> = {
  sun: 'https://science.nasa.gov/sun/facts/',
  mercury: 'https://science.nasa.gov/mercury/facts/',
  venus: 'https://science.nasa.gov/venus/venus-facts/',
  earth: 'https://science.nasa.gov/earth/facts/',
  mars: 'https://science.nasa.gov/mars/facts/',
  jupiter: 'https://science.nasa.gov/jupiter/jupiter-facts/',
  saturn: 'https://science.nasa.gov/saturn/facts/',
  uranus: 'https://science.nasa.gov/uranus/facts/',
  neptune: 'https://science.nasa.gov/neptune/neptune-facts/',
  pluto: 'https://science.nasa.gov/dwarf-planets/pluto/facts/',
};

export function getPlanetSummaries(copy: typeof messages.universe): PlanetSummary[] {
  return PLANETS.map(({ id }) => ({
    id,
    name: copy.bodies[id],
    source: NASA_SOURCES[id],
    ...copy.content[id],
  }));
}
