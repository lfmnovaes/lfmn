'use client';

import { createContext, type RefObject, useContext } from 'react';

export const PortalContainerContext = createContext<RefObject<HTMLElement | null> | undefined>(
  undefined,
);

export function usePortalContainer() {
  return useContext(PortalContainerContext);
}
