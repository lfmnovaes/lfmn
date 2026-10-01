'use client';

import { type ReactNode, useEffect, useRef } from 'react';

export function PortraitMagnet({ children }: { children: ReactNode }) {
  const portrait = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const anchors = portrait.current?.querySelectorAll<HTMLElement>('.badge-anchor');
    if (!anchors) return;
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    let frame = 0;
    let x = 0;
    let y = 0;
    let pointerActive = false;
    const reset = () => {
      cancelAnimationFrame(frame);
      frame = 0;
      pointerActive = false;
      for (const anchor of anchors) {
        anchor.style.setProperty('--magnet-x', '0px');
        anchor.style.setProperty('--magnet-y', '0px');
        anchor.dataset.magnetic = 'off';
      }
    };
    const render = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        const reduced = preference.matches;
        const positions = Array.from(
          anchors,
          (anchor) => [anchor, anchor.getBoundingClientRect()] as const,
        );
        for (const [anchor, rect] of positions) {
          const dx = x - rect.left - rect.width / 2;
          const dy = y - rect.top - rect.height / 2;
          const nearby =
            x >= rect.left - 20 &&
            x <= rect.right + 20 &&
            y >= rect.top - 20 &&
            y <= rect.bottom + 20;
          const pull = nearby ? (reduced ? 0.16 : 0.45) : 0;
          const limit = reduced ? 8 : 24;
          anchor.dataset.magnetic = nearby ? 'on' : 'off';
          anchor.style.setProperty(
            '--magnet-x',
            `${Math.max(-limit, Math.min(limit, dx * pull))}px`,
          );
          anchor.style.setProperty(
            '--magnet-y',
            `${Math.max(-limit, Math.min(limit, dy * pull))}px`,
          );
        }
        frame = 0;
      });
    };
    const move = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse') return;
      x = event.clientX;
      y = event.clientY;
      pointerActive = true;
      render();
    };
    const preferenceChanged = () => {
      if (pointerActive) render();
    };
    const exit = (event: PointerEvent) => {
      if (!event.relatedTarget) reset();
    };
    window.addEventListener('pointermove', move, { passive: true });
    window.addEventListener('pointerout', exit);
    window.addEventListener('scroll', reset, { passive: true });
    document.addEventListener('visibilitychange', reset);
    preference.addEventListener('change', preferenceChanged);
    return () => {
      reset();
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerout', exit);
      window.removeEventListener('scroll', reset);
      document.removeEventListener('visibilitychange', reset);
      preference.removeEventListener('change', preferenceChanged);
    };
  }, []);
  return (
    <div className="portrait-stage" ref={portrait} data-testid="portrait-stage">
      {children}
    </div>
  );
}
