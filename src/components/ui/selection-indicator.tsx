'use client';

import { type CSSProperties, useEffect, useRef } from 'react';

import styles from './segmented-control.module.css';

export function SelectionIndicator({ index, count }: { index: number; count: number }) {
  const indicator = useRef<HTMLSpanElement>(null);
  const previous = useRef(index);
  useEffect(() => {
    if (previous.current === index) return;
    previous.current = index;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const animation = indicator.current?.animate(
      [{ scale: '1 1' }, { scale: '1.12 0.92', offset: 0.35 }, { scale: '1 1' }],
      { duration: 450, easing: 'ease-out' },
    );
    return () => animation?.cancel();
  }, [index]);
  return (
    <span
      ref={indicator}
      aria-hidden="true"
      data-slot="selection-indicator"
      className={styles.indicator}
      style={{ '--selection': index, '--segments': count } as CSSProperties}
    />
  );
}
