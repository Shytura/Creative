import { type Background, meshPresets, type SettingsPatch } from '@mnemo/core';
import {
  accentPresets,
  Button,
  cn,
  Field,
  Input,
  Label,
  meshGradients,
  PageHeader,
  Popover,
  PopoverContent,
  PopoverTrigger,
  paperGrain,
  Segmented,
  Select,
  Swatch,
} from '@mnemo/ui';
import { useQuery } from '@tanstack/react-query';
import {
  CheckIcon,
  DownloadIcon,
  ExternalLinkIcon,
  ImageIcon,
  SparklesIcon,
  UploadIcon,
} from 'lucide-react';
import { type ComponentProps, type ReactNode, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useArtworks, useCollections, useSettings } from '../../app/data';
import { useResolvedTheme } from '../../app/shell/Appearance';
import { useStore } from '../../app/store';
import { releases } from '../../changelog';
import { Confirm } from '../../components/bits';
import { MediaImage } from '../../components/MediaImage';
import { clearAll, exportBackup, exportShareable, importArchive } from '../../lib/archive-io';
import { useFormat } from '../../lib/format';
import { processImage, saveProcessedImage } from '../../lib/media';
import { APP_VERSION } from '../../version';
import { ReleaseNotes } from '../whats-new/WhatsNew';

export function SettingsPage() {
  const { t } = useTranslation();
  const store = useStore();
  const settings = useSettings();
  const update = (patch: SettingsPatch) => void store.settings.update(patch);

  return (
    <>
      <PageHeader
        eyebrow={t('settings.eyebrow')}
        title={t('settings.title')}
        lede={t('settings.lede')}
      />
      <div className="mt-6 divide-y divide-line">
        <Section title={t('settings.appearance')} text={t('settings.appearanceText')}>
          <div className="space-y-8">
            <div className="space-y-3">
              <Label>{t('settings.theme')}</Label>
              <div>
                <Segmented
                  value={settings.theme}
                  onChange={(theme) => update({ theme })}
                  options={[
                    { value: 'system', label: t('settings.themes.system') },
                    { value: 'light', label: t('settings.themes.light') },
                    { value: 'dark', label: t('settings.themes.dark') },
                  ]}
                />
              </div>
            </div>
            <div className="space-y-3">
              <Label>{t('settings.accent')}</Label>
              <div className="flex flex-wrap items-center gap-3">
                {accentPresets.map((p) => (
                  <Swatch
                    key={p.id}
                    color={p.color}
                    active={settings.accent === p.color}
                    aria-label={t(`settings.pigments.${p.id}`)}
                    title={t(`settings.pigments.${p.id}`)}
                    onClick={() => update({ accent: p.color })}
                  />
                ))}
                <label
                  className={cn(
                    'relative size-7 cursor-pointer overflow-hidden rounded-full border border-line-strong bg-[conic-gradient(#e94_0,#ec4_60deg,#4b6_120deg,#4bc_180deg,#56e_240deg,#c5c_300deg,#e94_360deg)]',
                  )}
                  title={t('settings.customColor')}
                >
                  <input
                    type="color"
                    className="absolute inset-0 cursor-pointer opacity-0"
                    value={settings.accent === 'auto' ? '#a4462f' : settings.accent}
                    onChange={(e) => update({ accent: e.target.value })}
                    aria-label={t('settings.customColor')}
                  />
                </label>
                <Button
                  variant={settings.accent === 'auto' ? 'solid' : 'outline'}
                  size="sm"
                  className="rounded-full"
                  onClick={() => update({ accent: 'auto' })}
                >
                  <SparklesIcon /> {t('settings.accentAuto')}
                </Button>
              </div>
              <p className="text-xs text-ink-3">{t('settings.accentHint')}</p>
            </div>
          </div>
        </Section>

        <Section title={t('settings.background')} text={t('settings.backgroundText')}>
          <BackgroundPicker />
        </Section>

        <Section title={t('settings.language')}>
          <Segmented
            value={settings.locale}
            onChange={(locale) => update({ locale })}
            options={[
              { value: 'system', label: t('settings.themes.system') },
              { value: 'de', label: 'Deutsch' },
              { value: 'en', label: 'English' },
            ]}
          />
        </Section>

        <Section title={t('settings.sources')} text={t('settings.sourcesText')}>
          <div className="grid gap-5 sm:grid-cols-2">
            <ApiKeyField
              label="Europeana"
              href="https://pro.europeana.eu/page/get-api"
              value={settings.providerKeys.europeana}
              onSave={(europeana) =>
                update({ providerKeys: { ...settings.providerKeys, europeana } })
              }
            />
            <ApiKeyField
              label="Harvard Art Museums"
              href="https://harvardartmuseums.org/collections/api"
              value={settings.providerKeys.harvard}
              onSave={(harvard) => update({ providerKeys: { ...settings.providerKeys, harvard } })}
            />
          </div>
        </Section>

        <Section title={t('settings.data')} text={t('settings.dataText')}>
          <DataSection />
        </Section>

        <Section title={t('settings.integration')} text={t('settings.integrationText')}>
          <pre className="overflow-x-auto rounded-frame border border-line bg-paper-2/60 p-5 font-mono text-xs leading-relaxed text-ink-2">
            {`<script type="module" src="mnemo-embed.js"></script>

<mnemo-gallery
  src="mnemo-sammlung.json"
  collection="Lieblingswerke"
  theme="auto"
  columns="3">
</mnemo-gallery>`}
          </pre>
        </Section>

        <Section
          title={t('settings.about')}
          text={t('settings.aboutText', { version: APP_VERSION })}
        >
          <ReleaseNotes releases={releases} />
        </Section>
      </div>
    </>
  );
}

