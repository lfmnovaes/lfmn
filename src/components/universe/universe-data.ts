import type messages from '@/messages/en.json';

// Artistic sizes, distances, and speeds; these are not astronomical measurements.
export const PLANETS = [
  { id: 'sun', size: 2.8, orbit: 0, speed: 0, phase: 0, color: '#ffbd59' },
  { id: 'mercury', size: 0.55, orbit: 6, speed: 0.13, phase: 0.6, color: '#b3aaa0' },
  { id: 'venus', size: 0.9, orbit: 9, speed: 0.1, phase: 2.1, color: '#e9bd83' },
  { id: 'earth', size: 1, orbit: 13, speed: 0.08, phase: 4.3, color: '#6eabec' },
  { id: 'mars', size: 0.75, orbit: 18, speed: 0.06, phase: 5.4, color: '#db7e62' },
  { id: 'jupiter', size: 2.4, orbit: 25, speed: 0.04, phase: 0.9, color: '#d5b598' },
  { id: 'saturn', size: 2, orbit: 34, speed: 0.03, phase: 2.8, color: '#e5cda0' },
  { id: 'uranus', size: 1.5, orbit: 42, speed: 0.025, phase: 4.8, color: '#98d5dc' },
  { id: 'neptune', size: 1.4, orbit: 50, speed: 0.02, phase: 3.6, color: '#738ee8' },
  { id: 'pluto', size: 0.5, orbit: 58, speed: 0.015, phase: 5.9, color: '#c5b7ae' },
] as const;

export type PlanetId = (typeof PLANETS)[number]['id'];
export type PlanetSummary = { id: PlanetId; name: string; title: string; summary: string };

export function getPlanetSummaries(copy: typeof messages): PlanetSummary[] {
  const [mycareforce, plathanus, independent, coppe] = copy.experience.items;
  const sections = {
    sun: { title: `${copy.hero.first} ${copy.hero.last}`, summary: copy.hero.description },
    mercury: { title: copy.technologies.title, summary: copy.technologies.intro },
    venus: { title: copy.engineering.title, summary: copy.engineering.intro },
    earth: { title: copy.experience.title, summary: copy.experience.intro },
    mars: { title: `${copy.contact.title} ${copy.contact.accent}`, summary: copy.contact.body },
    jupiter: { title: mycareforce.company, summary: mycareforce.body },
    saturn: { title: plathanus.company, summary: plathanus.body },
    uranus: { title: independent.company, summary: independent.body },
    neptune: { title: coppe.company, summary: coppe.body },
    pluto: { title: copy.engineering.qualityTitle, summary: copy.engineering.qualityNote },
  } satisfies Record<PlanetId, { title: string; summary: string }>;
  return PLANETS.map(({ id }) => ({ id, name: copy.universe.bodies[id], ...sections[id] }));
}
