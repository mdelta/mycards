import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

/** Ionic's scroll assist briefly adds a disabled clone of a focused input. */
const field = (page: Page, label: string) =>
  page.getByLabel(label, { exact: true }).and(page.locator(':not(.cloned-input)'));

async function addCard(page: Page, storeName: string, cardId: string, favorite = false): Promise<void> {
  await page.getByRole('link', { name: 'Add card' }).click();
  await expect(page.getByText('New card')).toBeVisible();
  await field(page, 'Store name').fill(storeName);
  await field(page, 'Card ID').fill(cardId);
  if (favorite) {
    await page.getByRole('switch', { name: 'Favorite' }).click();
  }
  await page.getByRole('button', { name: 'Save' }).click();
}

const cardNames = (page: Page) => page.getByTestId('card-item').locator('h2');
const detail = (page: Page) => page.locator('app-card-detail');

async function openEditor(page: Page, storeName: string): Promise<void> {
  await cardNames(page).filter({ hasText: storeName }).click();
  await detail(page).getByLabel('Edit', { exact: true }).click();
  await expect(page.getByText('Edit card')).toBeVisible();
}

test('shows the empty card list', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#container')).toContainText('No cards yet.');
});

test('creates, lists, searches, edits and deletes cards', async ({ page }) => {
  await page.goto('/');

  await addCard(page, 'Bakery', '111');
  await addCard(page, 'Pharmacy', '222', true);
  await expect(cardNames(page)).toHaveText(['Pharmacy', 'Bakery']);

  await page.getByPlaceholder('Search cards').fill('bak');
  await expect(cardNames(page)).toHaveText(['Bakery']);
  await page.getByPlaceholder('Search cards').fill('');

  await page.reload();
  await expect(cardNames(page)).toHaveText(['Pharmacy', 'Bakery']);

  await cardNames(page).filter({ hasText: 'Bakery' }).click();
  await expect(detail(page).getByTestId('card-id')).toHaveText('111');
  await expect(detail(page)).toContainText('No barcode type set');
  await detail(page).getByLabel('Edit', { exact: true }).click();
  await expect(page.getByText('Edit card')).toBeVisible();
  await field(page, 'Balance').fill('-1');
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByText('Balance must not be negative.')).toBeVisible();
  await field(page, 'Balance').fill('');
  await field(page, 'Store name').fill('Bakery Müller');
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(detail(page).locator('ion-title')).toHaveText('Bakery Müller');
  await detail(page).locator('ion-back-button').click();
  await expect(cardNames(page)).toHaveText(['Pharmacy', 'Bakery Müller']);

  for (const name of ['Pharmacy', 'Bakery Müller']) {
    await openEditor(page, name);
    await page.getByRole('button', { name: 'Delete' }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Delete' }).click();
  }
  await expect(page.locator('#container')).toContainText('No cards yet.');
});

test('validates the barcode value and shows the barcode', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Add card' }).click();
  await field(page, 'Store name').fill('Grocer');
  await field(page, 'Card ID').fill('5901234123458');
  await page.locator('ion-select[formcontrolname="barcodeType"]').click();
  await page.getByRole('radio', { name: 'EAN_13' }).click();
  await page.getByRole('button', { name: 'OK' }).click();
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByText('Not a valid value for barcode type EAN_13.')).toBeVisible();

  await field(page, 'Card ID').fill('5901234123457');
  await page.getByRole('button', { name: 'Save' }).click();
  await cardNames(page).filter({ hasText: 'Grocer' }).click();

  const barcode = detail(page).getByRole('img', { name: 'Barcode of Grocer' });
  await expect(barcode).toBeVisible();
  await expect(barcode).toHaveAttribute('src', /^data:image\/svg\+xml/);
  expect(await barcode.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);
  await expect(detail(page).getByTestId('card-id')).toHaveText('5901234123457');
});

test('pre-fills a new card from scan results and hides scanning in the browser', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByLabel('Scan card')).toHaveCount(0);

  await page.goto('/cards/new?scannedType=EAN_13&scannedValue=5901234123457');
  await expect(page.getByLabel('Card ID', { exact: true })).toHaveValue('5901234123457');
  await field(page, 'Store name').fill('Scanned shop');
  await page.getByRole('button', { name: 'Save' }).click();

  await cardNames(page).filter({ hasText: 'Scanned shop' }).click();
  await expect(detail(page).getByRole('img', { name: 'Barcode of Scanned shop' })).toBeVisible();
});

