import { type Trip, type TripStatus, tripStatuses } from '@mnemo/core';
import {
  Button,
  Chip,
  Dialog,
  DialogContent,
  Field,
  Input,
  Label,
  Segmented,
  Textarea,
} from '@mnemo/ui';
import { useNavigate } from '@tanstack/react-router';
import { XIcon } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useLookups, useTrips } from '../../app/data';
import type { DialogProps } from '../../app/dialogs';
import { useStore } from '../../app/store';
import { Confirm, Flag } from '../../components/bits';
import { CitySearch } from '../../components/PlaceSearch';

export function TripFormDialog({ spec, onClose }: DialogProps<'trip'>) {
  const trips = useTrips();
  if (spec.tripId && !trips) return null;
  const trip = trips?.find((t) => t.id === spec.tripId);
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <TripForm trip={trip} onClose={onClose} />
    </Dialog>
  );
}

function TripForm({ trip, onClose }: { trip: Trip | undefined; onClose: () => void }) {
  const { t } = useTranslation();
  const store = useStore();
  const navigate = useNavigate();
  const { places } = useLookups();
  const [title, setTitle] = useState(trip?.title ?? '');
  const [status, setStatus] = useState<TripStatus>(trip?.status ?? 'idea');
  const [placeIds, setPlaceIds] = useState<string[]>(trip?.placeIds ?? []);
  const [startDate, setStartDate] = useState(trip?.startDate ?? '');
  const [endDate, setEndDate] = useState(trip?.endDate ?? '');
  const [notes, setNotes] = useState(trip?.notes ?? '');

  const effectiveTitle =
    title.trim() ||
    (placeIds[0] ? t('planner.tripTo', { place: places.get(placeIds[0])?.name }) : '');

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!effectiveTitle) return;
    const draft = {
      title: effectiveTitle,
      status,
      placeIds,
      startDate: startDate || undefined,
      endDate: endDate && (!startDate || endDate >= startDate) ? endDate : undefined,
      notes,
    };
    if (trip) {
      await store.trips.update(trip.id, draft);
      toast.success(t('planner.saved'));
      onClose();
    } else {
      const created = await store.trips.create(draft);
      onClose();
      void navigate({ to: '/trip/$tripId', params: { tripId: created.id } });
    }
  };

  return (
    <DialogContent
      size="md"
      eyebrow={t('planner.eyebrow')}
      title={trip ? trip.title : t('planner.new')}
      description={trip ? undefined : t('planner.newDescription')}
      footer={
        <>
          {trip && (
            <Confirm
              title={t('planner.deleteTitle')}
              description={t('planner.deleteText', { title: trip.title })}
              confirmLabel={t('common.delete')}
              onConfirm={async () => {
                await store.trips.delete(trip.id);
                onClose();
                void navigate({ to: '/planner' });
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
          <Button type="submit" form="trip-form" disabled={!effectiveTitle}>
            {trip ? t('common.save') : t('planner.create')}
          </Button>
        </>
      }
    >
      <form id="trip-form" onSubmit={submit} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="trip-destination">{t('planner.destinations')}</Label>
          {placeIds.length > 0 && (
            <div className="flex flex-wrap gap-2 pb-1">
              {placeIds.map((id) => (
                <Chip key={id} active onClick={() => setPlaceIds(placeIds.filter((p) => p !== id))}>
                  <Flag code={places.get(id)?.countryCode} /> {places.get(id)?.name}{' '}
                  <XIcon className="size-3" />
                </Chip>
              ))}
            </div>
          )}
          <CitySearch
            id="trip-destination"
            autoFocus={!trip}
            placeholder={t('planner.addDestination')}
            onSelect={(place) =>
              setPlaceIds((ids) => (ids.includes(place.id) ? ids : [...ids, place.id]))
            }
          />
        </div>
        <Field label={t('planner.title')}>
          {(id) => (
            <Input
              id={id}
              value={title}
              placeholder={effectiveTitle || t('planner.titlePlaceholder')}
              onChange={(e) => setTitle(e.target.value)}
              className="font-display text-lg italic"
            />
          )}
        </Field>
        <div className="space-y-2">
          <Label>{t('planner.statusLabel')}</Label>
          <Segmented
            value={status}
            onChange={setStatus}
            options={tripStatuses.map((s) => ({ value: s, label: t(`planner.status.${s}`) }))}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t('planner.start')}>
            {(id) => (
              <Input
                id={id}
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            )}
          </Field>
          <Field label={t('planner.end')}>
            {(id) => (
              <Input
                id={id}
                type="date"
                min={startDate}
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            )}
          </Field>
        </div>
        <Field label={t('planner.notes')}>
          {(id) => <Textarea id={id} value={notes} onChange={(e) => setNotes(e.target.value)} />}
        </Field>
      </form>
    </DialogContent>
  );
}
