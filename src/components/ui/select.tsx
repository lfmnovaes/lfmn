'use client';

// Adapted from shadcn/ui's Base Nova Select (MIT).
import { Select as Primitive } from '@base-ui/react/select';
import { Check, ChevronDown } from 'lucide-react';

import { cn } from '@/lib/utils';

import { usePortalContainer } from './portal-container';

export const Select = Primitive.Root;
export const SelectGroup = Primitive.Group;
export const SelectValue = Primitive.Value;

export function SelectTrigger({ className, children, ...props }: Primitive.Trigger.Props) {
  return (
    <Primitive.Trigger
      data-slot="select-trigger"
      className={cn(
        'flex min-h-11 min-w-0 items-center justify-between gap-2 rounded-lg border border-border bg-background px-2 text-xs text-foreground',
        className,
      )}
      {...props}
    >
      {children}
      <Primitive.Icon render={<ChevronDown className="size-4 text-muted" aria-hidden="true" />}>
        {null}
      </Primitive.Icon>
    </Primitive.Trigger>
  );
}

export function SelectContent({ children, ...props }: Primitive.Popup.Props) {
  const container = usePortalContainer();
  return (
    <Primitive.Portal container={container}>
      <Primitive.Positioner
        sideOffset={4}
        align="start"
        alignItemWithTrigger={false}
        className="z-50"
      >
        <Primitive.Popup
          data-slot="select-content"
          className="max-h-(--available-height) w-(--anchor-width) overflow-auto rounded-lg border border-border bg-secondary p-1 text-xs text-foreground shadow-xl"
          {...props}
        >
          <Primitive.List>{children}</Primitive.List>
        </Primitive.Popup>
      </Primitive.Positioner>
    </Primitive.Portal>
  );
}

export function SelectItem({ children, ...props }: Primitive.Item.Props) {
  return (
    <Primitive.Item
      data-slot="select-item"
      className="flex min-h-11 cursor-default items-center justify-between gap-2 rounded-md px-2 data-highlighted:bg-background data-highlighted:text-primary"
      {...props}
    >
      <Primitive.ItemText>{children}</Primitive.ItemText>
      <Primitive.ItemIndicator>
        <Check className="size-4" aria-hidden="true" />
      </Primitive.ItemIndicator>
    </Primitive.Item>
  );
}
