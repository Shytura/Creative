import { aicProvider } from './art/aic';
import { clevelandProvider } from './art/cleveland';
import { europeanaProvider, harvardProvider } from './art/keyed';
import { metProvider } from './art/met';
import { wikidataProvider } from './art/wikidata';
import type { ArtworkSearchProvider, ProviderKeys } from './types';

export { aicProvider, mapAic } from './art/aic';
export { clevelandProvider, mapCleveland } from './art/cleveland';
export { commonsFileName, resolveCommonsImage } from './art/commons';
export { europeanaProvider, harvardProvider, mapEuropeana, mapHarvard } from './art/keyed';
export { mapMetObject, metProvider } from './art/met';
export { buildWikidataQuery, mapWikidata, wikidataProvider } from './art/wikidata';
export { fetchJson, ProviderError } from './http';
export { venueKindFromOsm, venueKindFromTags } from './places/osm';
export {
  buildOverpassQuery,
  mapOverpass,
  OVERPASS_ENDPOINTS,
  overpassProvider,
} from './places/overpass';
export { mapPhotonFeature, photonProvider } from './places/photon';
export { mapSummary, wikipediaSummary, wikipediaSummaryFromTag } from './places/wikipedia';
export * from './types';

/**
 * All art collection providers, in display order. To add a source, implement
 * `ArtworkSearchProvider` in `src/art/` and append it here.
 */
export const artProviders: readonly ArtworkSearchProvider[] = [
  wikidataProvider,
  aicProvider,
  metProvider,
  clevelandProvider,
  europeanaProvider,
  harvardProvider,
];

export function availableArtProviders(keys: ProviderKeys = {}): ArtworkSearchProvider[] {
  return artProviders.filter((p) => !p.requiresKey || Boolean(keys[p.requiresKey]));
}
