import type { VenueKind } from '@mnemo/core';

/** Maps OpenStreetMap tags to Mnemo venue kinds. */
export function venueKindFromOsm(key: string | undefined, value: string | undefined): VenueKind {
  if (key === 'tourism' && value === 'museum') return 'museum';
  if (
    (key === 'tourism' && value === 'gallery') ||
    (key === 'amenity' && value === 'arts_centre')
  ) {
    return 'gallery';
  }
  if (key === 'amenity' && value === 'place_of_worship') return 'church';
  if (key === 'historic' && (value === 'castle' || value === 'palace' || value === 'fort')) {
    return 'castle';
  }
  if (key === 'leisure' && (value === 'park' || value === 'garden')) return 'park';
  if (key === 'tourism' || key === 'historic') return 'sight';
  return 'other';
}

const KIND_PRIORITY: VenueKind[] = ['museum', 'gallery', 'church', 'castle', 'park', 'sight'];

/** Most specific kind across all relevant tags, e.g. a historic castle that is a museum. */
export function venueKindFromTags(tags: Record<string, string>): VenueKind {
  const kinds = ['tourism', 'amenity', 'historic', 'leisure'].map((key) =>
    tags[key] ? venueKindFromOsm(key, tags[key]) : 'other',
  );
  return KIND_PRIORITY.find((k) => kinds.includes(k)) ?? 'other';
}

const OSM_TYPES: Record<string, string> = { N: 'node', W: 'way', R: 'relation' };

export const osmRef = (type: string, id: number | string) => `${OSM_TYPES[type] ?? type}/${id}`;
