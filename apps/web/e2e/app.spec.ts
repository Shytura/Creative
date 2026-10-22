import { readFile } from 'node:fs/promises';
import { expect, type Page, test } from '@playwright/test';

// The app must work without any external service: all third-party requests are blocked, so
// these flows exercise the offline paths (manual places, local images, local storage).
test.beforeEach(async ({ page }) => {
  await page.route(/^https?:\/\/(?!localhost)/, (route) => route.abort());
});

const STRIPES = new URL('./fixtures/stripes.png', import.meta.url).pathname;

/** Creates a place + venue by hand (the OSM search is offline in tests). */
async function pickVenueManually(page: Page, venue: string, city: string) {
  const dialog = page.getByRole('dialog');
  await dialog.getByPlaceholder('Museum oder Sehenswürdigkeit suchen …').fill(venue);
  await page.getByRole('option', { name: `„${venue}“ von Hand anlegen` }).click();
  await dialog.getByPlaceholder('Stadt suchen …').fill(city);
  await page.getByRole('option', { name: `„${city}“ als Stadt verwenden` }).click();
  await dialog.getByRole('button', { name: 'Anlegen' }).click();
}

test('welcome screen invites to start', async ({ page }) => {
  await page.goto('/');
  await expect(
    page.getByRole('heading', { name: 'Ein Archiv deiner Begegnungen mit Kunst.' }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Mit Beispielen starten' })).toBeVisible();
});

test('add an artwork with photo, venue and date, then find it everywhere', async ({ page }) => {
  await page.goto('/collection');
  await page.getByRole('button', { name: 'Erstes Werk hinzufügen' }).click();

  const dialog = page.getByRole('dialog');
  await dialog.locator('input[type=file]').setInputFiles(STRIPES);
  await dialog.getByLabel('Titel').fill('Streifenstudie');
  await dialog.getByLabel('Künstler:in').fill('Test Künstlerin');
  await dialog.getByLabel('Datierung').fill('um 1920');
  await pickVenueManually(page, 'Albertina', 'Wien');
  await dialog.getByLabel('Gesehen am').fill('2024-05-17');
  await dialog.getByPlaceholder('Schlagwort + Enter').fill('streifen');
  await dialog.getByPlaceholder('Schlagwort + Enter').press('Enter');
  await dialog.getByRole('button', { name: 'Speichern' }).click();
  await expect(dialog).toBeHidden();

  // Collection
  await expect(page.getByText('1 Werk', { exact: true })).toBeVisible();
  await page.getByText('Streifenstudie').first().click();

  // Detail page: data, venue link and an extracted colour palette
  await expect(page.getByRole('heading', { name: 'Streifenstudie' })).toBeVisible();
  await expect(page.getByText('Gesehen am 17. Mai 2024')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Albertina' })).toBeVisible();
  await expect(page.getByText('Farbpalette')).toBeVisible();

  // The visit shows up in the journal
  await page.goto('/journal');
  await expect(page.getByRole('heading', { name: '2024' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Albertina' })).toBeVisible();

  // Favourite toggle persists
  await page.goto('/collection');
  await page.getByText('Streifenstudie').first().click();
  await page.getByRole('button', { name: 'Favorit' }).click();
  await expect(page.getByRole('button', { name: 'Favorit' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.reload();
  await expect(page.getByRole('button', { name: 'Favorit' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
});

test('plan a trip to a manually entered city', async ({ page }) => {
  await page.goto('/planner');
  await page.getByRole('button', { name: 'Neue Reise' }).first().click();
  const dialog = page.getByRole('dialog');
  await dialog.getByPlaceholder('Ziel hinzufügen …').fill('Rom');
  await page.getByRole('option', { name: '„Rom“ als Stadt verwenden' }).click();
  await dialog.getByRole('button', { name: 'Reise anlegen' }).click();

  await expect(page.getByRole('heading', { name: 'Reise nach Rom' })).toBeVisible();
  await page.getByRole('link', { name: 'Planer' }).first().click();
  await expect(
    page.getByRole('region', { name: 'Idee' }).getByText('Reise nach Rom'),
  ).toBeVisible();
});

test('settings change theme, background and language', async ({ page }) => {
  await page.goto('/settings');
  await page.getByText('Dunkel', { exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

  await page.getByRole('button', { name: 'Nocturne' }).click();
  await expect(page.getByRole('button', { name: 'Nocturne' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );

  await page.getByText('English', { exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
});

test('backup export and import round-trip', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'mobile', 'covered on desktop');
  await page.goto('/collection');
  await page.getByRole('button', { name: 'Erstes Werk hinzufügen' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.locator('input[type=file]').setInputFiles(STRIPES);
  await dialog.getByLabel('Titel').fill('Gesichertes Werk');
  await dialog.getByRole('button', { name: 'Speichern' }).click();
  await expect(dialog).toBeHidden();

  await page.goto('/settings');
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Sicherung herunterladen' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^mnemo-backup-\d{4}-\d{2}-\d{2}\.zip$/);
  const backup = await readFile((await download.path()) ?? '');

  await page.getByRole('button', { name: 'Alle Daten löschen' }).click();
  await page.getByRole('button', { name: 'Endgültig löschen' }).click();
  await expect(page.getByText('Alle Daten wurden gelöscht')).toBeVisible();
  await page.goto('/collection');
  await expect(page.getByRole('heading', { name: 'Die Wände sind noch leer.' })).toBeVisible();

  await page.goto('/settings');
  await page
    .locator('input[type=file][accept*=zip]')
    .setInputFiles({ name: 'backup.zip', mimeType: 'application/zip', buffer: backup });
  await page.getByRole('button', { name: 'Zusammenführen' }).click();
  await expect(page.getByText('Import abgeschlossen – Werke: 1, Städte: 0')).toBeVisible();

  await page.goto('/collection');
  await page.getByText('Gesichertes Werk').click();
  await expect(page.getByText('Farbpalette')).toBeVisible();
});

test('shows what is new once after an update', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Mit Beispielen starten' })).toBeVisible();
  await expect(page.getByText('Neu in Mnemo')).toBeHidden();

  // Pretend the user last saw version 0.1.0.
  await page.evaluate(
    () =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open('mnemo');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const tx = open.result.transaction('settings', 'readwrite');
          tx.objectStore('settings').put({ id: 'settings', lastSeenVersion: '0.1.0' });
          tx.oncomplete = () => {
            open.result.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        };
      }),
  );
  await page.reload();

  const dialog = page.getByRole('dialog');
  await expect(dialog.getByText('Neu in Mnemo')).toBeVisible();
  await expect(dialog.getByRole('heading', { name: /^Version \d+\.\d+\.\d+$/ })).toBeVisible();
  await dialog.getByRole('button', { name: 'Weiter' }).click();
  await expect(dialog).toBeHidden();

  await page.reload();
  await expect(page.getByRole('button', { name: 'Mit Beispielen starten' })).toBeVisible();
  await expect(page.getByRole('dialog')).toBeHidden();

  await page.goto('/settings');
  await expect(page.getByRole('heading', { name: 'Über Mnemo' })).toBeVisible();
});

test('artists become people with their own page', async ({ page }) => {
  await page.goto('/collection');
  await page.getByRole('button', { name: 'Erstes Werk hinzufügen' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Titel').fill('Feldhase');
  await dialog.getByLabel('Künstler:in').fill('Albrecht Dürer');
  await dialog.getByRole('button', { name: 'Speichern' }).click();
  await expect(dialog).toBeHidden();

  await page.getByText('Feldhase').first().click();
  await page.getByRole('link', { name: 'Albrecht Dürer' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Albrecht Dürer' })).toBeVisible();
  await expect(page.getByText('1 Werk in deiner Sammlung')).toBeVisible();

  await page.getByRole('button', { name: 'Person bearbeiten' }).click();
  const edit = page.getByRole('dialog');
  await edit.getByLabel('Geboren').fill('1471');
  await edit.getByLabel('Gestorben').fill('1528');
  await edit.getByRole('button', { name: 'Speichern' }).click();
  await expect(edit).toBeHidden();
  await expect(page.getByText('1471–1528')).toBeVisible();

  await page.goto('/insights');
  await page.getByRole('link', { name: 'Albrecht Dürer' }).click();
  await expect(page).toHaveURL(/\/creator\//);
});

test('a book found by ISBN goes on the shelf, gets read and quoted', async ({ page }) => {
  // Catalogues answer from fixtures; routes added later take precedence over the block above.
  await page.route('https://openlibrary.org/api/books**', (route) =>
    route.fulfill({
      json: {
        'ISBN:9783596294312': {
          key: '/books/OL18348219M',
          title: 'Buddenbrooks',
          subtitle: 'Verfall einer Familie : Roman',
          authors: [{ name: 'Thomas Mann' }],
          number_of_pages: 758,
          publishers: [{ name: 'Fischer Taschenbuch' }],
          publish_date: '1989',
        },
      },
    }),
  );
  await page.route('https://services.dnb.de/**', (route) =>
    route.fulfill({ body: '<searchRetrieveResponse><records></records></searchRetrieveResponse>' }),
  );

  await page.goto('/library');
  await page.getByRole('button', { name: 'Erstes Buch hinzufügen' }).click();
  const add = page.getByRole('dialog');
  await add.getByLabel('Titel, Autor:in oder ISBN').fill('3-596-29431-2');
  await expect(add.getByText('Gefunden über die ISBN')).toBeVisible();
  await add.getByRole('button', { name: 'Übernehmen' }).click();

  const form = page.getByRole('dialog');
  await expect(form.getByLabel('Untertitel')).toHaveValue('Verfall einer Familie. Roman');
  await form.getByText('Lese gerade', { exact: true }).click();
  await form.getByRole('button', { name: 'Speichern' }).click();
  await expect(form).toBeHidden();

  await expect(page.getByRole('region', { name: 'Lese gerade' })).toContainText('Buddenbrooks');
  await page
    .getByRole('link', { name: /Buddenbrooks/ })
    .last()
    .click();
  await expect(page.getByRole('heading', { level: 1, name: 'Buddenbrooks' })).toBeVisible();

  await page.getByLabel('Aktuelle Seite').fill('379');
  await page.getByLabel('Aktuelle Seite').press('Enter');
  await expect(page.getByText('50 %')).toBeVisible();

  await page.getByRole('button', { name: 'Zitat festhalten' }).first().click();
  const quote = page.getByRole('dialog');
  await expect(quote.getByLabel('Seite')).toHaveValue('379');
  await quote
    .getByLabel('Zitat')
    .fill('Wir sind nicht dazu da, unser eigenes kleines Glück zu suchen.');
  await quote.getByRole('button', { name: 'Speichern' }).click();
  await expect(quote).toBeHidden();
  await expect(page.getByText('S. 379')).toBeVisible();

  await page.getByText('Gelesen', { exact: true }).click();
  await expect(page.getByText(/^Gelesen am /)).toBeVisible();

  // Authors become people, and quotes are searchable from the shelf.
  await page.getByRole('link', { name: 'Thomas Mann', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Thomas Mann' })).toBeVisible();
  await page.goto('/library?q=Glück');
  await expect(page.getByText('1 Buch')).toBeVisible();
});

test('a list mixes a work and a book, and their person shows both', async ({ page }) => {
  await page.goto('/collection');
  await page.getByRole('button', { name: 'Erstes Werk hinzufügen' }).click();
  const artwork = page.getByRole('dialog');
  await artwork.getByLabel('Titel').fill('Melencolia I');
  await artwork.getByLabel('Künstler:in').fill('Albrecht Dürer');
  await artwork.getByRole('button', { name: 'Speichern' }).click();
  await expect(artwork).toBeHidden();

  // A new list from the artwork's menu holds the artwork right away.
  await page.getByText('Melencolia I').first().click();
  await page.getByRole('button', { name: 'Weitere Aktionen' }).click();
  await page.getByRole('menuitem', { name: 'Neue Liste' }).click();
  const list = page.getByRole('dialog');
  await list.getByLabel('Name').fill('Nürnberg');
  await list.getByRole('button', { name: 'Speichern' }).click();
  await expect(list).toBeHidden();

  await page.goto('/library');
  await page.getByRole('button', { name: 'Von Hand eintragen' }).click();
  const book = page.getByRole('dialog');
  await book.getByLabel('Titel', { exact: true }).fill('Underweysung der Messung');
  await book.getByLabel('Autor:innen').fill('Albrecht Dürer');
  await book.getByLabel('Autor:innen').press('Enter');
  await book.getByRole('button', { name: 'Nürnberg' }).click();
  await book.getByRole('button', { name: 'Speichern' }).click();
  await expect(book).toBeHidden();

  await page.getByRole('link', { name: /Underweysung der Messung/ }).click();
  await page.getByRole('link', { name: 'Nürnberg' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Nürnberg' })).toBeVisible();
  await expect(page.getByText('Liste · 1 Werk · 1 Buch')).toBeVisible();
  await expect(page.getByText('Melencolia I').first()).toBeVisible();
  await expect(page.getByText('Underweysung der Messung').first()).toBeVisible();

  await page.getByRole('link', { name: /Underweysung der Messung/ }).click();
  await page.getByRole('link', { name: 'Albrecht Dürer', exact: true }).click();
  await expect(page.getByText('1 Werk in deiner Sammlung')).toBeVisible();
  await expect(page.getByText('1 Buch in deiner Bibliothek')).toBeVisible();
  await expect(page.getByText('Person', { exact: true })).toBeVisible();
});
