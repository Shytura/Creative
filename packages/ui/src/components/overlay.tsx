import { XIcon } from 'lucide-react';
import { Dialog as D, DropdownMenu as DM, Popover as P, Tooltip as T } from 'radix-ui';
import type { ComponentProps, ReactNode } from 'react';
import { cn } from '../cn';

// ── Dialog ─────────────────────────────────────────────────────────────────

export const Dialog = D.Root;
export const DialogTrigger = D.Trigger;
export const DialogClose = D.Close;

const overlayClass =
  'fixed inset-0 z-50 bg-overlay backdrop-blur-[3px] data-[state=open]:animate-fade data-[state=closed]:opacity-0';

interface DialogContentProps extends Omit<ComponentProps<typeof D.Content>, 'title'> {
  title: ReactNode;
  eyebrow?: ReactNode;
  description?: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const sizes = { sm: 'max-w-md', md: 'max-w-xl', lg: 'max-w-3xl', xl: 'max-w-5xl' };

export function DialogContent({
  title,
  eyebrow,
  description,
  footer,
  size = 'md',
  className,
  children,
  ...props
}: DialogContentProps) {
  return (
    <D.Portal>
      <D.Overlay className={overlayClass} />
      <D.Content
        className={cn(
          'fixed top-1/2 left-1/2 z-50 flex max-h-[min(92dvh,900px)] w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2 flex-col rounded-frame border border-line bg-surface shadow-float data-[state=open]:animate-rise focus:outline-none',
          sizes[size],
          className,
        )}
        {...props}
      >
        <header className="flex items-start justify-between gap-6 border-b border-line px-6 pt-6 pb-4 sm:px-8">
          <div className="min-w-0">
            {eyebrow && <p className="eyebrow mb-2 text-accent">{eyebrow}</p>}
            <D.Title className="display text-3xl font-[420]">{title}</D.Title>
            {description ? (
              <D.Description className="mt-2 text-sm text-ink-2">{description}</D.Description>
            ) : (
              <D.Description className="sr-only">{title}</D.Description>
            )}
          </div>
          <D.Close className="-mr-2 rounded-frame p-2 text-ink-3 transition-colors hover:bg-ink/6 hover:text-ink">
            <XIcon className="size-5" />
            <span className="sr-only">Close</span>
          </D.Close>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6 sm:px-8">{children}</div>
        {footer && (
          <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-line px-6 py-4 sm:px-8">
            {footer}
          </footer>
        )}
      </D.Content>
    </D.Portal>
  );
}

// ── Sheet: a dialog sliding in from the edge ───────────────────────────────

interface SheetContentProps extends Omit<ComponentProps<typeof D.Content>, 'title'> {
  title: ReactNode;
  side?: 'right' | 'left';
}

export function SheetContent({
  title,
  side = 'right',
  className,
  children,
  ...props
}: SheetContentProps) {
  return (
    <D.Portal>
      <D.Overlay className={overlayClass} />
      <D.Content
        className={cn(
          'fixed top-0 bottom-0 z-50 flex w-[min(28rem,100vw)] flex-col border-line bg-surface shadow-float focus:outline-none',
          side === 'right'
            ? 'right-0 border-l data-[state=open]:animate-slide-right'
            : 'left-0 border-r data-[state=open]:animate-slide-left',
          className,
        )}
        {...props}
      >
        <header className="flex items-center justify-between border-b border-line px-6 py-4">
          <D.Title className="display text-2xl">{title}</D.Title>
          <D.Description className="sr-only">{title}</D.Description>
          <D.Close className="rounded-frame p-2 text-ink-3 hover:bg-ink/6 hover:text-ink">
            <XIcon className="size-5" />
            <span className="sr-only">Close</span>
          </D.Close>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto p-6">{children}</div>
      </D.Content>
    </D.Portal>
  );
}

// ── Popover ────────────────────────────────────────────────────────────────

export const Popover = P.Root;
export const PopoverTrigger = P.Trigger;
export const PopoverAnchor = P.Anchor;

export function PopoverContent({
  className,
  sideOffset = 6,
  ...props
}: ComponentProps<typeof P.Content>) {
  return (
    <P.Portal>
      <P.Content
        sideOffset={sideOffset}
        className={cn(
          'z-50 rounded-frame border border-line bg-surface p-2 shadow-frame data-[state=open]:animate-fade focus:outline-none',
          className,
        )}
        {...props}
      />
    </P.Portal>
  );
}

// ── Dropdown menu ──────────────────────────────────────────────────────────

export const Menu = DM.Root;
export const MenuTrigger = DM.Trigger;

export function MenuContent({
  className,
  sideOffset = 6,
  ...props
}: ComponentProps<typeof DM.Content>) {
  return (
    <DM.Portal>
      <DM.Content
        sideOffset={sideOffset}
        className={cn(
          'z-50 min-w-52 rounded-frame border border-line bg-surface p-1.5 shadow-frame data-[state=open]:animate-fade',
          className,
        )}
        {...props}
      />
    </DM.Portal>
  );
}

export function MenuItem({ className, ...props }: ComponentProps<typeof DM.Item>) {
  return (
    <DM.Item
      className={cn(
        'flex cursor-pointer items-center gap-3 rounded-[2px] px-3 py-2 text-sm text-ink-2 outline-none select-none data-[highlighted]:bg-ink/6 data-[highlighted]:text-ink data-[disabled]:opacity-40 [&_svg]:size-4 [&_svg]:text-ink-3',
        className,
      )}
      {...props}
    />
  );
}

export function MenuSeparator() {
  return <DM.Separator className="my-1.5 h-px bg-line" />;
}

export function MenuLabel({ className, ...props }: ComponentProps<typeof DM.Label>) {
  return <DM.Label className={cn('eyebrow px-3 pt-2 pb-1 text-ink-3', className)} {...props} />;
}

// ── Tooltip ────────────────────────────────────────────────────────────────

export const TooltipProvider = T.Provider;

export function Tooltip({ content, children }: { content: ReactNode; children: ReactNode }) {
  return (
    <T.Root>
      <T.Trigger asChild>{children}</T.Trigger>
      <T.Portal>
        <T.Content
          sideOffset={6}
          className="z-50 rounded-[2px] bg-ink px-2.5 py-1.5 text-xs text-paper shadow-frame data-[state=delayed-open]:animate-fade"
        >
          {content}
        </T.Content>
      </T.Portal>
    </T.Root>
  );
}
