import { LoaderIcon, SearchIcon } from 'lucide-react';
import { Popover as P } from 'radix-ui';
import { type KeyboardEvent, type ReactNode, useEffect, useId, useState } from 'react';
import { cn } from '../cn';

export interface ComboboxProps<T> {
  query: string;
  onQueryChange: (query: string) => void;
  items: readonly T[];
  getKey: (item: T) => string;
  renderItem: (item: T) => ReactNode;
  onSelect: (item: T) => void;
  placeholder?: string;
  loading?: boolean;
  emptyText?: ReactNode;
  /** Extra row below the results, e.g. "create manually". */
  footer?: ReactNode;
  autoFocus?: boolean;
  className?: string;
  id?: string;
}

/**
 * Search field with a suggestion list. Data fetching (and debouncing) stays with the caller,
 * which keeps the component usable for local and remote sources alike.
 */
export function Combobox<T>({
  query,
  onQueryChange,
  items,
  getKey,
  renderItem,
  onSelect,
  placeholder,
  loading,
  emptyText,
  footer,
  autoFocus,
  className,
  id,
}: ComboboxProps<T>) {
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  // biome-ignore lint/correctness/useExhaustiveDependencies: reset the highlight whenever results change
  useEffect(() => setActive(0), [items]);

  const select = (item: T) => {
    onSelect(item);
    setOpen(false);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setActive((i) => Math.min(i + 1, items.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && open && items[active]) {
      e.preventDefault();
      select(items[active]);
    } else if (e.key === 'Escape' && open) {
      e.stopPropagation();
      setOpen(false);
    }
  };

  const showList = open && query.trim().length > 0;

  return (
    <P.Root open={showList} onOpenChange={setOpen}>
      <P.Anchor asChild>
        <div className={cn('relative', className)}>
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-3" />
          <input
            id={id}
            role="combobox"
            aria-expanded={showList}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={showList && items[active] ? `${listId}-${active}` : undefined}
            autoFocus={autoFocus}
            autoComplete="off"
            value={query}
            placeholder={placeholder}
            onChange={(e) => {
              onQueryChange(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={onKeyDown}
            className="h-11 w-full rounded-frame border border-line-strong bg-surface/70 pr-9 pl-9 text-sm text-ink placeholder:text-ink-3 transition-colors hover:border-ink-3 focus:border-ink focus:bg-surface focus:outline-none"
          />
          {loading && (
            <LoaderIcon className="absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin text-ink-3" />
          )}
        </div>
      </P.Anchor>
      <P.Portal>
        <P.Content
          align="start"
          sideOffset={6}
          onOpenAutoFocus={(e) => e.preventDefault()}
          onInteractOutside={(e) => {
            if ((e.target as HTMLElement).closest?.('[role="combobox"]')) e.preventDefault();
          }}
          className="z-[60] w-[var(--radix-popover-trigger-width)] min-w-72 overflow-hidden rounded-frame border border-line bg-surface shadow-frame data-[state=open]:animate-fade"
        >
          <div id={listId} role="listbox" className="max-h-80 overflow-y-auto p-1">
            {items.map((item, index) => (
              <div
                key={getKey(item)}
                id={`${listId}-${index}`}
                role="option"
                tabIndex={-1}
                aria-selected={index === active}
                onMouseEnter={() => setActive(index)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => select(item)}
                onKeyDown={() => undefined}
                className={cn(
                  'cursor-pointer rounded-[2px] px-3 py-2.5 text-sm transition-colors',
                  index === active ? 'bg-ink/6 text-ink' : 'text-ink-2',
                )}
              >
                {renderItem(item)}
              </div>
            ))}
            {items.length === 0 && !loading && emptyText && (
              <p className="px-3 py-3 text-sm text-ink-3">{emptyText}</p>
            )}
          </div>
          {footer && <div className="border-t border-line p-1">{footer}</div>}
        </P.Content>
      </P.Portal>
    </P.Root>
  );
}
