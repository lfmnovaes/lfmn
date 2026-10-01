'use client';

import { useEffect, useState } from 'react';

import { SRGBColorSpace, type Texture, TextureLoader } from 'three';

import type { PlanetId } from './universe-data';

type TextureKey = PlanetId | 'clouds' | 'galaxy';
type Textures = Partial<Record<TextureKey, Texture>>;
export type AssetStatus = { loading: boolean; failed: boolean };

const TEXTURES: TextureKey[] = [
  'sun',
  'mercury',
  'venus',
  'earth',
  'mars',
  'jupiter',
  'saturn',
  'uranus',
  'neptune',
  'pluto',
  'clouds',
  'galaxy',
];

// Own these textures rather than a global loader cache so exiting releases GPU resources.
export function useUniverseTextures(onStatus: (status: AssetStatus) => void) {
  const [textures, setTextures] = useState<Textures>({});
  useEffect(() => {
    let active = true;
    let pending = TEXTURES.length;
    let failed = false;
    const owned: Texture[] = [];
    const loader = new TextureLoader();
    const complete = () => {
      pending--;
      onStatus({ loading: pending > 0, failed });
    };
    onStatus({ loading: true, failed: false });
    for (const name of TEXTURES) {
      owned.push(
        loader.load(
          `/textures/universe/${name}.webp`,
          (texture) => {
            if (!active) {
              texture.dispose();
              return;
            }
            if (name !== 'clouds') texture.colorSpace = SRGBColorSpace;
            setTextures((previous) => ({ ...previous, [name]: texture }));
            complete();
          },
          undefined,
          () => {
            if (!active) return;
            failed = true;
            complete();
          },
        ),
      );
    }
    return () => {
      active = false;
      for (const texture of owned) texture.dispose();
    };
  }, [onStatus]);
  return textures;
}