function Section({ title, text, children }: { title: string; text?: string; children: ReactNode }) {
  return (
    <section className="grid gap-6 py-12 lg:grid-cols-[18rem_1fr] lg:gap-16">
      <div>
        <h2 className="display text-3xl font-[420]">{title}</h2>
        {text && <p className="mt-3 text-sm leading-relaxed text-ink-3">{text}</p>}
      </div>
      <div>{children}</div>
    </section>
  );
}

function BackgroundPicker() {
  const { t } = useTranslation();
  const store = useStore();
  const settings = useSettings();
  const theme = useResolvedTheme();
  const artworks = useArtworks();
  const fileRef = useRef<HTMLInputElement>(null);
  const bg = settings.background;
  const set = (background: Background) => void store.settings.update({ background });
  const withImages = (artworks ?? []).filter((a) => a.mediaIds.length > 0);

  const upload = async (file: File | undefined) => {
    if (!file) return;
    const previous = bg.kind === 'upload' ? bg.mediaId : undefined;
    const media = await saveProcessedImage(store, await processImage(file));
    set({ kind: 'upload', mediaId: media.id });
    if (previous) await store.media.delete(previous);
  };

  const tiles: Array<{
    key: string;
    label: string;
    active: boolean;
    onClick: () => void;
    preview: ReactNode;
  }> = [
    {
      key: 'plain',
      label: t('settings.backgrounds.plain'),
      active: bg.kind === 'plain',
      onClick: () => set({ kind: 'plain' }),
      preview: <div className="size-full bg-paper" />,
    },
    {
      key: 'paper',
      label: t('settings.backgrounds.paper'),
      active: bg.kind === 'paper',
      onClick: () => set({ kind: 'paper' }),
      preview: <div className="size-full bg-paper" style={{ backgroundImage: paperGrain }} />,
    },
    ...meshPresets.map((preset) => ({
      key: preset,
      label: t(`settings.meshes.${preset}`),
      active: bg.kind === 'mesh' && bg.preset === preset,
      onClick: () => set({ kind: 'mesh', preset }),
      preview: (
        <div
          className="size-full bg-paper"
          style={{ backgroundImage: meshGradients[preset][theme] }}
        />
      ),
    })),
    {
      key: 'daily',
      label: t('settings.backgrounds.daily'),
      active: bg.kind === 'daily',
      onClick: () => set({ kind: 'daily' }),
      preview: (
        <div className="grid size-full place-items-center bg-gradient-to-br from-gold/40 to-accent/40">
          <SparklesIcon className="size-5 text-ink-2" />
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 xl:grid-cols-6">
        {tiles.map((tile) => (
          <BackgroundTile
            key={tile.key}
            label={tile.label}
            active={tile.active}
            onClick={tile.onClick}
          >
            {tile.preview}
          </BackgroundTile>
        ))}
        <Popover>
          <PopoverTrigger asChild>
            <BackgroundTile
              label={t('settings.backgrounds.artwork')}
              active={bg.kind === 'artwork'}
              disabled={withImages.length === 0}
            >
              {bg.kind === 'artwork' ? (
                <MediaImage
                  mediaId={(artworks ?? []).find((a) => a.id === bg.artworkId)?.mediaIds[0]}
                  alt=""
                  className="size-full blur-[2px]"
                />
              ) : (
                <div className="grid size-full place-items-center bg-paper-2">
                  <ImageIcon className="size-5 text-ink-3" />
                </div>
              )}
            </BackgroundTile>
          </PopoverTrigger>
          <PopoverContent className="w-[min(26rem,calc(100vw-2rem))] p-3">
            <div className="grid max-h-80 grid-cols-4 gap-2 overflow-y-auto">
              {withImages.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => set({ kind: 'artwork', artworkId: a.id })}
                  className="cursor-pointer"
                  title={a.title}
                >
                  <MediaImage
                    mediaId={a.mediaIds[0]}
                    alt={a.title}
                    className={cn(
                      'aspect-square',
                      bg.kind === 'artwork' &&
                        bg.artworkId === a.id &&
                        'outline outline-2 outline-offset-2 outline-accent',
                    )}
                  />
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
        <BackgroundTile
          label={t('settings.backgrounds.upload')}
          active={bg.kind === 'upload'}
          onClick={() => fileRef.current?.click()}
        >
          {bg.kind === 'upload' ? (
            <MediaImage mediaId={bg.mediaId} alt="" className="size-full" />
          ) : (
            <div className="grid size-full place-items-center bg-paper-2">
              <UploadIcon className="size-5 text-ink-3" />
            </div>
          )}
        </BackgroundTile>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(e) => void upload(e.target.files?.[0])}
        />
      </div>
      {bg.kind !== 'plain' && bg.kind !== 'paper' && (
        <div className="max-w-sm space-y-2">
          <Label htmlFor="bg-intensity">{t('settings.intensity')}</Label>
          <input
            id="bg-intensity"
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={settings.backgroundIntensity}
            onChange={(e) =>
              void store.settings.update({ backgroundIntensity: Number(e.target.value) })
            }
            className="w-full accent-[var(--mn-accent)]"
          />
        </div>
      )}
    </div>
  );
}

function BackgroundTile({
  label,
  active,
  children,
  ...props
}: { label: string; active: boolean; children: ReactNode } & ComponentProps<'button'>) {
  return (
    <button
      type="button"
      className="group cursor-pointer text-left disabled:cursor-not-allowed disabled:opacity-40"
      aria-pressed={active}
      {...props}
    >
      <div
        className={cn(
          'relative aspect-[4/3] overflow-hidden rounded-frame border shadow-soft transition-all duration-300',
          active
            ? 'border-accent ring-2 ring-accent ring-offset-2 ring-offset-paper'
            : 'border-line group-hover:border-ink-3',
        )}
      >
        {children}
        {active && (
          <span className="absolute top-1.5 right-1.5 grid size-5 place-items-center rounded-full bg-accent text-accent-ink">
            <CheckIcon className="size-3" />
          </span>
        )}
      </div>
      <span className="mt-2 block truncate text-xs text-ink-2">{label}</span>
    </button>
  );
}

function ApiKeyField({
  label,
  href,
  value,
  onSave,
}: {
  label: string;
  href: string;
  value: string | undefined;
  onSave: (value: string | undefined) => void;
}) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState(value ?? '');
  return (
    <Field
      label={label}
      hint={
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 hover:text-accent"
        >
          {t('settings.getKey')} <ExternalLinkIcon className="size-3" />
        </a>
      }
    >
      {(id) => (
        <Input
          id={id}
          type="password"
          autoComplete="off"
          value={draft}
          placeholder={t('settings.keyPlaceholder')}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => draft.trim() !== (value ?? '') && onSave(draft.trim() || undefined)}
        />
      )}
    </Field>
  );
}

