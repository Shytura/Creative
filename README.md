# Mnemo

**Ein persönliches Archiv deiner Begegnungen mit Kunst.** Mnemo merkt sich, welche Werke dich
berührt haben, wo du ihnen begegnet bist und wohin die nächste Reise gehen soll. Der Name
kommt von Mnemosyne, der Göttin der Erinnerung und Mutter der Musen, nach denen das Museum
benannt ist.

![Salon – das Werk des Tages](docs/screenshots/salon.webp)

| Salon-Hängung | Atlas |
| --- | --- |
| ![Salon-Hängung](docs/screenshots/salon-wall.webp) | ![Atlas](docs/screenshots/atlas.webp) |
| **Reiseplaner** | **Dunkler Modus mit Hintergrund „Nocturne“** |
| ![Reiseplaner](docs/screenshots/trip.webp) | ![Dunkel](docs/screenshots/salon-dark.webp) |

## Was die App kann

| Bereich | Funktionen |
| --- | --- |
| **Salon** | Werk des Tages aus der eigenen Sammlung, Kennzahlen, zuletzt hinzugefügt, nächste Reise, Begrüßung je nach Tageszeit |
| **Sammlung** | Masonry-Galerie, **Salon-Hängung** (gerahmte Werke auf farbiger Wand) und Liste. Filter nach Status, Favoriten, Epoche, Künstler:in, Stadt, Schlagwort und **Farbe**. Eigene Listen, Bilder per Drag & Drop |
| **Werk** | Großansicht mit **Deep Zoom** (OpenSeadragon, IIIF), automatisch erkannte **Farbpalette**, die Akzentfarbe der Seite passt sich dem Werk an, Quelle und Lizenz, verwandte Werke |
| **Fotos** | Bilder werden verkleinert und lokal gespeichert. **EXIF** liefert Datum und GPS; liegt ein Museum in der Nähe, schlägt die App es vor („Warst du in der Albertina?“) |
| **Atlas** | Eigener, papierfarbener Kartenstil (MapLibre und OpenFreeMap, ohne API-Key), besuchte und geplante Orte, Cluster, Jahresfilter, Länderliste mit Flaggen |
| **Chronik** | Reisejournal aller Museumsbesuche nach Jahren, mit Fotos, Eindruck und Begleitung |
| **Planer** | Board mit Idee, Geplant und Erlebt (Drag & Drop). Pro Reise: Vorschläge aus **OpenStreetMap** mit Wikipedia-Texten und -Bildern, Merkliste mit Sortierung, Karte. Abgehakte Orte werden auf Wunsch zum Besuch in der Chronik |
| **Entdecken** | Kombinierte Suche in Wikidata/Commons, Art Institute of Chicago, The Met und Cleveland Museum of Art (optional Europeana und Harvard per Key). Übernahme als „gesehen“ oder „will ich sehen“ |
| **Bilanz** | Länder, Städte, Besuche, Farbspektrum aller gesehenen Werke, Besuche pro Jahr, Epochen, meistgesehene Künstler:innen |
| **Personalisierung** | Hell, dunkel oder System; Akzentfarben nach Malpigmenten oder automatisch aus dem Werk des Tages; Hintergründe: Papier, fünf Farbverläufe, eigenes Werk, eigenes Bild oder Werk des Tages (weichgezeichnet) |
| **Daten** | Alles lokal im Browser (IndexedDB), offline nutzbar (PWA), ZIP-Sicherung, JSON-Export zum Teilen, Import |
| **Sprachen** | Deutsch und Englisch, mit typgeprüften Übersetzungsschlüsseln |

## Schnellstart

Voraussetzungen: Node.js ≥ 24 und pnpm.

```bash
pnpm install
pnpm dev          # App auf http://localhost:5173
pnpm dev:embed    # Widget-Demo auf http://localhost:5174
```

Beim ersten Start bietet der Salon **„Mit Beispielen starten“** an. Dann werden neun
gemeinfreie Werke, fünf Museen und zwei Reiseideen angelegt. Unter Einstellungen → Daten
lässt sich das jederzeit wieder löschen.

