'use client';

import type { ReactNode } from 'react';

function speed(cover: HTMLElement, rate: number) {
  for (const beam of cover.querySelectorAll('.name-beams > span')) {
    for (const animation of beam.getAnimations()) animation.updatePlaybackRate(rate);
  }
}

export function NameHover({ className, children }: { className: string; children: ReactNode }) {
  return (
    <span
      className={className}
      onPointerEnter={(event) => {
        if (event.pointerType !== 'touch' && matchMedia('(hover: hover)').matches)
          speed(event.currentTarget, 4);
      }}
      onPointerLeave={(event) => speed(event.currentTarget, 1)}
    >
      {children}
    </span>
  );
}
