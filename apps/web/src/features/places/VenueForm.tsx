import { type Venue, type VenueKind, venueKinds } from '@mnemo/core';
import { Button, Dialog, DialogContent, Field, Input, Select, Textarea } from '@mnemo/ui';
import { useNavigate } from '@tanstack/react-router';
import { type FormEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useVenues } from '../../app/data';
import type { DialogProps } from '../../app/dialogs';
import { useStore } from '../../app/store';
import { VenuePicker } from '../../components/PlaceSearch';

export function VenueFormDialog({ spec, onClose }: DialogProps<'venue'>) {
  const venues = useVenues();
  if (spec.venueId && !venues) return null;
  const venue = venues?.find((v) => v.id === spec.venueId);
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      {venue ? <EditVenue venue={venue} onClose={onClose} /> : <CreateVenue onClose={onClose} />}
    </Dialog>
  );
}

/** New venues are found via OpenStreetMap search (or entered manually inside the picker). */
function CreateVenue({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  return (
    <DialogContent
      size="md"
      eyebrow={t('venue.eyebrow')}
      title={t('venue.new')}
      description={t('venue.newDescription')}
    >
      <VenuePicker
        autoFocus
        onSelect={(venue) => {
          onClose();
          toast.success(t('venue.saved', { name: venue.name }));
          void navigate({ to: '/venue/$venueId', params: { venueId: venue.id } });
        }}
      />
    </DialogContent>
  );
}

function EditVenue({ venue, onClose }: { venue: Venue; onClose: () => void }) {
  const { t } = useTranslation();
  const store = useStore();
  const [name, setName] = useState(venue.name);
  const [kind, setKind] = useState<VenueKind>(venue.kind);
  const [address, setAddress] = useState(venue.address ?? '');
  const [website, setWebsite] = useState(venue.website ?? '');
  const [notes, setNotes] = useState(venue.notes);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    await store.venues.update(venue.id, {
      name: name.trim(),
      kind,
      address: address.trim() || undefined,
      website: website.trim() || undefined,
      notes,
    });
    toast.success(t('venue.saved', { name: name.trim() }));
    onClose();
  };

  return (
    <DialogContent
      size="md"
      eyebrow={t('venue.eyebrow')}
      title={venue.name}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" form="venue-form" disabled={!name.trim()}>
            {t('common.save')}
          </Button>
        </>
      }
    >
      <form id="venue-form" onSubmit={submit} className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-[1fr_11rem]">
          <Field label={t('venue.name')}>
            {(id) => <Input id={id} value={name} onChange={(e) => setName(e.target.value)} />}
          </Field>
          <Field label={t('venue.kind')}>
            {(id) => (
              <Select id={id} value={kind} onChange={(e) => setKind(e.target.value as VenueKind)}>
                {venueKinds.map((k) => (
                  <option key={k} value={k}>
                    {t(`venue.kinds.${k}`)}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </div>
        <Field label={t('venue.address')}>
          {(id) => <Input id={id} value={address} onChange={(e) => setAddress(e.target.value)} />}
        </Field>
        <Field label={t('venue.website')}>
          {(id) => (
            <Input
              id={id}
              type="url"
              value={website}
              placeholder="https://"
              onChange={(e) => setWebsite(e.target.value)}
            />
          )}
        </Field>
        <Field label={t('venue.notes')}>
          {(id) => <Textarea id={id} value={notes} onChange={(e) => setNotes(e.target.value)} />}
        </Field>
      </form>
    </DialogContent>
  );
}
