import { type Artwork, type ArtworkStatus, ensureVisit, nearby, type Venue } from '@mnemo/core';
import { type PlaceResult, photonProvider } from '@mnemo/providers';
import {
  Button,
  Chip,
  cn,
  Dialog,
  DialogContent,
  Field,
  ImageDropzone,
  Input,
  Label,
  Segmented,
  Spinner,
  Switch,
  Textarea,
} from '@mnemo/ui';
import { useNavigate } from '@tanstack/react-router';
import { MapPinIcon, SparklesIcon, XIcon } from 'lucide-react';
import { type FormEvent, type ReactNode, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  useArtwork,
  useCollections,
  useLookups,
  useProviderContext,
  useVenues,
  useVisits,
} from '../../app/data';
import type { DialogProps } from '../../app/dialogs';
import { useStore } from '../../app/store';
import { Flag } from '../../components/bits';
import { MediaImage } from '../../components/MediaImage';
import { VenuePicker } from '../../components/PlaceSearch';
import { type ProcessedImage, processImage, saveProcessedImage } from '../../lib/media';
import { importVenue } from '../../lib/places';

export function ArtworkFormDialog({ spec, onClose }: DialogProps<'artwork'>) {
  const existing = useArtwork(spec.artworkId ?? '');
  if (spec.artworkId && existing.data === undefined) return null;
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <ArtworkForm spec={spec} artwork={existing.data ?? undefined} onClose={onClose} />
    </Dialog>
  );
}

interface PendingImage {
  key: string;
  previewUrl: string;
  processed?: ProcessedImage;
  failed?: boolean;
}

type Suggestion = { type: 'own'; venue: Venue } | { type: 'remote'; result: PlaceResult };

