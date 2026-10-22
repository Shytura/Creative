import { cva, type VariantProps } from 'class-variance-authority';
import { Slot } from 'radix-ui';
import type { ComponentProps } from 'react';
import { cn } from '../cn';

export const buttonVariants = cva(
  'inline-flex shrink-0 cursor-pointer select-none items-center justify-center gap-2 whitespace-nowrap rounded-frame font-medium transition-[background,color,border-color,box-shadow,transform] duration-200 ease-gallery active:translate-y-px disabled:pointer-events-none disabled:opacity-45 [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        solid: 'bg-ink text-paper hover:bg-ink/88 shadow-soft',
        accent: 'bg-accent text-accent-ink hover:bg-accent/90 shadow-soft',
        outline:
          'border border-line-strong bg-transparent text-ink hover:border-ink hover:bg-ink/4',
        ghost: 'text-ink-2 hover:bg-ink/6 hover:text-ink',
        link: 'h-auto px-0 text-ink underline decoration-line-strong underline-offset-4 hover:decoration-accent',
        danger: 'bg-danger text-white hover:bg-danger/90',
      },
      size: {
        sm: 'h-8 px-3 text-xs',
        md: 'h-10 px-4 text-sm',
        lg: 'h-12 px-6 text-[0.9375rem]',
        icon: 'size-10',
        'icon-sm': 'size-8',
      },
    },
    defaultVariants: { variant: 'solid', size: 'md' },
  },
);

export interface ButtonProps extends ComponentProps<'button'>, VariantProps<typeof buttonVariants> {
  /** Renders the child element (e.g. a router link) with button styles. */
  asChild?: boolean;
}

export function Button({ className, variant, size, asChild, type, ...props }: ButtonProps) {
  const Comp = asChild ? Slot.Root : 'button';
  return (
    <Comp
      type={asChild ? undefined : (type ?? 'button')}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}
