'use client';

// Adapted from shadcn/ui's Base Nova Sheet (MIT); right-side layout only.
import { Dialog as Primitive } from '@base-ui/react/dialog';

import { cn } from '@/lib/utils';

import { usePortalContainer } from './portal-container';

export const Sheet = Primitive.Root;
export const SheetTrigger = Primitive.Trigger;
export const SheetClose = Primitive.Close;
export const SheetTitle = Primitive.Title;
export const SheetDescription = Primitive.Description;

export function SheetContent({ className, children, ...props }: Primitive.Popup.Props) {
  const container = usePortalContainer();
  return (
    <Primitive.Portal container={container}>
      <Primitive.Backdrop className="fixed inset-0 z-50 bg-black/50 transition-opacity duration-300 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0 motion-reduce:transition-none" />
      <Primitive.Popup
        data-slot="sheet-content"
        className={cn(
          'fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col gap-6 overflow-y-auto overscroll-contain border-l border-border bg-background p-6 text-foreground shadow-xl transition-transform duration-300 ease-in-out data-[ending-style]:translate-x-full data-[starting-style]:translate-x-full motion-reduce:transition-none',
          className,
        )}
        {...props}
      >
        {children}
      </Primitive.Popup>
    </Primitive.Portal>
  );
}
