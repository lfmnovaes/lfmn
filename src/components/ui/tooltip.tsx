'use client';
// Adapted from shadcn/ui's Base Nova tooltip (MIT).
import { Tooltip as Primitive } from '@base-ui/react/tooltip';

import { usePortalContainer } from './portal-container';
export const TooltipProvider = Primitive.Provider;
export const Tooltip = Primitive.Root;
export const TooltipTrigger = Primitive.Trigger;
export function TooltipContent({ children, id }: { children: React.ReactNode; id?: string }) {
  const container = usePortalContainer();
  return (
    <Primitive.Portal container={container}>
      <Primitive.Positioner sideOffset={8} className="z-50">
        <Primitive.Popup
          role="tooltip"
          id={id}
          className="rounded-lg border border-border bg-secondary px-3 py-2 text-xs text-foreground shadow-xl"
        >
          {children}
          <Primitive.Arrow className="size-2 fill-secondary" />
        </Primitive.Popup>
      </Primitive.Positioner>
    </Primitive.Portal>
  );
}
