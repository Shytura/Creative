import { removeVisit, todayIsoDate, type Visit } from '@mnemo/core';
import {
  Button,
  Dialog,
  DialogContent,
  Field,
  ImageDropzone,
  Input,
  Rating,
  Spinner,
  Textarea,
} from '@mnemo/ui';
import { MapPinIcon, XIcon } from 'lucide-react';
import { type FormEvent, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useLookups, useVisits } from '../../app/data';
import type { DialogProps } from '../../app/dialogs';
import { useStore } from '../../app/store';
import { Confirm, Flag } from '../../components/bits';
import { MediaImage } from '../../components/MediaImage';
import { VenuePicker } from '../../components/PlaceSearch';
import { type ProcessedImage, processImage, saveProcessedImage } from '../../lib/media';

export function VisitFormDialog({ spec, onClose }: DialogProps<'visit'>) {
  const visits = useVisits();
  if (spec.visitId && !visits) return null;
  const visit = visits?.find((v) => v.id === spec.visitId);
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <VisitForm spec={spec} visit={visit} onClose={onClose} />
    </Dialog>
  );
}

function VisitForm({ spec, visit, onClose }: DialogProps<'visit'> & { visit: Visit | undefined }) {
  const { t } = useTranslation();
  const store = useStore();
  const { venues, placeOfVenue } = useLookups();
  const [venueId, setVenueId] = useState(visit?.venueId ?? spec.venueId);
  const [date, setDate] = useState(visit?.date ?? todayIsoDate());
  const [endDate, setEndDate] = useState(visit?.endDate ?? '');
  const [rating, setRating] = useState(visit?.rating);
  const [notes, setNotes] = useState(visit?.notes ?? '');
  const [companions, setCompanions] = useState((visit?.companions ?? []).join(', '));
  const [mediaIds, setMediaIds] = useState(visit?.mediaIds ?? []);
  const [photos, setPhotos] = useState<
    Array<{ key: string; url: string; job: Promise<ProcessedImage | null> }>
  >([]);
  const [saving, setSaving] = useState(false);
  const urls = useRef<string[]>([]);
  useEffect(
    () => () => {
      for (const url of urls.current) URL.revokeObjectURL(url);
    },
    [],
  );

  const venue = venueId ? venues.get(venueId) : undefined;
  const place = placeOfVenue(venueId);

  const addPhotos = (files: File[]) => {
    const added = files.map((file) => {
      const url = URL.createObjectURL(file);
      urls.current.push(url);
      const job = processImage(file).catch(() => null);
      // The first photo's EXIF date is a good guess for a new visit.
      if (!visit) void job.then((img) => img?.takenAt && setDate(img.takenAt.slice(0, 10)));
      return { key: crypto.randomUUID(), url, job };
    });
    setPhotos((p) => [...p, ...added]);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!venueId || !date) return;
    setSaving(true);
    try {
      const newIds: string[] = [];
      for (const photo of photos) {
        const processed = await photo.job;
        if (processed) newIds.push((await saveProcessedImage(store, processed)).id);
      }
      const draft = {
        venueId,
        date,
        endDate: endDate && endDate > date ? endDate : undefined,
        rating,
        notes,
        companions: companions
          .split(',')
          .map((c) => c.trim())
          .filter(Boolean),
        mediaIds: [...mediaIds, ...newIds],
      };
      if (visit) {
        await store.visits.update(visit.id, draft);
        for (const removed of visit.mediaIds.filter((id) => !mediaIds.includes(id)))
          await store.media.delete(removed);
      } else {
        await store.visits.create(draft);
      }
      toast.success(t('visit.saved'));
      onClose();
    } catch (error) {
      toast.error(t('common.saveFailed'), { description: (error as Error).message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <DialogContent
      size="lg"
      eyebrow={t('visit.eyebrow')}
      title={visit ? t('visit.edit') : t('visit.new')}
      description={t('visit.description')}
      footer={
        <>
          {visit && (
            <Confirm
              title={t('visit.deleteTitle')}
              description={t('visit.deleteText')}
              confirmLabel={t('common.delete')}
              onConfirm={async () => {
                await removeVisit(store, visit.id);
                onClose();
              }}
              trigger={(open) => (
                <Button variant="ghost" className="mr-auto text-danger" onClick={open}>
                  {t('common.delete')}
                </Button>
              )}
            />
          )}
          <Button variant="ghost" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" form="visit-form" disabled={saving || !venueId || !date}>
            {saving && <Spinner className="size-4 border-paper/40 border-t-paper" />}
            {t('common.save')}
          </Button>
        </>
      }
    >
      <form id="visit-form" onSubmit={submit} className="space-y-6">
        <Field label={t('visit.venue')}>
          {(id) =>
            venue ? (
              <div className="flex h-11 items-center justify-between rounded-frame border border-line-strong px-3 text-sm">
                <span className="flex items-center gap-2">
                  <MapPinIcon className="size-4 text-accent" /> {venue.name}
                  {place && (
                    <span className="text-ink-3">
                      <Flag code={place.countryCode} /> {place.name}
                    </span>
                  )}
                </span>
                <Button variant="link" size="sm" onClick={() => setVenueId(undefined)}>
                  {t('common.change')}
                </Button>
              </div>
            ) : (
              <VenuePicker id={id} autoFocus onSelect={(v) => setVenueId(v.id)} />
            )
          }
        </Field>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label={t('visit.date')}>
            {(id) => (
              <Input
                id={id}
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            )}
          </Field>
          <Field label={t('visit.endDate')} hint={t('visit.endDateHint')}>
            {(id) => (
              <Input
                id={id}
                type="date"
                min={date}
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            )}
          </Field>
          <Field label={t('visit.rating')}>
            {() => (
              <Rating
                value={rating}
                onChange={setRating}
                label={t('visit.rating')}
                className="h-10 items-center"
              />
            )}
          </Field>
        </div>
        <Field label={t('visit.companions')} hint={t('visit.companionsHint')}>
          {(id) => (
            <Input id={id} value={companions} onChange={(e) => setCompanions(e.target.value)} />
          )}
        </Field>
        <Field label={t('visit.notes')}>
          {(id) => (
            <Textarea
              id={id}
              value={notes}
              placeholder={t('visit.notesPlaceholder')}
              onChange={(e) => setNotes(e.target.value)}
              className="min-h-32 font-display text-base"
            />
          )}
        </Field>
        <div className="space-y-3">
          {(mediaIds.length > 0 || photos.length > 0) && (
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
              {mediaIds.map((id) => (
                <div key={id} className="group relative">
                  <MediaImage mediaId={id} alt="" className="aspect-square" />
                  <RemoveButton onClick={() => setMediaIds((ids) => ids.filter((m) => m !== id))} />
                </div>
              ))}
              {photos.map((p) => (
                <div key={p.key} className="group relative">
                  <img src={p.url} alt="" className="aspect-square w-full object-cover" />
                  <RemoveButton
                    onClick={() => setPhotos((list) => list.filter((x) => x.key !== p.key))}
                  />
                </div>
              ))}
            </div>
          )}
          <ImageDropzone
            onFiles={addPhotos}
            label={t('visit.photos')}
            hint={t('visit.photosHint')}
            className="py-6"
          />
        </div>
      </form>
    </DialogContent>
  );
}

function RemoveButton({ onClick }: { onClick: () => void }) {
  const { t } = useTranslation();
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={t('common.remove')}
      className="absolute top-1.5 right-1.5 grid size-6 cursor-pointer place-items-center rounded-full bg-surface/90 opacity-0 shadow-soft transition-opacity group-hover:opacity-100 focus:opacity-100"
    >
      <XIcon className="size-3" />
    </button>
  );
}
