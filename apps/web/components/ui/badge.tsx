import { cva, type VariantProps } from 'class-variance-authority';
import type { HTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold',
  {
    variants: {
      variant: {
        default: 'border-blue-200 bg-blue-50 text-blue-800',
        success: 'border-emerald-200 bg-emerald-50 text-emerald-800',
        muted: 'border-slate-200 bg-slate-100 text-slate-700',
        warning: 'border-amber-200 bg-amber-50 text-amber-800',
      },
    },
    defaultVariants: { variant: 'default' },
  },
);

type BadgeProps = HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>;

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