function ArtworkForm({
  spec,
  artwork,
  onClose,
}: DialogProps<'artwork'> & { artwork: Artwork | undefined }) {
  const { t } = useTranslation();
  const store = useStore();
  const navigate = useNavigate();
  const ctx = useProviderContext();
  const { venues: venueMap, placeOfVenue } = useLookups();
  const venues = useVenues();
  const visits = useVisits();
  const collections = useCollections();

  const initialVisit = visits?.find((v) => v.id === (artwork?.visitId ?? spec.visitId));
  const [title, setTitle] = useState(artwork?.title ?? '');
  const [artist, setArtist] = useState(artwork?.artist ?? '');
  const [year, setYear] = useState(artwork?.year ?? '');
  const [medium, setMedium] = useState(artwork?.medium ?? '');
  const [status, setStatus] = useState<ArtworkStatus>(artwork?.status ?? spec.status ?? 'seen');
  const [venueId, setVenueId] = useState(artwork?.venueId ?? spec.venueId ?? initialVisit?.venueId);
  const [pickingVenue, setPickingVenue] = useState(false);
  const [date, setDate] = useState(initialVisit?.date ?? '');
  const [notes, setNotes] = useState(artwork?.notes ?? '');
  const [tags, setTags] = useState<string[]>(artwork?.tags ?? []);
  const [tagDraft, setTagDraft] = useState('');
  const [favorite, setFavorite] = useState(artwork?.favorite ?? false);
  const [collectionIds, setCollectionIds] = useState<Set<string>>(
    () =>
      new Set(
        (collections ?? [])
          .filter((c) => artwork && c.artworkIds.includes(artwork.id))
          .map((c) => c.id),
      ),
  );
  const [keptMediaIds, setKeptMediaIds] = useState<string[]>(artwork?.mediaIds ?? []);
  const [pending, setPending] = useState<PendingImage[]>([]);
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null);
  const [saving, setSaving] = useState(false);
  const jobs = useRef(new Map<string, Promise<ProcessedImage | null>>());
  const previewUrls = useRef<string[]>([]);
  useEffect(
    () => () => {
      for (const url of previewUrls.current) URL.revokeObjectURL(url);
    },
    [],
  );

  // Date and venue from photo metadata, unless the user already set them.
  const fieldsRef = useRef({ date, venueId });
  fieldsRef.current = { date, venueId };

  const suggestFromPhoto = async (image: ProcessedImage) => {
    if (image.takenAt && !fieldsRef.current.date) setDate(image.takenAt.slice(0, 10));
    const coords = image.takenCoords;
    if (!coords || fieldsRef.current.venueId) return;
    const [own] = nearby(venues ?? [], coords, 0.5);
    if (own) {
      setSuggestion({ type: 'own', venue: own });
      return;
    }
    try {
      const result = await photonProvider.reverseVenue(coords, ctx);
      if (result) setSuggestion({ type: 'remote', result });
    } catch {
      // Suggestions are a convenience; ignore network failures.
    }
  };

  const addFiles = (files: File[]) => {
    for (const file of files) {
      const key = crypto.randomUUID();
      const previewUrl = URL.createObjectURL(file);
      previewUrls.current.push(previewUrl);
      setPending((p) => [...p, { key, previewUrl }]);
      const job = processImage(file)
        .then((processed) => {
          setPending((p) => p.map((i) => (i.key === key ? { ...i, processed } : i)));
          void suggestFromPhoto(processed);
          return processed;
        })
        .catch(() => {
          setPending((p) => p.map((i) => (i.key === key ? { ...i, failed: true } : i)));
          return null;
        });
      jobs.current.set(key, job);
    }
  };

  // Files handed over by drag & drop on other pages.
  const initialFiles = useRef(spec.files);
  // biome-ignore lint/correctness/useExhaustiveDependencies: run once on mount
  useEffect(() => {
    if (initialFiles.current?.length) addFiles(initialFiles.current);
    initialFiles.current = undefined;
  }, []);

  const acceptSuggestion = async () => {
    if (!suggestion) return;
    const venue =
      suggestion.type === 'own'
        ? suggestion.venue
        : await importVenue(store, suggestion.result, ctx);
    setVenueId(venue.id);
    setSuggestion(null);
  };

  const addTag = () => {
    const tag = tagDraft.trim().replace(/^#/, '');
    if (tag && !tags.includes(tag)) setTags([...tags, tag]);
    setTagDraft('');
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    try {
      const newMediaIds: string[] = [];
      for (const item of pending) {
        const processed = item.processed ?? (await jobs.current.get(item.key));
        if (processed)
          newMediaIds.push((await saveProcessedImage(store, processed, { alt: title.trim() })).id);
      }
      const mediaIds = [...keptMediaIds, ...newMediaIds];
      const primary = mediaIds[0] ? await store.media.get(mediaIds[0]) : undefined;
      const visitId =
        status === 'seen' && venueId && date
          ? (await ensureVisit(store, venueId, date)).id
          : undefined;

      const draft = {
        title: title.trim(),
        artist: artist.trim() || undefined,
        year: year.trim() || undefined,
        medium: medium.trim() || undefined,
        status,
        venueId,
        visitId,
        notes,
        tags,
        favorite,
        mediaIds,
        palette: primary?.palette ?? [],
      };
      const saved = artwork
        ? await store.artworks.update(artwork.id, draft)
        : await store.artworks.create(draft);

      for (const removed of (artwork?.mediaIds ?? []).filter((id) => !keptMediaIds.includes(id))) {
        await store.media.delete(removed);
      }
      for (const c of collections ?? []) {
        const has = c.artworkIds.includes(saved.id);
        const wants = collectionIds.has(c.id);
        if (has !== wants) {
          await store.collections.update(c.id, {
            artworkIds: wants
              ? [...c.artworkIds, saved.id]
              : c.artworkIds.filter((id) => id !== saved.id),
          });
        }
      }

      onClose();
      toast.success(artwork ? t('artwork.updated') : t('artwork.created', { title: saved.title }), {
        action: artwork
          ? undefined
          : {
              label: t('common.view'),
              onClick: () =>
                void navigate({ to: '/artwork/$artworkId', params: { artworkId: saved.id } }),
            },
      });
    } catch (error) {
      toast.error(t('common.saveFailed'), { description: (error as Error).message });
    } finally {
      setSaving(false);
    }
  };

  const venue = venueId ? venueMap.get(venueId) : undefined;
  const place = placeOfVenue(venueId);
  const processing = pending.some((p) => !p.processed && !p.failed);

  return (
    <DialogContent
      size="xl"
      eyebrow={artwork ? t('artwork.form.editEyebrow') : t('artwork.form.newEyebrow')}
      title={artwork ? artwork.title : t('artwork.form.title')}
      footer={
        <>
          {processing && (
            <span className="mr-auto flex items-center gap-2 text-xs text-ink-3">
              <Spinner className="size-3.5" /> {t('artwork.form.processing')}
            </span>
          )}
          <Button variant="ghost" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" form="artwork-form" disabled={saving || !title.trim()}>
            {saving ? <Spinner className="size-4 border-paper/40 border-t-paper" /> : null}
            {t('common.save')}
          </Button>
        </>
      }
    >
      <form
        id="artwork-form"
        onSubmit={submit}
        className="grid gap-8 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]"
      >
        <section className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {keptMediaIds.map((id, index) => (
              <Thumb
                key={id}
                primary={index === 0}
                onRemove={() => setKeptMediaIds((ids) => ids.filter((m) => m !== id))}
              >
                <MediaImage mediaId={id} alt="" className="size-full" />
              </Thumb>
            ))}
            {pending.map((p, index) => (
              <Thumb
                key={p.key}
                primary={keptMediaIds.length === 0 && index === 0}
                busy={!p.processed && !p.failed}
                onRemove={() => {
                  jobs.current.delete(p.key);
                  setPending((list) => list.filter((i) => i.key !== p.key));
                }}
              >
                <img src={p.previewUrl} alt="" className="size-full object-cover" />
              </Thumb>
            ))}
          </div>
          <ImageDropzone
            onFiles={addFiles}
            label={t('artwork.form.dropLabel')}
            hint={t('artwork.form.dropHint')}
            className={keptMediaIds.length + pending.length > 0 ? 'py-6' : 'py-16'}
          />
          {suggestion && (
            <div className="flex items-start gap-3 rounded-frame border border-accent/30 bg-accent-soft p-4 text-sm animate-rise">
              <SparklesIcon className="mt-0.5 size-4 shrink-0 text-accent" />
              <div className="flex-1">
                <p className="text-ink-2">
                  {t('artwork.form.suggestion', {
                    name:
                      suggestion.type === 'own' ? suggestion.venue.name : suggestion.result.name,
                  })}
                </p>
                <div className="mt-2 flex gap-2">
                  <Button size="sm" variant="accent" onClick={() => void acceptSuggestion()}>
                    {t('common.yes')}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setSuggestion(null)}>
                    {t('common.no')}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </section>

        <section className="space-y-5">
          <Segmented
            aria-label={t('artwork.form.status')}
            value={status}
            onChange={setStatus}
            options={[
              { value: 'seen', label: t('artwork.status.seen') },
              { value: 'wishlist', label: t('artwork.status.wishlistLong') },
            ]}
          />
          <Field label={t('artwork.fields.title')}>
            {(id) => (
              <Input
                id={id}
                required
                autoFocus
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="h-12 font-display text-lg italic"
              />
            )}
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t('artwork.fields.artist')}>
              {(id) => <Input id={id} value={artist} onChange={(e) => setArtist(e.target.value)} />}
            </Field>
            <Field label={t('artwork.fields.year')} hint={t('artwork.form.yearHint')}>
              {(id) => <Input id={id} value={year} onChange={(e) => setYear(e.target.value)} />}
            </Field>
          </div>
          <Field label={t('artwork.fields.medium')}>
            {(id) => <Input id={id} value={medium} onChange={(e) => setMedium(e.target.value)} />}
          </Field>

          <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_11rem]">
            <Field
              label={status === 'seen' ? t('artwork.fields.seenAt') : t('artwork.fields.wantAt')}
            >
              {(id) =>
                venue && !pickingVenue ? (
                  <div className="flex h-11 items-center justify-between gap-3 rounded-frame border border-line-strong px-3 text-sm">
                    <span className="flex min-w-0 items-center gap-2">
                      <MapPinIcon className="size-4 shrink-0 text-accent" />
                      <span className="truncate">{venue.name}</span>
                      {place && (
                        <span className="truncate text-ink-3">
                          <Flag code={place.countryCode} /> {place.name}
                        </span>
                      )}
                    </span>
                    <span className="flex shrink-0 gap-1">
                      <Button variant="link" size="sm" onClick={() => setPickingVenue(true)}>
                        {t('common.change')}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => setVenueId(undefined)}
                        aria-label={t('common.remove')}
                      >
                        <XIcon />
                      </Button>
                    </span>
                  </div>
                ) : (
                  <VenuePicker
                    id={id}
                    onSelect={(v) => {
                      setVenueId(v.id);
                      setPickingVenue(false);
                      setSuggestion(null);
                    }}
                  />
                )
              }
            </Field>
            {status === 'seen' && (
              <Field label={t('artwork.fields.date')}>
                {(id) => (
                  <Input
                    id={id}
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="h-11"
                  />
                )}
              </Field>
            )}
          </div>

          <Field label={t('artwork.fields.notes')}>
            {(id) => (
              <Textarea
                id={id}
                value={notes}
                placeholder={t('artwork.form.notesPlaceholder')}
                onChange={(e) => setNotes(e.target.value)}
                className="font-display text-base"
              />
            )}
          </Field>

          <div className="space-y-2">
            <Label htmlFor="artwork-tag">{t('artwork.fields.tags')}</Label>
            <div className="flex flex-wrap items-center gap-2">
              {tags.map((tag) => (
                <Chip key={tag} active onClick={() => setTags(tags.filter((x) => x !== tag))}>
                  #{tag} <XIcon className="size-3" />
                </Chip>
              ))}
              <Input
                id="artwork-tag"
                value={tagDraft}
                placeholder={t('artwork.form.tagPlaceholder')}
                onChange={(e) => setTagDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ',') {
                    e.preventDefault();
                    addTag();
                  }
                }}
                onBlur={addTag}
                className="h-8 w-40 rounded-full text-xs"
              />
            </div>
          </div>

          {(collections?.length ?? 0) > 0 && (
            <div className="space-y-2">
              <Label>{t('artwork.fields.collections')}</Label>
              <div className="flex flex-wrap gap-2">
                {collections?.map((c) => (
                  <Chip
                    key={c.id}
                    active={collectionIds.has(c.id)}
                    onClick={() =>
                      setCollectionIds((set) => {
                        const next = new Set(set);
                        if (next.has(c.id)) next.delete(c.id);
                        else next.add(c.id);
                        return next;
                      })
                    }
                  >
                    {c.name}
                  </Chip>
                ))}
              </div>
            </div>
          )}

          <label
            htmlFor="artwork-favorite"
            className="flex cursor-pointer items-center justify-between gap-4 border-t border-line pt-5"
          >
            <span>
              <span className="block text-sm font-medium">{t('artwork.favorite')}</span>
              <span className="block text-xs text-ink-3">{t('artwork.form.favoriteHint')}</span>
            </span>
            <Switch id="artwork-favorite" checked={favorite} onCheckedChange={setFavorite} />
          </label>
        </section>
      </form>
    </DialogContent>
  );
}

function Thumb({
  children,
  primary,
  busy,
  onRemove,
}: {
  children: ReactNode;
  primary?: boolean;
  busy?: boolean;
  onRemove: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div
      className={cn(
        'group relative aspect-square overflow-hidden bg-paper-2 shadow-soft',
        primary && 'col-span-2 aspect-[4/3]',
      )}
    >
      {children}
      {busy && (
        <div className="absolute inset-0 grid place-items-center bg-paper/60">
          <Spinner />
        </div>
      )}
      {primary && (
        <span className="eyebrow absolute bottom-2 left-2 bg-surface/90 px-2 py-1 text-[0.5625rem]">
          {t('artwork.form.cover')}
        </span>
      )}
      <button
        type="button"
        onClick={onRemove}
        aria-label={t('common.remove')}
        className="absolute top-2 right-2 grid size-7 cursor-pointer place-items-center rounded-full bg-surface/90 text-ink opacity-0 shadow-soft transition-opacity group-hover:opacity-100 focus:opacity-100"
      >
        <XIcon className="size-3.5" />
      </button>
    </div>
  );
}
