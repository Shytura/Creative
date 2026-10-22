# Mnemo

**A personal archive of your encounters with art.** Mnemo remembers which works moved you,
where you came across them and where your next trip should take you. The name comes from
Mnemosyne, the goddess of memory and mother of the Muses, after whom the museum is named.

![Salon – artwork of the day](docs/screenshots/salon.webp)

| Salon hang | Atlas |
| --- | --- |
| ![Salon hang](docs/screenshots/salon-wall.webp) | ![Atlas](docs/screenshots/atlas.webp) |
| **Trip planner** | **Dark mode with the “Nocturne” background** |
| ![Trip planner](docs/screenshots/trip.webp) | ![Dark mode](docs/screenshots/salon-dark.webp) |

## Features

| Area | What it does |
| --- | --- |
| **Salon** | Artwork of the day from your own collection, key figures, recently added, next trip, a greeting that depends on the time of day |
| **Collection** | Masonry gallery, **salon hang** (framed works on a coloured wall) and list view. Filter by status, favourites, period, artist, city, tag and **colour**. Custom lists, images via drag & drop |
| **Artwork** | Large view with **deep zoom** (OpenSeadragon, IIIF), automatically extracted **colour palette**, the page accent colour adapts to the work, source and licence, related works |
| **Photos** | Images are downscaled and stored locally. **EXIF** provides date and GPS; if a museum is nearby, the app suggests it (“Were you at the Albertina?”) |
| **Atlas** | Custom paper-toned map style (MapLibre and OpenFreeMap, no API key), visited and planned places, clusters, year filter, country list with flags |
| **Journal** | Travel journal of all museum visits by year, with photos, impressions and companions |
| **Planner** | Board with Idea, Planned and Done (drag & drop). Per trip: suggestions from **OpenStreetMap** with Wikipedia texts and images, a sortable watchlist, a map. Checked-off places can become a visit in the journal |
| **Discover** | Combined search across Wikidata/Commons, Art Institute of Chicago, The Met and Cleveland Museum of Art (optionally Europeana and Harvard with a key). Add results as “seen” or “want to see” |
| **Insights** | Countries, cities, visits, colour spectrum of all works seen, visits per year, periods, most-seen artists |
| **Personalisation** | Light, dark or system; accent colours based on painting pigments or taken automatically from the artwork of the day; backgrounds: paper, five gradients, one of your works, your own image or the artwork of the day (blurred) |
| **Data** | Everything stays local in the browser (IndexedDB), works offline (PWA), ZIP backup, JSON export for sharing, import |
| **Languages** | German and English, with type-checked translation keys |

## Quick start

Requirements: Node.js ≥ 24 and pnpm.

```bash
pnpm install
pnpm dev          # app at http://localhost:5173
pnpm dev:embed    # widget demo at http://localhost:5174
```

On first launch the Salon offers **“Start with examples”**. This creates nine public-domain
works, five museums and two trip ideas. You can delete them again at any time under
Settings → Data.

| Command | Purpose |
| --- | --- |
| `pnpm build` | Build the widget and the app (`apps/web/dist`, incl. service worker and icons) |
| `pnpm preview` | Serve the production build locally |
| `pnpm check` | Lint + typecheck + unit tests |
| `pnpm test` | Vitest (core, storage, providers, embed, web) |
| `pnpm e2e` | Playwright tests on desktop and mobile, without network access (run `pnpm exec playwright install chromium` once) |
| `pnpm format` | Biome formatting |

## Architecture

```
apps/
  web/            PWA: React 19, TanStack Router + Query, Tailwind v4
  embed-demo/     third-party sample page that embeds the widget
packages/
  core/           data model (zod), repository contracts, domain logic – no React, no DB
  storage-dexie/  IndexedDB implementation of the store
  providers/      adapters for museum APIs, geocoding, POIs, Wikipedia
  ui/             design system: tokens, Tailwind theme, components
  i18n/           de/en dictionaries + i18next setup
  embed/          <mnemo-gallery> web component (12 kB, no framework)
```

Dependencies only point inwards: `web → ui, providers, storage-dexie, i18n → core`.
`core` knows neither React nor IndexedDB.

**Data flow:** Features read through hooks in `apps/web/src/app/data.ts`, i.e. through
TanStack Query with keys `['local', table, …]`. Writes go straight to the store
(`useStore()`). The store reports every change, including those from other tabs, and
`MnemoProvider` then invalidates the affected queries. That is why there is no manual refresh
and no global state container.

**Domain rules** live in `packages/core/src/services`, for example “deleting a place also
deletes its visits and unlinks its works” or “a completed trip item becomes a visit”. This
way they apply equally to every storage backend.

