'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';

const storageKey = 'universe-animations';
const preference = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
function subscribe(change: () => void) {
  const media = matchMedia('(prefers-reduced-motion: reduce)');
  media.addEventListener('change', change);
  return () => media.removeEventListener('change', change);
}

export function useUniverseMotion() {
  const systemReduced = useSyncExternalStore(subscribe, preference, () => true);
  const [fullMotion, setFullMotion] = useState(false);
  useEffect(() => {
    try {
      setFullMotion(localStorage.getItem(storageKey) === 'on');
    } catch {
      // Storage can be unavailable; the in-page preference still works.
    }
  }, []);
  function enableAnimations() {
    setFullMotion(true);
    try {
      localStorage.setItem(storageKey, 'on');
    } catch {
      // Keep the explicit choice for this page when persistence is unavailable.
    }
  }
  return { reduced: systemReduced && !fullMotion, enableAnimations };
}
