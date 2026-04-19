import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from './cn';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-amber-100 text-amber-900',
        secondary: 'border-transparent bg-stone-100 text-stone-700',
        success: 'border-transparent bg-emerald-100 text-emerald-900',
        warning: 'border-transparent bg-yellow-100 text-yellow-900',
        destructive: 'border-transparent bg-red-100 text-red-900',
        outline: 'border-stone-300 text-stone-700',
      },
    },
    defaultVariants: { variant: 'default' },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}
