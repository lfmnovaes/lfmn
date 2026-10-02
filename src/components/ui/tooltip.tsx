'use client';

// Adapted from shadcn/ui's Base Nova Tooltip (MIT).
import { Tooltip as Primitive } from '@base-ui/react/tooltip';

import { cn } from '@/lib/utils';

import { usePortalContainer } from './portal-container';

export const Tooltip = Primitive.Root;
export const TooltipTrigger = Primitive.Trigger;
export const TooltipProvider = Primitive.Provider;

export function TooltipContent({ children, className, ...props }: Primitive.Popup.Props) {
  const container = usePortalContainer();
  return (
    <Primitive.Portal container={container}>
      <Primitive.Positioner side="left" sideOffset={8} className="z-50">
        <Primitive.Popup
          data-slot="tooltip-content"
          className={cn(
            'max-w-xs rounded-md border border-border bg-background px-3 py-2 text-xs text-foreground shadow-lg transition-opacity duration-150 data-[starting-style]:opacity-0 data-[ending-style]:opacity-0 data-[instant]:transition-none motion-reduce:transition-none',
            className,
          )}
          {...props}
        >
          {children}
        </Primitive.Popup>
      </Primitive.Positioner>
    </Primitive.Portal>
  );
}
