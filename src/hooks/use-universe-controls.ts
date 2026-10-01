'use client';

import { type RefObject, useCallback, useEffect, useRef, useState } from 'react';

import { PLANETS, type PlanetId } from '@/components/universe/universe-data';

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

// Adapted from Tan Phan's ExperienceOrbit controls; source revision in docs/UNIVERSE-PLAN.md.
export function useUniverseControls(
  surface: RefObject<HTMLElement | null>,
  enabled: boolean,
  redraw: RefObject<() => void>,
) {
  const [selected, setSelected] = useState<PlanetId>('sun');
  const zoom = useRef(1);
  const rotation = useRef({ x: 0.65, y: 0 });
  const travel = useRef(0);

  const select = useCallback((id: PlanetId) => {
    travel.current = PLANETS.findIndex((planet) => planet.id === id);
    setSelected(id);
  }, []);
  const advance = useCallback((delta: number) => {
    travel.current = clamp(travel.current + delta, 0, PLANETS.length - 1);
    setSelected(PLANETS[Math.round(travel.current)].id);
  }, []);
  const adjustZoom = useCallback(
    (factor: number) => {
      zoom.current = clamp(zoom.current * factor, 0.65, 2.5);
      redraw.current();
    },
    [redraw],
  );
  const rotate = useCallback(
    (x: number, y: number) => {
      rotation.current.x = (rotation.current.x + x) % (Math.PI * 2);
      rotation.current.y = clamp(rotation.current.y + y, -1.1, 1.1);
      redraw.current();
    },
    [redraw],
  );

  useEffect(() => {
    const element = surface.current;
    if (!element || !enabled) return;
    const pointers = new Map<number, { x: number; y: number; target: HTMLElement }>();
    let moved = false;
    let displacement = 0;
    const distance = () => {
      const [a, b] = [...pointers.values()];
      return Math.hypot(a.x - b.x, a.y - b.y);
    };
    const down = (event: PointerEvent) => {
      if (event.button !== 0 || !(event.target instanceof HTMLCanvasElement)) return;
      if (!pointers.size) {
        moved = false;
        displacement = 0;
      }
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY, target: event.target });
      event.target.setPointerCapture(event.pointerId);
      element.dataset.dragging = 'true';
    };
    const move = (event: PointerEvent) => {
      const previous = pointers.get(event.pointerId);
      if (!previous) return;
      const before = pointers.size === 2 ? distance() : 0;
      const dx = event.clientX - previous.x;
      const dy = event.clientY - previous.y;
      displacement += Math.hypot(dx, dy);
      if (displacement > 4) moved = true;
      previous.x = event.clientX;
      previous.y = event.clientY;
      if (pointers.size === 2) {
        const after = distance();
        if (before > 0 && after > 0) adjustZoom(before / after);
        moved = true;
      } else if (pointers.size === 1) {
        rotate(-dx * 0.005, -dy * 0.005);
      }
    };
    const up = (event: PointerEvent) => {
      const pointer = pointers.get(event.pointerId);
      pointers.delete(event.pointerId);
      if (pointer?.target.hasPointerCapture(event.pointerId))
        pointer.target.releasePointerCapture(event.pointerId);
      if (!pointers.size) delete element.dataset.dragging;
    };
    const click = (event: MouseEvent) => {
      if (!moved || !(event.target instanceof HTMLCanvasElement)) return;
      // A completed drag/pinch must not also select the mesh under its release point.
      event.preventDefault();
      event.stopPropagation();
      moved = false;
    };
    const wheel = (event: WheelEvent) => {
      if (event.ctrlKey || event.metaKey || !(event.target instanceof HTMLCanvasElement)) return;
      event.preventDefault();
      const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? element.clientHeight : 1;
      advance(event.deltaY * unit * 0.004);
    };
    element.addEventListener('pointerdown', down);
    element.addEventListener('pointermove', move);
    element.addEventListener('pointerup', up);
    element.addEventListener('pointercancel', up);
    element.addEventListener('lostpointercapture', up);
    element.addEventListener('click', click, true);
    element.addEventListener('wheel', wheel, { passive: false });
    return () => {
      element.removeEventListener('pointerdown', down);
      element.removeEventListener('pointermove', move);
      element.removeEventListener('pointerup', up);
      element.removeEventListener('pointercancel', up);
      element.removeEventListener('lostpointercapture', up);
      element.removeEventListener('click', click, true);
      element.removeEventListener('wheel', wheel);
      for (const [id, pointer] of pointers)
        if (pointer.target.hasPointerCapture(id)) pointer.target.releasePointerCapture(id);
      delete element.dataset.dragging;
    };
  }, [surface, enabled, advance, adjustZoom, rotate]);

  return { selected, select, advance, zoom, rotation, adjustZoom, rotate };
}
