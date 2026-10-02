import type messages from '@/messages/en.json';

import styles from './universe.module.css';
import type { PlanetSummary } from './universe-data';

export function UniverseFacts({
  planet,
  copy,
}: {
  planet: PlanetSummary;
  copy: Pick<typeof messages.universe, 'source' | 'measurements'>;
}) {
  return (
    <div className={styles.facts}>
      <p>{planet.description}</p>
      <dl>
        {planet.facts.map(({ label, value }) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      <p>{copy.measurements}</p>
      <a href={planet.source} target="_blank" rel="noreferrer">
        {copy.source}
      </a>
    </div>
  );
}
