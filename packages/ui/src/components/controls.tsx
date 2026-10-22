import { Switch as S } from 'radix-ui';
import { type ComponentProps, type ReactNode, useId } from 'react';
import { cn } from '../cn';

interface ChipProps extends ComponentProps<'button'> {
  active?: boolean;
  /** Small colour dot or icon in front of the label. */
  leading?: ReactNode;
}

export function Chip({ active, leading, className, children, ...props }: ChipProps) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={cn(
        'inline-flex h-8 cursor-pointer items-center gap-2 rounded-full border px-3.5 text-xs font-medium whitespace-nowrap transition-colors duration-200',
        active
          ? 'border-ink bg-ink text-paper'
          : 'border-line-strong text-ink-2 hover:border-ink-3 hover:text-ink',
        className,
      )}
      {...props}
    >
      {leading}
      {children}
    </button>
  );
}

export function Tag({ className, ...props }: ComponentProps<'span'>) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border border-line px-2.5 py-0.5 text-[0.6875rem] font-medium tracking-wide text-ink-2',
        className,
      )}
      {...props}
    />
  );
}

interface SegmentedProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: ReadonlyArray<{ value: T; label: ReactNode; icon?: ReactNode }>;
  className?: string;
  'aria-label'?: string;
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  className,
  ...rest
}: SegmentedProps<T>) {
  const name = useId();
  return (
    <fieldset
      className={cn('inline-flex min-w-0 rounded-full border border-line-strong p-0.5', className)}
    >
      {rest['aria-label'] && <legend className="sr-only">{rest['aria-label']}</legend>}
      {options.map((o) => {
        const checked = value === o.value;
        return (
          <label
            key={o.value}
            data-checked={checked}
            className={cn(
              'relative inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-full px-3.5 text-xs font-medium transition-colors duration-200 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent [&_svg]:size-3.5',
              checked ? 'bg-ink text-paper' : 'text-ink-2 hover:text-ink',
            )}
          >
            <input
              type="radio"
              name={name}
              value={o.value}
              checked={checked}
              onChange={() => onChange(o.value)}
              className="sr-only"
            />
            {o.icon}
            {o.label}
          </label>
        );
      })}
    </fieldset>
  );
}

export function Switch({ className, ...props }: ComponentProps<typeof S.Root>) {
  return (
    <S.Root
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border border-line-strong bg-paper-2 transition-colors data-[state=checked]:border-accent data-[state=checked]:bg-accent',
        className,
      )}
      {...props}
    >
      <S.Thumb className="block size-4.5 translate-x-0.5 rounded-full bg-surface shadow-soft transition-transform duration-300 ease-gallery data-[state=checked]:translate-x-[1.3rem]" />
    </S.Root>
  );
}

interface RatingProps {
  value: number | undefined;
  onChange?: (value: number | undefined) => void;
  label: string;
  className?: string;
}

const STEPS = [1, 2, 3, 4, 5];

function Diamond({ filled }: { filled: boolean }) {
  return (
    <span
      className={cn(
        'block size-2.5 rotate-45 border transition-colors',
        filled ? 'border-accent bg-accent' : 'border-line-strong',
      )}
    />
  );
}

/** Five small diamonds; selecting the current value again clears it. */
export function Rating({ value = 0, onChange, label, className }: RatingProps) {
  const name = useId();
  if (!onChange) {
    return (
      <span role="img" aria-label={`${label}: ${value}/5`} className={cn('flex gap-1', className)}>
        {STEPS.map((n) => (
          <span key={n} className="p-0.5">
            <Diamond filled={n <= value} />
          </span>
        ))}
      </span>
    );
  }
  return (
    <fieldset className={cn('flex min-w-0 gap-1', className)}>
      <legend className="sr-only">{label}</legend>
      {STEPS.map((n) => (
        <label
          key={n}
          className="cursor-pointer rounded-[2px] p-1 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent"
        >
          <input
            type="radio"
            name={name}
            value={n}
            checked={value === n}
            onChange={() => onChange(n)}
            onClick={() => value === n && onChange(undefined)}
            className="sr-only"
          />
          <Diamond filled={n <= value} />
          <span className="sr-only">{n}</span>
        </label>
      ))}
    </fieldset>
  );
}

interface SwatchProps extends ComponentProps<'button'> {
  color: string;
  active?: boolean;
}

export function Swatch({ color, active, className, ...props }: SwatchProps) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={cn(
        'size-7 cursor-pointer rounded-full border border-black/10 transition-transform duration-200 hover:scale-110',
        active && 'ring-2 ring-ink ring-offset-2 ring-offset-paper',
        className,
      )}
      style={{ background: color }}
      {...props}
    />
  );
}
