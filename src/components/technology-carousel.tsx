'use client';

import { type PointerEvent, type ReactNode, useRef } from 'react';

export function TechnologyCarousel({
  labelledBy,
  children,
}: {
  labelledBy: string;
  children: ReactNode;
}) {
  const viewport = useRef<HTMLElement>(null);
  const drag = useRef<{ x: number; time: number; animation: Animation; rate: number } | null>(null);

  function playback() {
    const track = viewport.current?.querySelector<HTMLElement>('.technology-track');
    const animation = track?.getAnimations()[0];
    const width = track?.firstElementChild?.getBoundingClientRect().width;
    if (!animation?.effect || !width) return;
    const timing = animation.effect.getTiming();
    return {
      animation,
      rate: (Number(timing.duration) / width) * (timing.direction === 'reverse' ? 1 : -1),
    };
  }

  function shift(animation: Animation, time: number) {
    const duration = Number(animation.effect?.getTiming().duration);
    animation.currentTime = ((time % duration) + duration) % duration;
  }

  function stop() {
    drag.current = null;
    if (viewport.current) delete viewport.current.dataset.dragging;
  }

  function start(event: PointerEvent<HTMLElement>) {
    if (!event.isPrimary || event.button !== 0) return;
    const active = playback();
    if (!active) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    event.currentTarget.dataset.dragging = 'true';
    drag.current = { ...active, x: event.clientX, time: Number(active.animation.currentTime) };
  }

  return (
    <section
      ref={viewport}
      className="technology-viewport"
      // biome-ignore lint/a11y/noNoninteractiveTabindex: Focus pauses the carousel and arrow keys browse its contents.
      tabIndex={0}
      aria-labelledby={labelledBy}
      aria-describedby="technology-instructions"
      onPointerDown={start}
      onPointerMove={(event) => {
        const active = drag.current;
        if (active && event.isPrimary)
          shift(active.animation, active.time + (event.clientX - active.x) * active.rate);
      }}
      onPointerUp={stop}
      onPointerCancel={stop}
      onLostPointerCapture={stop}
      onDragStart={(event) => event.preventDefault()}
      onKeyDown={(event) => {
        if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
        const active = playback();
        if (!active) return;
        event.preventDefault();
        shift(
          active.animation,
          Number(active.animation.currentTime) +
            (event.key === 'ArrowRight' ? -168 : 168) * active.rate,
        );
      }}
    >
      {children}
    </section>
  );
}
