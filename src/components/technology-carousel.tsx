'use client';

import { type PointerEvent, type ReactNode, useRef, useState } from 'react';

import { ArrowLeft, ArrowRight, Pause, Play } from 'lucide-react';

import type messages from '@/messages/en.json';

import { Button } from './ui/button';

export function TechnologyCarousel({
  labelledBy,
  controls,
  children,
}: {
  labelledBy: string;
  controls: typeof messages.motion;
  children: ReactNode;
}) {
  const viewport = useRef<HTMLElement>(null);
  const [paused, setPaused] = useState(false);
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
    if ((event.target as Element).closest('button')) return;
    const active = playback();
    if (!active) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    event.currentTarget.dataset.dragging = 'true';
    drag.current = { ...active, x: event.clientX, time: Number(active.animation.currentTime) };
  }

  function browse(pixels: number) {
    const active = playback();
    if (active)
      shift(active.animation, Number(active.animation.currentTime) + pixels * active.rate);
  }

  return (
    <section
      ref={viewport}
      className="technology-viewport"
      data-paused={paused || undefined}
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
        event.preventDefault();
        browse(event.key === 'ArrowRight' ? -168 : 168);
      }}
    >
      <div className="marquee-controls js-control">
        <Button variant="ghost" aria-label={controls.previous} onClick={() => browse(168)}>
          <ArrowLeft aria-hidden="true" />
        </Button>
        <Button
          variant="ghost"
          aria-label={paused ? controls.resume : controls.pause}
          aria-pressed={paused}
          onClick={() => setPaused((value) => !value)}
        >
          {paused ? <Play aria-hidden="true" /> : <Pause aria-hidden="true" />}
        </Button>
        <Button variant="ghost" aria-label={controls.next} onClick={() => browse(-168)}>
          <ArrowRight aria-hidden="true" />
        </Button>
      </div>
      {children}
    </section>
  );
}
