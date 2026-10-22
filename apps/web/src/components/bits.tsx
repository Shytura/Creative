import { flagEmoji, type VenueKind } from '@mnemo/core';
import { Button, cn, DialogContent, Dialog as DialogRoot } from '@mnemo/ui';
import {
  CastleIcon,
  ChurchIcon,
  EyeIcon,
  FrameIcon,
  LandmarkIcon,
  MapPinIcon,
  TreesIcon,
} from 'lucide-react';
import { type ReactNode, useState } from 'react';
import { useTranslation } from 'react-i18next';

const KIND_ICONS: Record<VenueKind, typeof LandmarkIcon> = {
  museum: LandmarkIcon,
  gallery: FrameIcon,
  sight: EyeIcon,
  church: ChurchIcon,
  castle: CastleIcon,
  park: TreesIcon,
  other: MapPinIcon,
};

export function KindIcon({ kind, className }: { kind: VenueKind; className?: string }) {
  const Icon = KIND_ICONS[kind];
  return <Icon className={cn('size-4', className)} strokeWidth={1.5} aria-hidden="true" />;
}

export function Flag({ code, className }: { code: string | undefined; className?: string }) {
  return (
    <span aria-hidden="true" className={cn('inline-block leading-none', className)}>
      {flagEmoji(code)}
    </span>
  );
}

interface ConfirmProps {
  /** Renders the opener; omit when controlling `open` from outside (e.g. from a menu). */
  trigger?: (open: () => void) => ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  title: ReactNode;
  description: ReactNode;
  confirmLabel: ReactNode;
  onConfirm: () => void | Promise<void>;
}

/** Destructive-action confirmation with an explicit confirm button. */
export function Confirm({
  trigger,
  title,
  description,
  confirmLabel,
  onConfirm,
  ...controlled
}: ConfirmProps) {
  const { t } = useTranslation();
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlled.open ?? internalOpen;
  const setOpen = controlled.onOpenChange ?? setInternalOpen;
  const [busy, setBusy] = useState(false);
  return (
    <>
      {trigger?.(() => setOpen(true))}
      <DialogRoot open={open} onOpenChange={setOpen}>
        <DialogContent
          size="sm"
          title={title}
          footer={
            <>
              <Button variant="ghost" onClick={() => setOpen(false)}>
                {t('common.cancel')}
              </Button>
              <Button
                variant="danger"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  try {
                    await onConfirm();
                    setOpen(false);
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                {confirmLabel}
              </Button>
            </>
          }
        >
          <p className="text-sm leading-relaxed text-ink-2">{description}</p>
        </DialogContent>
      </DialogRoot>
    </>
  );
}

/** Definition list row used on detail pages. */
export function Fact({ label, children }: { label: ReactNode; children: ReactNode }) {
  if (children === undefined || children === null || children === '') return null;
  return (
    <div className="grid grid-cols-[7.5rem_1fr] gap-4 border-b border-line py-3 text-sm">
      <dt className="eyebrow pt-0.5 text-ink-3">{label}</dt>
      <dd className="text-ink">{children}</dd>
    </div>
  );
}

export function ErrorNote({ children, onRetry }: { children: ReactNode; onRetry?: () => void }) {
  const { t } = useTranslation();
  return (
    <div className="flex items-center justify-between gap-4 rounded-frame border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-ink-2">
      <span>{children}</span>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          {t('common.retry')}
        </Button>
      )}
    </div>
  );
}
