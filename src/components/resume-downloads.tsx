'use client';

import { Download } from 'lucide-react';
import { type MouseEvent, useRef, useState } from 'react';
import { CountryFlag } from './country-flag';
import { buttonVariants } from './ui/button';

function ResumeLink({
  language,
  country,
  label,
}: {
  language: 'en' | 'pt-BR';
  country: 'US' | 'BR';
  label: string;
}) {
  const id = useRef(0);
  const [ripples, setRipples] = useState<{ id: number; x: number; y: number; size: number }[]>([]);
  function ripple(event: MouseEvent<HTMLAnchorElement>) {
    const link = event.currentTarget;
    const rect = link.getBoundingClientRect();
    // Firefox reports detail=1 for keyboard clicks, but their pointerType is empty.
    const keyboard =
      event.detail === 0 ||
      ('pointerType' in event.nativeEvent && event.nativeEvent.pointerType === '');
    const x = keyboard ? link.clientWidth / 2 : event.clientX - rect.left - link.clientLeft;
    const y = keyboard ? link.clientHeight / 2 : event.clientY - rect.top - link.clientTop;
    setRipples((previous) => [
      ...previous,
      {
        id: ++id.current,
        x,
        y,
        size: Math.hypot(Math.max(x, link.clientWidth - x), Math.max(y, link.clientHeight - y)) * 2,
      },
    ]);
  }
  return (
    <a
      href={`/resumes/luis-fernando-${language}.pdf`}
      download
      lang={language}
      className={`${buttonVariants({ variant: 'outline' })} resume-download resume-${country.toLowerCase()}`}
      onClick={ripple}
    >
      <CountryFlag country={country} />
      <span>{label}</span>
      <Download size={16} aria-hidden="true" />
      {ripples.map((entry) => (
        <span
          aria-hidden="true"
          className="button-ripple"
          key={entry.id}
          style={{ left: entry.x, top: entry.y, width: entry.size, height: entry.size }}
          onAnimationEnd={() =>
            setRipples((previous) => previous.filter((value) => value.id !== entry.id))
          }
        />
      ))}
    </a>
  );
}

export function ResumeDownloads({
  label,
  english,
  portuguese,
}: {
  label: string;
  english: string;
  portuguese: string;
}) {
  return (
    <fieldset className="resume-downloads" aria-label={label}>
      <ResumeLink language="en" country="US" label={english} />
      <ResumeLink language="pt-BR" country="BR" label={portuguese} />
    </fieldset>
  );
}
