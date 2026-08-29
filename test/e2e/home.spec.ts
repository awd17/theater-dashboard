import { expect, test } from '@playwright/test'

test('shows the dashboard shell', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
  await expect(page.getByText('System status')).toBeVisible()
  await expect(page.getByText('API is ready.')).toBeVisible()
  await expect(page.getByText('Industry snapshot')).toBeVisible()
})