function DataSection() {
  const { t } = useTranslation();
  const store = useStore();
  const format = useFormat();
  const collections = useCollections();
  const [shareCollection, setShareCollection] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [pendingImport, setPendingImport] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const usage = useQuery({
    queryKey: ['local', 'media', 'usage'],
    queryFn: async () => ({
      media: await store.media.usage(),
      estimate: await navigator.storage?.estimate?.(),
    }),
  });

  const run = async (key: string, fn: () => Promise<void>) => {
    setBusy(key);
    try {
      await fn();
    } catch (error) {
      toast.error(t('settings.failed'), { description: (error as Error).message });
    } finally {
      setBusy(null);
    }
  };

  const doImport = (mode: 'merge' | 'replace') =>
    run('import', async () => {
      if (!pendingImport) return;
      const result = await importArchive(store, pendingImport, mode);
      toast.success(t('settings.imported', { artworks: result.artworks, places: result.places }));
      setPendingImport(null);
    });

  return (
    <div className="space-y-10">
      <p className="text-sm text-ink-2">
        {usage.data &&
          t('settings.usage', {
            media: format.bytes(usage.data.media),
            quota: usage.data.estimate?.quota ? format.bytes(usage.data.estimate.quota) : '–',
          })}
      </p>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-3 rounded-frame border border-line p-5">
          <p className="font-medium">{t('settings.backup')}</p>
          <p className="text-xs leading-relaxed text-ink-3">{t('settings.backupText')}</p>
          <Button
            variant="outline"
            disabled={busy !== null}
            onClick={() => void run('backup', () => exportBackup(store))}
          >
            <DownloadIcon /> {t('settings.exportBackup')}
          </Button>
        </div>
        <div className="space-y-3 rounded-frame border border-line p-5">
          <p className="font-medium">{t('settings.share')}</p>
          <p className="text-xs leading-relaxed text-ink-3">{t('settings.shareText')}</p>
          <div className="flex flex-wrap gap-2">
            <Select
              value={shareCollection}
              onChange={(e) => setShareCollection(e.target.value)}
              className="w-auto flex-1"
            >
              <option value="">{t('collection.all')}</option>
              {collections?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
            <Button
              variant="outline"
              disabled={busy !== null}
              onClick={() =>
                void run('share', () => exportShareable(store, shareCollection || undefined))
              }
            >
              <DownloadIcon /> JSON
            </Button>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <p className="font-medium">{t('settings.import')}</p>
        <p className="text-xs text-ink-3">{t('settings.importText')}</p>
        <input
          ref={fileRef}
          type="file"
          accept=".zip,.json,application/zip,application/json"
          className="sr-only"
          onChange={(e) => setPendingImport(e.target.files?.[0] ?? null)}
        />
        {pendingImport ? (
          <div className="flex flex-wrap items-center gap-3 rounded-frame border border-accent/40 bg-accent-soft p-4 text-sm">
            <span className="mr-auto">{pendingImport.name}</span>
            <Button
              size="sm"
              variant="outline"
              disabled={busy !== null}
              onClick={() => void doImport('merge')}
            >
              {t('settings.importMerge')}
            </Button>
            <Confirm
              title={t('settings.replaceTitle')}
              description={t('settings.replaceText')}
              confirmLabel={t('settings.importReplace')}
              onConfirm={() => doImport('replace')}
              trigger={(open) => (
                <Button size="sm" variant="ghost" disabled={busy !== null} onClick={open}>
                  {t('settings.importReplace')}
                </Button>
              )}
            />
          </div>
        ) : (
          <Button variant="outline" onClick={() => fileRef.current?.click()}>
            <UploadIcon /> {t('settings.chooseFile')}
          </Button>
        )}
      </div>

      <div className="border-t border-line pt-8">
        <Confirm
          title={t('settings.clearTitle')}
          description={t('settings.clearText')}
          confirmLabel={t('settings.clearConfirm')}
          onConfirm={async () => {
            await clearAll(store);
            toast.success(t('settings.cleared'));
          }}
          trigger={(open) => (
            <Button variant="ghost" className="text-danger" onClick={open}>
              {t('settings.clear')}
            </Button>
          )}
        />
      </div>
    </div>
  );
}
