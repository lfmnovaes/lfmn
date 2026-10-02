'use client';

// Adapted from shadcn/ui's Base Nova Toggle (MIT), sharing this site's button shape.
import { Toggle as Primitive } from '@base-ui/react/toggle';

import { cn } from '@/lib/utils';

import { buttonVariants } from './button';

export function Toggle({ className, ...props }: Primitive.Props) {
  return (
    <Primitive
      data-slot="toggle"
      className={cn(buttonVariants({ variant: 'outline' }), 'aria-pressed:text-primary', className)}
      {...props}
    />
  );
}
