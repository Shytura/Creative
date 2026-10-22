import type { ComponentProps, ReactNode } from 'react';
import { cn } from '../cn';

interface PageHeaderProps {
  /** Small kicker above the title, e.g. "№ 02 — Sammlung". */
  eyebrow?: ReactNode;
  title: ReactNode;
  lede?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

export function PageHeader({ eyebrow, title, lede, actions, className }: PageHeaderProps) {
  return (
    <header
      className={cn(
        'flex animate-rise flex-col gap-6 border-b border-line pb-8 md:flex-row md:items-end md:justify-between',
        className,
      )}
    >
      <div className="max-w-3xl">
        {eyebrow && <p className="eyebrow mb-4 text-accent">{eyebrow}</p>}
        <h1 className="display text-[clamp(2.75rem,7vw,5.5rem)] font-[380]">{title}</h1>
        {lede && (
          <p className="caption mt-5 max-w-2xl text-lg leading-relaxed text-ink-2 md:text-xl">
            {lede}
          </p>
        )}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

export function SectionTitle({
  children,
  action,
  className,
}: {
  children: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'mb-6 flex items-baseline justify-between gap-4 border-b border-line pb-3',
        className,
      )}
    >
      <h2 className="display text-2xl font-[420] md:text-3xl">{children}</h2>
      {action}
    </div>
  );
}

interface EmptyStateProps {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}

/** An empty gilded frame: the gallery equivalent of "nothing here yet". */
export function EmptyState({ title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center px-6 py-16 text-center', className)}>
      <svg viewBox="0 0 120 96" className="mb-8 w-28 text-gold" fill="none" aria-hidden="true">
        <rect x="4" y="4" width="112" height="88" rx="1" stroke="currentColor" strokeWidth="3" />
        <rect
          x="14"
          y="14"
          width="92"
          height="68"
          stroke="currentColor"
          strokeWidth="1"
          opacity=".6"
        />
        <rect x="22" y="22" width="76" height="52" className="fill-paper-2" />
        <path
          d="M22 66 46 44l14 12 12-8 26 18"
          stroke="currentColor"
          strokeWidth="1"
          opacity=".45"
        />
        <circle cx="78" cy="36" r="5" stroke="currentColor" strokeWidth="1" opacity=".45" />
      </svg>
      <h3 className="display text-3xl font-[400]">{title}</h3>
      {description && <p className="caption mt-3 max-w-md text-lg text-ink-2">{description}</p>}
      {action && <div className="mt-8">{action}</div>}
    </div>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      role="status"
      className={cn(
        'inline-block size-5 animate-spin rounded-full border-2 border-line-strong border-t-accent',
        className,
      )}
    />
  );
}

export function Skeleton({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn('animate-pulse rounded-frame bg-ink/6', className)} {...props} />;
}

interface StatProps {
  value: ReactNode;
  label: ReactNode;
  className?: string;
}

export function Stat({ value, label, className }: StatProps) {
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <span className="display text-5xl font-[340] tabular-nums md:text-6xl">{value}</span>
      <span className="eyebrow text-ink-3">{label}</span>
    </div>
  );
}

export function Kbd({ className, ...props }: ComponentProps<'kbd'>) {
  return (
    <kbd
      className={cn(
        'rounded-[2px] border border-line-strong px-1.5 py-0.5 font-sans text-[0.6875rem] text-ink-3',
        className,
      )}
      {...props}
    />
  );
}
