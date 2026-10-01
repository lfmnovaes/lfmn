// Adapted from shadcn/ui's Base Nova ButtonGroup (MIT).
import type { ComponentProps } from 'react';

import { cn } from '@/lib/utils';

import styles from './segmented-control.module.css';

export function ButtonGroup({ className, ...props }: ComponentProps<'fieldset'>) {
  return <fieldset data-slot="button-group" className={cn(styles.group, className)} {...props} />;
}
