import type { Archive } from '@mnemo/core';

export type GalleryFilter = 'all' | 'favorites' | 'seen' | 'wishlist';

export interface GalleryItem {
  id: string;
  title: string;
  artist?: string;
  year?: string;
  medium?: string;
  notes?: string;
  image?: string;
  venue?: string;
  place?: string;
  favorite: boolean;
}

export interface GalleryModel {
  heading?: string;
  description?: string;
  items: GalleryItem[];
}

/** Light structural check; the widget stays free of runtime schema dependencies. */
export function isArchive(value: unknown): value is Archive {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as { format?: unknown }).format === 'mnemo-archive' &&
    Array.isArray((value as { artworks?: unknown }).artworks)
  );
}

export interface SelectOptions {
  /** Collection id or (case-insensitive) name. */
  collection?: string | null;
  filter?: GalleryFilter;
  limit?: number;
}

/** Turns an export into the flat, display-ready list the widget renders. */
export function selectItems(archive: Archive, options: SelectOptions = {}): GalleryModel {
  const venues = new Map(archive.venues.map((v) => [v.id, v]));
  const places = new Map(archive.places.map((p) => [p.id, p]));
  const media = new Map(archive.media.map((m) => [m.id, m]));

  const wanted = options.collection?.trim().toLowerCase();
  const collection = wanted
    ? archive.collections.find(
        (c) => c.id === options.collection || c.name.toLowerCase() === wanted,
      )
    : undefined;

  let artworks = collection
    ? collection.artworkIds.flatMap((id) => archive.artworks.find((a) => a.id === id) ?? [])
    : [...archive.artworks].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const filter = options.filter ?? 'all';
  if (filter === 'favorites') artworks = artworks.filter((a) => a.favorite);
  if (filter === 'seen' || filter === 'wishlist')
    artworks = artworks.filter((a) => a.status === filter);
  if (options.limit && options.limit > 0) artworks = artworks.slice(0, options.limit);

  return {
    heading: collection?.name,
    description: collection?.description || undefined,
    items: artworks.map((a) => {
      const venue = a.venueId ? venues.get(a.venueId) : undefined;
      const m = a.mediaIds[0] ? media.get(a.mediaIds[0]) : undefined;
      return {
        id: a.id,
        title: a.title,
        artist: a.artist,
        year: a.year,
        medium: a.medium,
        notes: a.notes || undefined,
        image: m?.src ?? m?.remoteUrl,
        venue: venue?.name,
        place: venue ? places.get(venue.placeId)?.name : undefined,
        favorite: a.favorite,
      };
    }),
  };
}
