import { expect, test } from '@playwright/test';

test('chooses a theme that is kept after a reload', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/');
  await page.getByRole('link', { name: 'Settings' }).click();
  await expect(page.getByText('Theme')).toBeVisible();
  const html = page.locator('html');
  await expect(html).not.toHaveClass(/ion-palette-dark/);

  await page.getByRole('radio', { name: 'Dark' }).click();
  await expect(html).toHaveClass(/ion-palette-dark/);
  await page.reload();
  await expect(html).toHaveClass(/ion-palette-dark/);
  await expect(page.getByRole('radio', { name: 'Dark' })).toBeChecked();

  await page.getByRole('radio', { name: 'System default' }).click();
  await expect(html).not.toHaveClass(/ion-palette-dark/);
  await page.emulateMedia({ colorScheme: 'dark' });
  await expect(html).toHaveClass(/ion-palette-dark/);
});

test('shows the privacy policy, licenses and version', async ({ page }) => {
  await page.goto('/settings');
  await expect(page.getByTestId('app-version')).toHaveText('Browser version');

  await page.getByText('Privacy policy').click();
  await expect(page.getByRole('heading', { name: 'MyCards privacy policy' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'privacy-policy@orisian.de' })).toBeVisible();
  await page.locator('app-privacy ion-back-button').click();

  await page.getByText('Licenses').click();
  const android = page.getByTestId('android');
  await expect(android).toContainText('com.google.mlkit:barcode-scanning');
  const core = android.locator('ion-accordion').filter({ hasText: 'androidx.core:core' }).first();
  await core.locator('ion-item').click();
  await expect(core.locator('pre')).toContainText('Apache License');
});
