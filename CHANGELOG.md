# Changelog

All notable changes to Mnemo. The format follows [Keep a Changelog](https://keepachangelog.com/)
and the app uses [Semantic Versioning](https://semver.org/). User-facing release notes live in
`apps/web/src/changelog.ts` and appear in the app under “What's new”.

## [0.4.0] – 2026-10-23

The library, and the first collectible kind beside artworks.

### Added
- **Books** (`books` table, schema 4): authors as printed plus `creatorIds`, ISBN-13, edition
  data, reading status and ownership as separate axes, `readings` (start, finish, abandon),
  `quotes` and the current `loan`, all inside the book document. Services in
  `core/services/library.ts`: `saveBook`, `setReadingStatus`, `saveQuote`, `lendBook`,
  `returnBook`, `removeBook`, `findBookByIsbn`, `filterBooks`.
- ISBN helpers `normalizeIsbn` (ISBN-10 → ISBN-13, check digits) and `isbnFromBarcode`.
- **Book catalogues** in `providers/src/books/`: Open Library and the Deutsche
  Nationalbibliothek (SRU, Dublin Core) without key, Google Books with key. `lookupIsbn` merges
  all usable catalogues field by field; `fetchText` for non-JSON APIs.
- **Library module** (`/library`, `/book/$bookId`): shelf, reading band, filters as URL
  params, detail page, add dialog with catalogue search, ISBN scanner (native
  `BarcodeDetector` or the ZXing ponyfill with bundled, precached WebAssembly).
- **Views across kinds:** modules register `collectibles` views; `useCollectibles()` loads all
  kinds. New list page `/list/$collectionId` with drag-and-drop order.
- Demo data includes books and a list that mixes works and books.

### Changed
- `creatorIds` moved into `collectibleShape`; `removeCreator`, `mergeDuplicateCreators` and
  `topCreators` work across all collectible kinds. `resolveCreatorIds` keeps links for names
  that stay.
- The list dialog moved from the art to the home module; people pages render one section per
  kind; insights and the salon include the library.
- The mobile bar shows the library instead of Discover; page numbering shifted by one.

## [0.3.0] – 2026-10-22

People behind the works, ready to be shared with a future library.

### Added
- **Creators** (`creators` table): name, life dates, description, portrait and Wikidata/Wikipedia
  links. Artworks keep `artist` as the attribution text and link people through `creatorIds`.
- `saveArtwork()` keeps creator links in step with the attribution; `ensureCreator()`,
  `removeCreator()` and `mergeDuplicateCreators()` (run after merge imports).
- **People provider** `wikidataPeopleProvider` (search and lookup via the Wikidata API), tested
  against trimmed real responses.
- Creator page `/creator/$creatorId` and an edit dialog with Wikidata search, as the new
  `people` module.
- **Data set migrations:** `Migration.dataset` transforms run across tables after the row
  transforms, both in IndexedDB upgrades and on archive import.

### Changed
- **Schema 3:** artworks gain `creatorIds`; existing attributions become creators with stable
  ids (`creator-<name>`), so repeated imports reuse them. IndexedDB indexes `*creatorIds`.
- Insights rank creators (`topCreators`) instead of attribution strings.
- Imported archives report the current version after migration.

### Fixed
- Insights and settings overflowed horizontally on phones (grid columns sized to their content).

## [0.2.0] – 2026-10-22

Foundation for more collection types (books next), cloud sync and further data sources.

### Added
- **Entity registry** (`packages/core/src/model/registry.ts`): the single source of truth for all
  persisted types. `MnemoStore`, `StoreSnapshot`, the archive schema, backups and the Dexie store
  are derived from it.
- **Migrations** (`packages/core/src/migrations.ts`): pure per-row steps per schema version. They
  run on IndexedDB upgrades and on archive import; Dexie versions follow `SCHEMA_VERSION`.
- **Collectibles**: shared `collectibleShape` and `sourceSchema`, typed `ItemRef { kind, id }`
  and kind-agnostic list helpers (`toggleInCollection`, `setCollectionsOf`,
  `unlinkFromCollections`, `collectionHas`, `itemIdsOf`).
- **App modules** (`apps/web/src/modules/*`): each area contributes navigation, quick add and
  dialogs through a manifest and its pages through `routes.tsx`. Dialog types are registered by
  module augmentation of `DialogRegistry`.
- `MnemoStore.clear()`.
- “What's new” dialog after updates and an “About Mnemo” section with the release history.
- Error page for failed routes with reload, home and backup actions.
- GitHub Actions CI: lint, typecheck, unit tests, build and Playwright.

### Changed
- **Schema 2:** collections store `items: ItemRef[]` (and `coverItem`) instead of `artworkIds`
  (and `coverArtworkId`). Existing databases and older backups are migrated automatically; the
  embed widget still reads exports from 0.1.
- Archives carry the schema version they were written with and are migrated on import; archives
  from a newer version are refused with `NewerSchemaError`.
- `subsetArchive()` takes item references instead of a set of artwork ids.
- Provider API keys are generic (`ProviderKeys = Record<string, string>`); providers declare
  `requiresKey: { id, signupUrl }` and the settings render one field per provider.

### Fixed
- Backups keep the real image format instead of always using `.jpg`.
- Throttled provider requests no longer leak abort listeners.

## [0.1.0] – 2026-10-21

First version: Salon, Collection, Atlas, Journal, Planner, Discover, Insights, settings,
local storage with backup and import, and the `<mnemo-gallery>` widget.
