import { expect, test } from '@playwright/test';

test('shows the empty card list', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#container')).toContainText('No cards yet.');
});
