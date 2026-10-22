import { type ComponentProps, type ReactNode, useId } from 'react';
import { cn } from '../cn';

const control =
  'w-full rounded-frame border border-line-strong bg-surface/70 px-3 text-sm text-ink placeholder:text-ink-3 transition-colors duration-200 hover:border-ink-3 focus:border-ink focus:bg-surface focus:outline-none disabled:opacity-50';

export function Input({ className, ...props }: ComponentProps<'input'>) {
  return <input className={cn(control, 'h-10', className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<'textarea'>) {
  return (
    <textarea
      className={cn(control, 'min-h-24 resize-y py-2.5 leading-relaxed', className)}
      {...props}
    />
  );
}

export function Select({ className, children, ...props }: ComponentProps<'select'>) {
  return (
    <select
      className={cn(
        control,
        'h-10 appearance-none bg-[length:12px] bg-[right_0.75rem_center] bg-no-repeat pr-9',
        "bg-[url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 12' fill='none' stroke='%23888' stroke-width='1.5'%3E%3Cpath d='M3 4.5 6 7.5 9 4.5'/%3E%3C/svg%3E\")]",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}

export function Label({ className, ...props }: ComponentProps<'label'>) {
  // biome-ignore lint/a11y/noLabelWithoutControl: htmlFor is passed through props
  return <label className={cn('eyebrow text-ink-2', className)} {...props} />;
}

interface FieldProps {
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  className?: string;
  /** Receives the generated id to wire up the control. */
  children: (id: string) => ReactNode;
}

export function Field({ label, hint, error, className, children }: FieldProps) {
  const id = useId();
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <Label htmlFor={id}>{label}</Label>
      {children(id)}
      {error ? (
        <p className="text-xs text-danger">{error}</p>
      ) : hint ? (
        <p className="text-xs text-ink-3">{hint}</p>
      ) : null}
    </div>
  );
}
