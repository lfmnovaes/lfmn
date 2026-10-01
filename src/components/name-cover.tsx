import type { CSSProperties } from 'react';

import styles from './name-cover.module.css';
import { NameHover } from './name-hover';

// Deterministic variation keeps the prerendered decoration stable.
function noise(seed: number) {
  const value = Math.sin(seed * 127.1) * 43758.5453;
  return value - Math.floor(value);
}

const stars = Array.from({ length: 60 }, (_, index) => {
  const seed = index + 1;
  return {
    left: `${(noise(seed) * 100).toFixed(2)}%`,
    top: `${(noise(seed + 71) * 100).toFixed(2)}%`,
    '--size': `${(0.5 + noise(seed + 131) * 1.1).toFixed(2)}px`,
    '--dx': `${(noise(seed + 191) * 48 - 24).toFixed(2)}px`,
    '--dy': `${(noise(seed + 251) * 32 - 16).toFixed(2)}px`,
    '--drift-duration': `${(3 + noise(seed + 311) * 7).toFixed(2)}s`,
    '--twinkle-duration': `${(1.4 + noise(seed + 371) * 3.6).toFixed(2)}s`,
    '--star-delay': `${(-noise(seed + 431) * 12).toFixed(2)}s`,
    '--peak': (0.35 + noise(seed + 491) * 0.65).toFixed(2),
  } as CSSProperties;
});

export function NameCover({ name }: { name: string }) {
  return (
    <NameHover className={`name-cover ${styles.cover}`}>
      <span className={`name-beams ${styles.beams}`} aria-hidden="true">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((beam) => {
          const length = 4 + noise(beam + 17) * 5;
          return (
            <span
              className={styles.beam}
              key={beam}
              style={
                {
                  top: `${(beam / 9) * 100}%`,
                  '--length': `${length.toFixed(2)}%`,
                  '--travel': `${(((100 + length) / length) * 100).toFixed(2)}%`,
                  '--duration': `${(2.4 + noise(beam + 37) * 3.1).toFixed(2)}s`,
                  '--delay': `${(-noise(beam + 77) * 8).toFixed(2)}s`,
                } as CSSProperties
              }
            />
          );
        })}
      </span>
      <span className={`name-stars ${styles.particles}`} aria-hidden="true">
        {stars.map((style) => (
          <span className={styles.star} key={`${style.left}:${style.top}`} style={style} />
        ))}
      </span>
      <span className={`display-name ${styles.name}`}>{name}</span>
    </NameHover>
  );
}
