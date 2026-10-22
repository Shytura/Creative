import type { Place } from '@mnemo/core';
import { Button, Dialog, DialogContent, Field, Input, Textarea } from '@mnemo/ui';
import { useNavigate } from '@tanstack/react-router';
import { type FormEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { usePlaces } from '../../app/data';
import type { DialogProps } from '../../app/dialogs';
import { useStore } from '../../app/store';
import { CitySearch } from '../../components/PlaceSearch';

export function PlaceFormDialog({ spec, onClose }: DialogProps<'place'>) {
  const places = usePlaces();
  if (spec.placeId && !places) return null;
  const place = places?.find((p) => p.id === spec.placeId);
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      {place ? <EditPlace place={place} onClose={onClose} /> : <CreatePlace onClose={onClose} />}
    </Dialog>
  );
}

function CreatePlace({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  return (
    <DialogContent size="md" eyebrow={t('place.eyebrow')} title={t('place.new')}>
      <CitySearch
        autoFocus
        onSelect={(place) => {
          onClose();
          void navigate({ to: '/place/$placeId', params: { placeId: place.id } });
        }}
      />
    </DialogContent>
  );
}

function EditPlace({ place, onClose }: { place: Place; onClose: () => void }) {
  const { t } = useTranslation();
  const store = useStore();
  const [name, setName] = useState(place.name);
  const [country, setCountry] = useState(place.country);
  const [notes, setNotes] = useState(place.notes);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    await store.places.update(place.id, { name: name.trim(), country: country.trim(), notes });
    toast.success(t('place.saved'));
    onClose();
  };

  return (
    <DialogContent
      size="sm"
      eyebrow={t('place.eyebrow')}
      title={place.name}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" form="place-form" disabled={!name.trim()}>
            {t('common.save')}
          </Button>
        </>
      }
    >
      <form id="place-form" onSubmit={submit} className="space-y-5">
        <Field label={t('place.name')}>
          {(id) => <Input id={id} value={name} onChange={(e) => setName(e.target.value)} />}
        </Field>
        <Field label={t('place.country')}>
          {(id) => <Input id={id} value={country} onChange={(e) => setCountry(e.target.value)} />}
        </Field>
        <Field label={t('place.notes')}>
          {(id) => <Textarea id={id} value={notes} onChange={(e) => setNotes(e.target.value)} />}
        </Field>
      </form>
    </DialogContent>
  );
}
