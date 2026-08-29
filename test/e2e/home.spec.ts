import { expect, test } from '@playwright/test'

test('shows industry overview shell', async ({ page }) => {
  await page.goto('/')

  await expect(page).toHaveTitle(/Reel Return/)
  await expect(page.getByRole('link', { name: 'Reel Return' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Industry Overview' })).toBeVisible()
  await expect(page.getByText('YTD Box Office')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Industry', exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Operators', exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Companies', exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Outlook', exact: true })).toBeVisible()
})

test('navigates between dashboard areas', async ({ page }) => {
  await page.goto('/')

  await page.getByRole('link', { name: 'Operators', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Operator Comparison' })).toBeVisible()

  await page.getByRole('link', { name: 'Outlook', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Outlook' })).toBeVisible()
  await expect(page.getByText('Next 30 days')).toBeVisible()

  await page.getByRole('link', { name: 'Companies', exact: true }).click()
  await expect(page).toHaveURL(/\/companies\/AMC/i)
  await expect(page.getByRole('heading').first()).toBeVisible()
})

test('opens mobile navigation', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')

  await expect(page.getByRole('heading', { name: 'Industry Overview' })).toBeVisible()
  await page.getByLabel('Open menu').click()
  await page.getByRole('link', { name: 'Outlook', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Outlook' })).toBeVisible()
})
