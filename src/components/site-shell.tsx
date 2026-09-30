'use client';

import { createContext, type ReactNode, useContext, useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { useReducedMotion } from '@/lib/use-reduced-motion';

const LightingContext = createContext({
  lights: false,
  toggleLights: (_origin: HTMLElement) => {},
});
export const useLighting = () => useContext(LightingContext);

export function SiteShell({ children }: { children: ReactNode }) {
  const [lights, setLights] = useState(false);
  const reduced = useReducedMotion();
  const shell = useRef<HTMLDivElement>(null);
  const transition = useRef<ReturnType<Document['startViewTransition']> | null>(null);
  const reveal = useRef<Animation | null>(null);

  useEffect(() => {
    const root = shell.current;
    if (!root) return;
    const scroll = () => {
      root.dataset.scrolled = String(window.scrollY > 32);
    };
    scroll();
    window.addEventListener('scroll', scroll, { passive: true });
    return () => window.removeEventListener('scroll', scroll);
  }, []);

  useEffect(() => {
    const root = shell.current;
    if (!root) return;
    let frame = 0;
    let x = 0;
    let y = 0;
    const reset = () => {
      cancelAnimationFrame(frame);
      frame = 0;
      root.dataset.pointer = 'off';
    };
    const move = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse') return;
      x = event.clientX;
      y = event.clientY;
      if (frame) return;
      frame = requestAnimationFrame(() => {
        root.style.setProperty('--pointer-x', `${x}px`);
        root.style.setProperty('--pointer-y', `${y}px`);
        root.dataset.pointer = 'on';
        frame = 0;
      });
    };
    const exit = (event: PointerEvent) => {
      if (!event.relatedTarget) reset();
    };
    window.addEventListener('pointermove', move, { passive: true });
    window.addEventListener('pointerout', exit);
    document.addEventListener('visibilitychange', reset);
    return () => {
      reset();
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerout', exit);
      document.removeEventListener('visibilitychange', reset);
    };
  }, []);

  useEffect(
    () => () => {
      transition.current?.skipTransition();
      reveal.current?.cancel();
    },
    [],
  );

  function toggleLights(origin: HTMLElement) {
    transition.current?.skipTransition();
    reveal.current?.cancel();
    const update = () => flushSync(() => setLights((value) => !value));
    if (reduced || !document.startViewTransition) {
      update();
      return;
    }
    const { left, top, width, height } = origin.getBoundingClientRect();
    const x = left + width / 2;
    const y = top + height / 2;
    const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    const active = document.startViewTransition(update);
    transition.current = active;
    active.ready.then(
      () => {
        if (transition.current !== active) return;
        reveal.current = document.documentElement.animate(
          { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
          { duration: 550, easing: 'ease-in-out', pseudoElement: '::view-transition-new(root)' },
        );
      },
      () => undefined,
    );
  }

  return (
    <LightingContext.Provider value={{ lights, toggleLights }}>
      <div ref={shell} className="site-shell" data-motion="on" data-lights={lights ? 'on' : 'off'}>
        <div className="page-mesh" aria-hidden="true">
          <div className="mesh-lines" />
          <div className="mesh-spotlight" />
        </div>
        <div className="page-layer">{children}</div>
      </div>
    </LightingContext.Provider>
  );
}
