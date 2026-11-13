import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

async function addCard(page: Page, storeName: string, cardId: string, favorite = false): Promise<void> {
  await page.getByRole('link', { name: 'Add card' }).click();
  await expect(page.getByText('New card')).toBeVisible();
  await page.getByLabel('Store name', { exact: true }).fill(storeName);
  await page.getByLabel('Card ID', { exact: true }).fill(cardId);
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
  await page.getByLabel('Balance', { exact: true }).fill('-1');
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByText('Balance must not be negative.')).toBeVisible();
  await page.getByLabel('Balance', { exact: true }).fill('');
  await page.getByLabel('Store name', { exact: true }).fill('Bakery Müller');
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
  await page.getByLabel('Store name', { exact: true }).fill('Grocer');
  await page.getByLabel('Card ID', { exact: true }).fill('5901234123458');
  await page.locator('ion-select[formcontrolname="barcodeType"]').click();
  await page.getByRole('radio', { name: 'EAN_13' }).click();
  await page.getByRole('button', { name: 'OK' }).click();
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByText('Not a valid value for barcode type EAN_13.')).toBeVisible();

  await page.getByLabel('Card ID', { exact: true }).fill('5901234123457');
  await page.getByRole('button', { name: 'Save' }).click();
  await cardNames(page).filter({ hasText: 'Grocer' }).click();

  const barcode = detail(page).getByRole('img', { name: 'Barcode of Grocer' });
  await expect(barcode).toBeVisible();
  await expect(barcode).toHaveAttribute('src', /^data:image\/svg\+xml/);
  expect(await barcode.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);
  await expect(detail(page).getByTestId('card-id')).toHaveText('5901234123457');
});
