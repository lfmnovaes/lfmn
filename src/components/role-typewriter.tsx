'use client';
import { useEffect, useState } from 'react';

// All timing adjustments live here. Each full role is held for four seconds.
export const ROLE_TIMING = { type: 48, erase: 24, hold: 4000, between: 240, start: 450 };
export function RoleTypewriter({ roles }: { roles: string[] }) {
  const [text, setText] = useState(roles[0]);
  useEffect(() => {
    let index = 0,
      length = 0,
      erasing = false;
    let timer: ReturnType<typeof setTimeout>;
    const step = () => {
      const word = roles[index];
      length += erasing ? -1 : 1;
      setText(word.slice(0, length));
      let delay = erasing ? ROLE_TIMING.erase : ROLE_TIMING.type;
      if (length === word.length) {
        erasing = true;
        delay = ROLE_TIMING.hold;
      } else if (length === 0) {
        erasing = false;
        index = (index + 1) % roles.length;
        delay = ROLE_TIMING.between;
      }
      timer = setTimeout(step, delay);
    };
    const start = () => {
      length = 0;
      index = 0;
      erasing = false;
      setText('');
      timer = setTimeout(step, ROLE_TIMING.start);
    };
    const visibility = () => {
      clearTimeout(timer);
      if (!document.hidden) start();
    };
    start();
    document.addEventListener('visibilitychange', visibility);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', visibility);
    };
  }, [roles]);
  return (
    <div className="role-frame">
      <span className="sr-only">{roles[0]}</span>
      <span className="role-line" aria-hidden="true" data-testid="role-text">
        {text}
      </span>
      <span aria-hidden="true" className="typing-caret">
        |
      </span>
    </div>
  );
}