## Extending and integrating

### 1. Plug in a different backend

Implement the `MnemoStore` interface from `@mnemo/core` (e.g. via REST or Supabase) and pass
it to the app:

```tsx
import { AppProviders } from './app/providers';

<AppProviders store={createRestStore('https://api.example.com')}>
  <RouterProvider router={router} />
</AppProviders>
```

The only requirement is that `subscribe()` reports changes, for example via WebSocket or
after your own writes. All features stay unchanged. `snapshot()` and `restore()` are the
foundation for a future sync.

### 2. Reuse parts in another React app

- `@mnemo/ui`: components and tokens. Add `@import '@mnemo/ui/theme.css'` and
  `@source '<path>/packages/ui/src'` to your own CSS. Colours, fonts and radii are
  `--mn-*` variables and can be overridden on any parent element.
- `@mnemo/providers`: museum and place search without React, usable on the server too.
- `@mnemo/core`: data model, validation, statistics and filters.
- Feature pages from `apps/web/src/features/*` run in any app that uses `AppProviders`.

### 3. Embed the widget on any website

1. In Mnemo, export a list as JSON under Settings → Data → *For sharing & embedding*.
2. `pnpm --filter @mnemo/embed build` produces `packages/embed/dist/mnemo-embed.js`.
3. Put both on your website and include them:

```html
<script type="module" src="mnemo-embed.js"></script>
<mnemo-gallery src="mnemo-favourites.json" collection="Favourites" theme="auto" columns="3"></mnemo-gallery>
```

| Attribute | Meaning |
| --- | --- |
| `src` | URL of the JSON export (alternatively via JS: `el.data = archive`) |
| `collection` | Name or ID of a list |
| `filter` | `all`, `favorites`, `seen`, `wishlist` |
| `limit`, `columns`, `heading` | Number of items, columns, custom heading |
| `theme` | `light`, `dark`, `auto` |
| `lang` | `de` or `en` |

The widget dispatches `mnemo-select` with the selected work as `detail`. It can be styled
from the outside via `--mnemo-accent`, `--mnemo-bg`, `--mnemo-font-display` etc., as well as
via `::part(item)`, `::part(caption)` and `::part(header)`.

![Widget on a third-party page](docs/screenshots/embed.webp)

### 4. Add a new art data source

Implement `ArtworkSearchProvider` in `packages/providers/src/art/` and register it in
`artProviders` (`packages/providers/src/index.ts`). “Discover” then shows it automatically.
Please test mapper functions against a real, trimmed API response in `test/fixtures/`.

## External services: notes from practice

All services are free and require no account. The code handles a few quirks:

- **The Met:** The old search API `v1/search` was shut down on October 1, 2026. Mnemo uses
  `v1.1/search`.
- **Wikimedia (Wikidata, Commons, Wikipedia):** Requests carry an `Api-User-Agent`.
  `Special:FilePath` links send no CORS headers, so Mnemo resolves them through the Commons
  API before downloading, allowing images to be stored and analysed locally. Under heavy load
  the Wikidata Query Service throttles temporarily (HTTP 429). Title and artist searches
  therefore run separately and may fail individually.
- **Overpass (trip suggestions):** The public servers are often busy; responses can take
  30–60 s. Mnemo queries two instances in parallel, takes the first response and caches
  results for a day.
- **Cleveland Museum of Art:** The CDN sometimes serves cached responses without CORS
  headers. An extra parameter keeps browser requests in their own cache entries.
- **Art Institute of Chicago:** The image servers sit behind Cloudflare and block automated
  browsers. In regular browsers they usually work. If not, Mnemo shows a typographic
  placeholder and stores only the link.
- **Europeana / Harvard:** Get a free key and enter it in the settings.

## Privacy

All entries and images stay in your browser's IndexedDB. Mnemo asks the browser for
persistent storage (`navigator.storage.persist()`). External services only receive what you
search for: search terms, place coordinates for suggestions and image requests. Since there
is no server, there is no sync either, so back up your data regularly as a ZIP.

## Ideas for later

The code already has extension points prepared for these:

- **Sync:** a `storage-rest` package against a small backend; `snapshot`/`restore` and
  `schemaVersion` are already in place.
- **Exhibition mode:** full-screen slideshow with a Ken Burns effect over a list.
- **Art passport:** a stamp per museum visited, a collector's album in Insights.
- **Sharing:** a postcard of a work as PNG with palette and note.
- **Comparison:** two works side by side with synchronised deep zoom.
- **Museum labels via OCR** (e.g. Tesseract.js) to fill in details automatically.