| Befehl | Zweck |
| --- | --- |
| `pnpm build` | Widget und App bauen (`apps/web/dist`, inkl. Service Worker und Icons) |
| `pnpm preview` | Produktions-Build lokal ausliefern |
| `pnpm check` | Lint + Typecheck + Unit-Tests |
| `pnpm test` | Vitest (core, storage, providers, embed, web) |
| `pnpm e2e` | Playwright-Tests auf Desktop und Mobil, ohne Netzwerkzugriff (einmalig `pnpm exec playwright install chromium`) |
| `pnpm format` | Biome-Formatierung |

## Architektur

```
apps/
  web/            PWA: React 19, TanStack Router + Query, Tailwind v4
  embed-demo/     fremde Beispielseite, die das Widget einbindet
packages/
  core/           Datenmodell (zod), Repository-Verträge, Domänenlogik – ohne React, ohne DB
  storage-dexie/  IndexedDB-Implementierung des Stores
  providers/      Adapter für Museums-APIs, Geocoding, POIs, Wikipedia
  ui/             Design-System: Tokens, Tailwind-Theme, Komponenten
  i18n/           Wörterbücher de/en + i18next-Setup
  embed/          <mnemo-gallery> Web Component (12 kB, ohne Framework)
```

Die Abhängigkeiten zeigen nur nach innen: `web → ui, providers, storage-dexie, i18n → core`.
`core` kennt weder React noch IndexedDB.

**Datenfluss:** Features lesen über Hooks in `apps/web/src/app/data.ts`, also über TanStack
Query mit Schlüsseln `['local', tabelle, …]`. Schreibzugriffe gehen direkt an den Store
(`useStore()`). Der Store meldet jede Änderung, auch aus anderen Tabs, und `MnemoProvider`
invalidiert dann die betroffenen Abfragen. Deshalb gibt es keinen manuellen Refresh und
keinen globalen State-Container.

**Domänenregeln** liegen in `packages/core/src/services`, etwa „Ort löschen löscht auch Besuche
und entkoppelt Werke“ oder „erledigter Reisepunkt wird zum Besuch“. Dadurch gelten sie für
jedes Speicher-Backend gleich.

## Erweitern und integrieren

### 1. Ein anderes Backend anschließen

Implementiere das Interface `MnemoStore` aus `@mnemo/core` (z. B. über REST oder Supabase) und
übergib es der App:

```tsx
import { AppProviders } from './app/providers';

<AppProviders store={createRestStore('https://api.example.com')}>
  <RouterProvider router={router} />
</AppProviders>
```

Wichtig ist nur, dass `subscribe()` Änderungen meldet, etwa per WebSocket oder nach eigenen
Schreibzugriffen. Alle Features bleiben unverändert. `snapshot()` und `restore()` sind die
Grundlage für einen späteren Sync.

### 2. Teile in eine andere React-App übernehmen

- `@mnemo/ui`: Komponenten und Tokens. Im eigenen CSS `@import '@mnemo/ui/theme.css'` und
  `@source '<pfad>/packages/ui/src'` eintragen. Farben, Schriften und Radien sind
  `--mn-*`-Variablen und lassen sich auf jedem Elternelement überschreiben.
- `@mnemo/providers`: Museums- und Ortssuche ohne React, nutzbar auch serverseitig.
- `@mnemo/core`: Datenmodell, Validierung, Statistiken und Filter.
- Feature-Seiten aus `apps/web/src/features/*` laufen in jeder App, die `AppProviders`
  verwendet.

### 3. Das Widget auf einer beliebigen Webseite einbetten

1. In Mnemo unter Einstellungen → Daten → *Zum Teilen & Einbetten* eine Liste als JSON
   exportieren.
2. `pnpm --filter @mnemo/embed build` erzeugt `packages/embed/dist/mnemo-embed.js`.
3. Beides auf die Webseite legen und einbinden:

```html
<script type="module" src="mnemo-embed.js"></script>
<mnemo-gallery src="mnemo-lieblingswerke.json" collection="Lieblingswerke" theme="auto" columns="3"></mnemo-gallery>
```

