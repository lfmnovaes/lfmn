'use client';

import { type ReactNode, useState } from 'react';

import { Pause, Play } from 'lucide-react';

import type messages from '@/messages/en.json';

import { Button } from './ui/button';

export function ServiceFeed({
  label,
  controls,
  children,
}: {
  label: string;
  controls: typeof messages.motion;
  children: ReactNode;
}) {
  const [paused, setPaused] = useState(false);
  return (
    <section className="service-feed" aria-label={label} data-paused={paused || undefined}>
      <div className="marquee-controls js-control">
        <Button
          variant="ghost"
          aria-label={paused ? controls.resume : controls.pause}
          aria-pressed={paused}
          onClick={() => setPaused((value) => !value)}
        >
          {paused ? <Play aria-hidden="true" /> : <Pause aria-hidden="true" />}
        </Button>
      </div>
      {children}
    </section>
  );
}
