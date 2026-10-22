import { type ArtworkStatus, ensureVisit, saveArtwork, type Venue } from '@mnemo/core';
import type { ArtworkSearchResult } from '@mnemo/providers';
import { Button, Dialog, DialogContent, Field, Input, Segmented, Spinner, Switch } from '@mnemo/ui';
import { useNavigate } from '@tanstack/react-router';
import { MapPinIcon } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useStore } from '../../app/store';
import { VenuePicker } from '../../components/PlaceSearch';
import { saveRemoteImage } from '../../lib/media';

/** Imports a search result into the collection, including the image for offline use. */
export function AddFromDiscover({
  result,
  initialStatus,
  onClose,
}: {
  result: ArtworkSearchResult;
  initialStatus: ArtworkStatus;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const store = useStore();
  const navigate = useNavigate();
  const [status, setStatus] = useState(initialStatus);
  const [venue, setVenue] = useState<Venue | null>(null);
  const [date, setDate] = useState('');
  const [favorite, setFavorite] = useState(false);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const imageUrl = result.imageUrl ?? result.thumbnailUrl;
      const media = imageUrl ? await saveRemoteImage(store, imageUrl, result.title) : undefined;
      const visitId =
        status === 'seen' && venue && date
          ? (await ensureVisit(store, venue.id, date)).id
          : undefined;
      const artwork = await saveArtwork(store, {
        title: result.title,
        artist: result.artist,
        year: result.year,
        medium: result.medium,
        status,
        favorite,
        venueId: venue?.id,
        visitId,
        mediaIds: media ? [media.id] : [],
        palette: media?.palette ?? [],
        source: {
          provider: result.provider,
          externalId: result.externalId,
          url: result.url,
          license: result.license,
          credit: result.credit,
          iiifInfoUrl: result.iiifInfoUrl,
          museumName: result.museumName,
        },
      });
      onClose();
      toast.success(t('artwork.created', { title: artwork.title }), {
        description: media && !media.hasBlob ? t('discover.remoteOnly') : undefined,
        action: {
          label: t('common.view'),
          onClick: () =>
            void navigate({ to: '/artwork/$artworkId', params: { artworkId: artwork.id } }),
        },
      });
    } catch (error) {
      toast.error(t('common.saveFailed'), { description: (error as Error).message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        size="lg"
        eyebrow={t('discover.addEyebrow')}
        title={result.title}
        description={[result.artist, result.year].filter(Boolean).join(', ')}
        footer={
          <>
            <Button variant="ghost" onClick={onClose}>
              {t('common.cancel')}
            </Button>
            <Button onClick={() => void save()} disabled={saving}>
              {saving && <Spinner className="size-4 border-paper/40 border-t-paper" />}
              {t('discover.addToCollection')}
            </Button>
          </>
        }
      >
        <div className="grid gap-8 sm:grid-cols-[10rem_1fr]">
          <img
            src={result.thumbnailUrl ?? result.imageUrl}
            alt=""
            referrerPolicy="no-referrer"
            className="w-full self-start object-contain shadow-frame"
          />
          <div className="space-y-6">
            <Segmented
              value={status}
              onChange={setStatus}
              options={[
                { value: 'seen', label: t('artwork.status.seen') },
                { value: 'wishlist', label: t('artwork.status.wishlistLong') },
              ]}
            />
            <Field
              label={status === 'seen' ? t('artwork.fields.seenAt') : t('artwork.fields.wantAt')}
              hint={
                result.museumName
                  ? t('discover.venueHint', { museum: result.museumName })
                  : undefined
              }
            >
              {(id) =>
                venue ? (
                  <div className="flex h-11 items-center justify-between rounded-frame border border-line-strong px-3 text-sm">
                    <span className="flex items-center gap-2">
                      <MapPinIcon className="size-4 text-accent" /> {venue.name}
                    </span>
                    <Button variant="link" size="sm" onClick={() => setVenue(null)}>
                      {t('common.change')}
                    </Button>
                  </div>
                ) : (
                  <VenuePicker id={id} initialQuery={result.museumName ?? ''} onSelect={setVenue} />
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
                  />
                )}
              </Field>
            )}
            <label
              htmlFor="discover-favorite"
              className="flex cursor-pointer items-center justify-between gap-4"
            >
              <span className="text-sm font-medium">{t('artwork.favorite')}</span>
              <Switch id="discover-favorite" checked={favorite} onCheckedChange={setFavorite} />
            </label>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
