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
          'bg-hd-primary text-white shadow-hd-accent hover:bg-hd-primary-hover',
        secondary:
          'border border-hd-border bg-hd-canvas text-hd-text-strong hover:border-hd-primary/40 hover:bg-hd-primary-soft',
        ghost: 'text-hd-text-strong hover:bg-hd-primary-soft',
        danger: 'bg-hd-danger text-white hover:bg-hd-danger/90',
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
