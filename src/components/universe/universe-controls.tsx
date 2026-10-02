import type { ReactElement } from 'react';

import { ArrowDown, ArrowUp, Minus, Orbit, Pause, Play, Plus } from 'lucide-react';

import type messages from '@/messages/en.json';

import { Button } from '../ui/button';
import { Toggle } from '../ui/toggle';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import styles from './universe.module.css';
import type { UniverseScale } from './universe-data';

function Control({ label, button }: { label: string; button: ReactElement }) {
  return (
    <Tooltip>
      <TooltipTrigger render={button} />
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

export function UniverseControls({
  copy,
  disabled,
  reduced,
  paused,
  scale,
  onPause,
  onScale,
  onZoom,
  onRotate,
}: {
  copy: typeof messages.universe;
  disabled: boolean;
  reduced: boolean;
  paused: boolean;
  scale: UniverseScale;
  onPause: () => void;
  onScale: (scale: UniverseScale) => void;
  onZoom: (factor: number) => void;
  onRotate: (x: number, y: number) => void;
}) {
  const motion = reduced ? copy.enableMotion : paused ? copy.resume : copy.pause;
  return (
    <TooltipProvider delay={200}>
      <fieldset
        className={`${styles.controls} js-control`}
        aria-label={copy.controls}
        aria-describedby="universe-gestures"
        aria-keyshortcuts="ArrowLeft ArrowRight ArrowUp ArrowDown"
        disabled={disabled}
      >
        <Control
          label={copy.zoomIn}
          button={
            <Button variant="outline" aria-label={copy.zoomIn} onClick={() => onZoom(0.8)}>
              <Plus aria-hidden="true" />
            </Button>
          }
        />
        <Control
          label={copy.zoomOut}
          button={
            <Button variant="outline" aria-label={copy.zoomOut} onClick={() => onZoom(1.25)}>
              <Minus aria-hidden="true" />
            </Button>
          }
        />
        <Control
          label={motion}
          button={
            <Button
              variant="outline"
              aria-label={motion}
              aria-pressed={paused || reduced}
              onClick={onPause}
            >
              {paused || reduced ? <Play aria-hidden="true" /> : <Pause aria-hidden="true" />}
            </Button>
          }
        />
        <Control
          label={copy.rotateUp}
          button={
            <Button variant="outline" aria-label={copy.rotateUp} onClick={() => onRotate(0, -0.25)}>
              <ArrowUp aria-hidden="true" />
            </Button>
          }
        />
        <Control
          label={copy.rotateDown}
          button={
            <Button
              variant="outline"
              aria-label={copy.rotateDown}
              onClick={() => onRotate(0, 0.25)}
            >
              <ArrowDown aria-hidden="true" />
            </Button>
          }
        />
        <Control
          label={scale === 'artistic' ? copy.realisticView : copy.artisticView}
          button={
            <Toggle
              aria-label={copy.scaleToggle}
              pressed={scale === 'realistic'}
              onPressedChange={(pressed) => onScale(pressed ? 'realistic' : 'artistic')}
            >
              <Orbit aria-hidden="true" />
            </Toggle>
          }
        />
      </fieldset>
    </TooltipProvider>
  );
}
