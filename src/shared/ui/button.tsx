import { cva, type VariantProps } from 'class-variance-authority';
import { Slot } from '@radix-ui/react-slot';
import * as React from 'react';

import { cn } from '@/shared/lib/cn';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-full text-sm font-semibold transition-[background-color,border-color,transform,box-shadow] disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]',
  {
    variants: {
      variant: {
        primary:
          'bg-sa-primary text-white shadow-sa-accent hover:bg-sa-primary-hover',
        secondary:
          'border border-sa-border bg-sa-canvas text-sa-text-strong hover:border-sa-primary/40 hover:bg-sa-primary-soft',
        ghost: 'text-sa-text-strong hover:bg-sa-primary-soft',
        danger: 'bg-sa-danger text-white hover:bg-sa-danger/90',
      },
      size: {
        sm: 'h-8 px-3.5',
        md: 'h-10 px-5',
        lg: 'h-11 px-6',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  },
);

export type ButtonProps = React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  };

export function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : 'button';
  return (
    <Comp className={cn(buttonVariants({ variant, size }), className)} {...props} />
  );
}