| Attribut | Bedeutung |
| --- | --- |
| `src` | URL des JSON-Exports (alternativ per JS: `el.data = archiv`) |
| `collection` | Name oder ID einer Liste |
| `filter` | `all`, `favorites`, `seen`, `wishlist` |
| `limit`, `columns`, `heading` | Anzahl, Spalten, eigene Überschrift |
| `theme` | `light`, `dark`, `auto` |
| `lang` | `de` oder `en` |

Das Widget sendet `mnemo-select` mit dem gewählten Werk als `detail`. Gestalten lässt es sich
von außen über `--mnemo-accent`, `--mnemo-bg`, `--mnemo-font-display` usw. sowie über
`::part(item)`, `::part(caption)` und `::part(header)`.

![Widget auf einer fremden Seite](docs/screenshots/embed.webp)

### 4. Eine neue Kunst-Datenquelle hinzufügen

`ArtworkSearchProvider` in `packages/providers/src/art/` implementieren und in `artProviders`
(`packages/providers/src/index.ts`) eintragen. „Entdecken“ zeigt sie dann automatisch an.
Mapper-Funktionen bitte mit einer echten, gekürzten API-Antwort in `test/fixtures/` testen.

## Externe Dienste: Hinweise aus der Praxis

Alle Dienste sind kostenlos und brauchen keinen Account. Einige Eigenheiten fängt der Code ab:

- **The Met:** Die alte Such-API `v1/search` wurde am 1. 10. 2026 abgeschaltet. Mnemo nutzt
  `v1.1/search`.
- **Wikimedia (Wikidata, Commons, Wikipedia):** Anfragen tragen einen `Api-User-Agent`.
  `Special:FilePath`-Links senden keine CORS-Header, deshalb löst Mnemo sie vor dem Download
  über die Commons-API auf, damit Bilder lokal gespeichert und analysiert werden können. Bei
  Überlastung drosselt der Wikidata-Query-Service zeitweise (HTTP 429). Titel- und
  Künstlersuche laufen deshalb getrennt und dürfen einzeln scheitern.
- **Overpass (Reisevorschläge):** Die öffentlichen Server sind oft ausgelastet; Antworten
  können 30–60 s dauern. Mnemo fragt zwei Instanzen parallel an, nimmt die erste Antwort und
  speichert Ergebnisse einen Tag zwischen.
- **Cleveland Museum of Art:** Das CDN liefert gecachte Antworten teils ohne CORS-Header. Ein
  zusätzlicher Parameter hält Browser-Anfragen in eigenen Cache-Einträgen.
- **Art Institute of Chicago:** Die Bildserver liegen hinter Cloudflare und blockieren
  automatisierte Browser. In normalen Browsern funktionieren sie in der Regel. Wenn nicht,
  zeigt Mnemo einen typografischen Platzhalter und speichert nur den Link.
- **Europeana / Harvard:** Kostenlosen Key holen und in den Einstellungen eintragen.

## Datenschutz

Alle Einträge und Bilder bleiben in der IndexedDB deines Browsers. Mnemo bittet den Browser
um dauerhaften Speicher (`navigator.storage.persist()`). Externe Dienste bekommen nur, was du
suchst: Suchbegriffe, Ortskoordinaten für Vorschläge und Bildabrufe. Da es keinen Server gibt,
gibt es auch keinen Sync. Sichere deine Daten deshalb regelmäßig als ZIP.

## Ideen für später

Im Code sind dafür Erweiterungspunkte vorbereitet:

- **Sync:** ein `storage-rest`-Paket gegen ein kleines Backend; `snapshot`/`restore` und
  `schemaVersion` sind schon da.
- **Ausstellungsmodus:** Vollbild-Diashow mit Ken-Burns-Effekt über eine Liste.
- **Kunstpass:** Stempel pro besuchtem Museum, Sammelalbum in der Bilanz.
- **Teilen:** Postkarte eines Werks als PNG mit Palette und Notiz.
- **Vergleich:** zwei Werke nebeneinander mit synchronem Deep Zoom.
- **Museumsschilder per OCR** (z. B. Tesseract.js) ausfüllen lassen.
