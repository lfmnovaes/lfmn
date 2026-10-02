import type messages from '@/messages/en.json';

// Artistic sizes/distances/speeds and approximate axial tilts; not a scientific simulation.
export const PLANETS = [
  { id: 'sun', spin: 0.06, tilt: 7.25, size: 8, orbit: 0, speed: 0, phase: 0, color: '#ffbd59' },
  {
    id: 'mercury',
    spin: 0.025,
    tilt: 0.03,
    size: 0.55,
    orbit: 15,
    speed: 0.13,
    phase: 0.6,
    color: '#b3aaa0',
  },
  {
    id: 'venus',
    spin: -0.018,
    tilt: 3,
    size: 0.9,
    orbit: 24,
    speed: 0.1,
    phase: 2.1,
    color: '#e9bd83',
  },
  {
    id: 'earth',
    spin: 0.15,
    tilt: 23.4,
    size: 1,
    orbit: 36,
    speed: 0.08,
    phase: 4.3,
    color: '#6eabec',
  },
  {
    id: 'mars',
    spin: 0.145,
    tilt: 25.2,
    size: 0.75,
    orbit: 48,
    speed: 0.06,
    phase: 5.4,
    color: '#db7e62',
  },
  {
    id: 'jupiter',
    spin: 0.32,
    tilt: 3.1,
    size: 2.4,
    orbit: 68,
    speed: 0.04,
    phase: 0.9,
    color: '#d5b598',
  },
  {
    id: 'saturn',
    spin: 0.28,
    tilt: 26.7,
    size: 2,
    orbit: 90,
    speed: 0.03,
    phase: 2.8,
    color: '#e5cda0',
  },
  {
    id: 'uranus',
    spin: 0.2,
    tilt: 97.8,
    size: 1.5,
    orbit: 110,
    speed: 0.025,
    phase: 4.8,
    color: '#98d5dc',
  },
  {
    id: 'neptune',
    spin: 0.22,
    tilt: 28.3,
    size: 1.4,
    orbit: 130,
    speed: 0.02,
    phase: 3.6,
    color: '#738ee8',
  },
  {
    id: 'pluto',
    spin: 0.04,
    tilt: 119.6,
    size: 0.5,
    orbit: 150,
    speed: 0.015,
    phase: 5.9,
    color: '#c5b7ae',
  },
] as const;

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
