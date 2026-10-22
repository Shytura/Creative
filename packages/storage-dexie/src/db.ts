import type { Artwork, Collection, Media, Place, Settings, Trip, Venue, Visit } from '@mnemo/core';
import { Dexie, type Table } from 'dexie';

export interface MediaBlobRow {
  id: string;
  full?: Blob;
  thumb?: Blob;
}

export type SettingsRow = Settings & { id: 'settings' };

/**
 * IndexedDB schema. Only indexed fields are listed; everything else is stored as-is.
 * Add new versions below instead of editing existing ones; Dexie migrates on open.
 */
export class MnemoDatabase extends Dexie {
  places!: Table<Place, string>;
  venues!: Table<Venue, string>;
  visits!: Table<Visit, string>;
  artworks!: Table<Artwork, string>;
  collections!: Table<Collection, string>;
  trips!: Table<Trip, string>;
  media!: Table<Media, string>;
  mediaBlobs!: Table<MediaBlobRow, string>;
  settings!: Table<SettingsRow, string>;

  constructor(name: string) {
    super(name);
    this.version(1).stores({
      places: 'id, name, countryCode',
      venues: 'id, placeId, name',
      visits: 'id, venueId, date',
      artworks: 'id, venueId, visitId, status, createdAt',
      collections: 'id',
      trips: 'id, status',
      media: 'id',
      mediaBlobs: 'id',
      settings: 'id',
    });
  }
}
