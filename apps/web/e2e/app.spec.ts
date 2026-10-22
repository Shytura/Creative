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
