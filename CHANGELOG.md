# Changelog

All notable changes to Mnemo. The format follows [Keep a Changelog](https://keepachangelog.com/)
and the app uses [Semantic Versioning](https://semver.org/). User-facing release notes live in
`apps/web/src/changelog.ts` and appear in the app under “What's new”.

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
