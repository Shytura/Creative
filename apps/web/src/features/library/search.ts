import type { BookStatus } from '@mnemo/core';
import {
  type BookOwnership,
  type BookSort,
  bookOwnerships,
  bookSorts,
  bookStatuses,
} from '@mnemo/core';

/** URL search params of the library; every filter is shareable as a link. */
export interface LibrarySearch {
  q?: string;
  status?: BookStatus;
  own?: BookOwnership;
  lent?: boolean;
  fav?: boolean;
  author?: string;
  tag?: string;
  collection?: string;
  sort?: BookSort;
  view?: 'shelf' | 'list';
}

const str = (v: unknown) => (typeof v === 'string' && v.length > 0 ? v : undefined);
const flag = (v: unknown) => (v === true || v === 'true' ? true : undefined);
const oneOf = <T extends string>(v: unknown, values: readonly T[]) =>
  values.includes(v as T) ? (v as T) : undefined;

export function validateLibrarySearch(search: Record<string, unknown>): LibrarySearch {
  const result: LibrarySearch = {
    q: str(search.q),
    status: oneOf(search.status, bookStatuses),
    own: oneOf(search.own, bookOwnerships),
    lent: flag(search.lent),
    fav: flag(search.fav),
    author: str(search.author),
    tag: str(search.tag),
    collection: str(search.collection),
    sort: oneOf(search.sort, bookSorts),
    view: oneOf(search.view, ['shelf', 'list'] as const),
  };
  return Object.fromEntries(Object.entries(result).filter(([, v]) => v !== undefined));
}