test('exports with a password and restores it with a clean import', async ({ page }) => {
  await page.goto('/');
  await addCard(page, 'Bakery', '111', true);
  await addCard(page, 'Pharmacy', '222');

  await page.getByRole('link', { name: 'Export and import' }).click();
  await page.getByLabel('Password (optional)').fill('secret');
  await page.getByLabel('Repeat password').fill('secret');
  const downloadEvent = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export', exact: true }).click();
  const download = await downloadEvent;
  expect(download.suggestedFilename()).toMatch(/^mycards-\d{4}-\d{2}-\d{2}\.zip$/);
  const exportPath = await download.path();
  await expect(page.getByText('Export file created.')).toBeVisible();

  await page.locator('app-backup ion-back-button').click();
  await addCard(page, 'Grocer', '333');
  await openEditor(page, 'Bakery');
  await page.getByRole('button', { name: 'Delete' }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Delete' }).click();
  await expect(cardNames(page)).toHaveText(['Grocer', 'Pharmacy']);

  await page.getByRole('link', { name: 'Export and import' }).click();
  await page.getByRole('switch', { name: /Clean import/ }).click();
  const chooserEvent = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Import', exact: true }).click();
  await (await chooserEvent).setFiles(exportPath);

  const dialog = page.getByRole('alertdialog');
  await dialog.getByPlaceholder('Password').fill('wrong');
  await dialog.getByRole('button', { name: 'OK' }).click();
  await expect(page.getByRole('alertdialog')).toContainText('Wrong password. Try again.');
  await page.getByRole('alertdialog').getByPlaceholder('Password').fill('secret');
  await page.getByRole('alertdialog').getByRole('button', { name: 'OK' }).click();
  await expect(page.getByRole('alertdialog')).toContainText('All 2 current cards will be deleted');
  await page.getByRole('alertdialog').getByRole('button', { name: 'Import' }).click();
  await expect(page.getByText('2 cards imported.')).toBeVisible();

  await page.locator('app-backup ion-back-button').click();
  await expect(cardNames(page)).toHaveText(['Bakery', 'Pharmacy']);
});

test('adds tags, color, icon and links, filters by tag and opens links', async ({ page, context }) => {
  await context.route(/^https:\/\/(coupons\.example\.com|www\.openstreetmap\.org)\//, (route) =>
    route.fulfill({ body: 'ok', contentType: 'text/plain' }),
  );
  await page.goto('/');
  await addCard(page, 'Pharmacy', '222');

  await page.getByRole('link', { name: 'Add card' }).click();
  await field(page, 'Store name').fill('Bakery');
  await field(page, 'Card ID').fill('111');
  await page.getByRole('radio', { name: '#1565C0' }).click();
  await page.getByText('Icon', { exact: true }).click();
  await page.getByRole('radio', { name: 'Cafe' }).click();
  await page.getByTestId('new-tag').click();
  await page.getByRole('alertdialog').getByPlaceholder('Tag name').fill('Food');
  await page.getByRole('alertdialog').getByRole('button', { name: 'OK' }).click();
  await field(page, 'Homepage (https://…)').fill('bakery.example.com');
  await page.getByTestId('add-website').click();
  await field(page, 'Label (optional)').fill('Coupons');
  await field(page, 'Website (https://…)').fill('https://coupons.example.com/');
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByText('Enter a full web address starting with https:// or http://.')).toBeVisible();
  await field(page, 'Homepage (https://…)').fill('https://bakery.example.com/');
  await page.getByRole('button', { name: 'Save' }).click();

  await expect(cardNames(page)).toHaveText(['Bakery', 'Pharmacy']);
  await page.getByTestId('tag-filter').filter({ hasText: 'Food' }).click();
  await expect(cardNames(page)).toHaveText(['Bakery']);
  await page.reload();
  await expect(cardNames(page)).toHaveText(['Bakery', 'Pharmacy']);

  await cardNames(page).filter({ hasText: 'Bakery' }).click();
  await expect(detail(page)).toContainText('Food');
  const popup = page.waitForEvent('popup');
  await detail(page).getByTestId('website').filter({ hasText: 'Coupons' }).click();
  await (await popup).waitForURL('https://coupons.example.com/');

  const mapPopup = page.waitForEvent('popup');
  await detail(page).getByTestId('shop-search').click();
  await (await mapPopup).waitForURL('https://www.openstreetmap.org/search?query=Bakery');
});

/** A 4 × 2 px PNG (left half red, right half blue). */
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAQAAAACCAIAAADwyuo0AAAAE0lEQVR4nGP4z8AARGDiPwMyBwBnsgf5Q2OaZwAAAABJRU5ErkJggg==',
  'base64',
);

async function chooseImage(page: Page, slot: string): Promise<void> {
  await page.getByTestId(slot).click();
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Choose from gallery' }).click();
  await (await chooser).setFiles({ name: 'card.png', mimeType: 'image/png', buffer: PNG });
}

test('adds front and back photos and a custom icon image', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Add card' }).click();
  await field(page, 'Store name').fill('Bakery');
  await field(page, 'Card ID').fill('111');

  await chooseImage(page, 'photo-front');
  await expect(page.getByTestId('photo-front').locator('img')).toHaveAttribute('src', /^data:image\/jpeg;base64,/);
  await chooseImage(page, 'photo-back');
  await page.getByText('Icon', { exact: true }).click();
  await chooseImage(page, 'icon-image');
  await expect(page.getByTestId('avatar-preview').locator('img')).toBeVisible();
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(cardNames(page)).toHaveText(['Bakery']);

  await page.reload();
  await expect(page.getByTestId('card-item').locator('app-card-avatar img')).toBeVisible();
  await cardNames(page).filter({ hasText: 'Bakery' }).click();
  await expect(detail(page).getByTestId('photo')).toHaveCount(2);
  await expect(detail(page).getByAltText('Back of the card')).toBeVisible();

  await detail(page).getByLabel('Edit', { exact: true }).click();
  await page.getByTestId('photo-back').click();
  await page.getByRole('button', { name: 'Remove photo' }).click();
  await expect(page.getByTestId('photo-back').locator('img')).toHaveCount(0);
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(detail(page).getByTestId('photo')).toHaveCount(1);
});
