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
  await expect(page.getByText('Edit card')).toBeVisible();
  await page.getByLabel('Balance', { exact: true }).fill('-1');
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByText('Balance must not be negative.')).toBeVisible();
  await page.getByLabel('Balance', { exact: true }).fill('');
  await page.getByLabel('Store name', { exact: true }).fill('Bakery Müller');
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(cardNames(page)).toHaveText(['Pharmacy', 'Bakery Müller']);

  for (const name of ['Pharmacy', 'Bakery Müller']) {
    await cardNames(page).filter({ hasText: name }).click();
    await page.getByRole('button', { name: 'Delete' }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Delete' }).click();
  }
  await expect(page.locator('#container')).toContainText('No cards yet.');
});
