'use client';
// Adapted from shadcn/ui's Base Nova button (MIT).
import { Button as ButtonPrimitive } from '@base-ui/react/button';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
export const buttonVariants = cva(
  'inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-full px-4 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50 [&_svg]:size-4',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/85',
        outline: 'border border-border bg-background hover:bg-secondary',
        ghost: 'hover:bg-secondary',
      },
    },
    defaultVariants: { variant: 'default' },
  },
);
export function Button({
  className,
  variant,
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant }), className)}
      {...props}
    />
  );
}
