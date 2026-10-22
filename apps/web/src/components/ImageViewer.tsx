import { MinusIcon, PlusIcon, ScanIcon, XIcon } from 'lucide-react';
import type OpenSeadragon from 'openseadragon';
import { Dialog } from 'radix-ui';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

interface ImageViewerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  src: string | undefined;
  /** IIIF `info.json`: enables tiled deep zoom down to brushstroke level. */
  iiifInfoUrl?: string | undefined;
  title: string;
  caption?: string;
}

/** Fullscreen zoomable viewer, powered by OpenSeadragon (loaded on demand). */
export function ImageViewer({
  open,
  onOpenChange,
  src,
  iiifInfoUrl,
  title,
  caption,
}: ImageViewerProps) {
  const { t } = useTranslation();
  const [element, setElement] = useState<HTMLDivElement | null>(null);
  const viewer = useRef<OpenSeadragon.Viewer | null>(null);

  useEffect(() => {
    if (!open || !element || !src) return;
    let disposed = false;
    void import('openseadragon').then(({ default: OSD }) => {
      if (disposed) return;
      const simple = { type: 'image', url: src } as const;
      const instance = OSD({
        element,
        tileSources: iiifInfoUrl ?? simple,
        showNavigationControl: false,
        animationTime: 0.9,
        blendTime: 0.25,
        maxZoomPixelRatio: 2.5,
        visibilityRatio: 0.9,
        gestureSettingsMouse: { clickToZoom: false, dblClickToZoom: true },
      });
      // Not every IIIF server allows cross-origin access; fall back to the plain image.
      instance.addOnceHandler('open-failed', () => instance.open({ tileSource: simple }));
      viewer.current = instance;
    });
    return () => {
      disposed = true;
      viewer.current?.destroy();
      viewer.current = null;
    };
  }, [open, element, src, iiifInfoUrl]);

  const zoom = (factor: number) => {
    viewer.current?.viewport.zoomBy(factor);
    viewer.current?.viewport.applyConstraints();
  };

  const control =
    'grid size-11 cursor-pointer place-items-center rounded-full bg-white/10 text-white backdrop-blur transition-colors hover:bg-white/20 [&_svg]:size-5';

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-[#0b0a09] data-[state=open]:animate-fade" />
        <Dialog.Content className="fixed inset-0 z-50 flex flex-col text-white focus:outline-none data-[state=open]:animate-fade">
          <div className="flex items-start justify-between gap-4 px-6 pt-5">
            <div>
              <Dialog.Title className="caption text-2xl">{title}</Dialog.Title>
              <Dialog.Description className="mt-1 text-xs text-white/60">
                {caption ?? t('viewer.hint')}
              </Dialog.Description>
            </div>
            <Dialog.Close className={control} aria-label={t('common.close')}>
              <XIcon />
            </Dialog.Close>
          </div>
          <div ref={setElement} className="min-h-0 flex-1" />
          <div className="flex justify-center gap-3 pb-8">
            <button
              type="button"
              className={control}
              onClick={() => zoom(0.7)}
              aria-label={t('viewer.zoomOut')}
            >
              <MinusIcon />
            </button>
            <button
              type="button"
              className={control}
              onClick={() => viewer.current?.viewport.goHome()}
              aria-label={t('viewer.reset')}
            >
              <ScanIcon />
            </button>
            <button
              type="button"
              className={control}
              onClick={() => zoom(1.4)}
              aria-label={t('viewer.zoomIn')}
            >
              <PlusIcon />
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
