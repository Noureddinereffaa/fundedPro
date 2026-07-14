import { test, expect } from '@playwright/test'

const LANG = 'en'
const TEST_EMAIL = `e2e_${Date.now()}@test.profundx.com`
const TEST_PASSWORD = 'TestPass123!'

test.describe('Authentication flows', () => {
  test('register a new account', async ({ page }) => {
    await page.goto(`/${LANG}/register`)

    await expect(page.locator('h1')).toContainText('ProFundX')

    await page.fill('input[placeholder*="First"]', 'John')
    await page.fill('input[placeholder*="Last"]', 'Doe')
    await page.fill('input[type="email"]', TEST_EMAIL)
    await page.fill('input[type="password"]', TEST_PASSWORD)
    await page.fill('input[placeholder="••••••••"]', TEST_PASSWORD)

    await page.click('button[type="submit"]')

    await page.waitForURL(/\/dashboard/, { timeout: 15000 })
    await expect(page.locator('body')).toBeVisible()
  })

  test('login with registered credentials', async ({ page }) => {
    await page.goto(`/${LANG}/login`)

    await page.fill('input[type="email"]', TEST_EMAIL)
    await page.fill('input[type="password"]', TEST_PASSWORD)
    await page.click('button[type="submit"]')

    await page.waitForURL(/\/dashboard/, { timeout: 10000 })
    await expect(page.locator('body')).toBeVisible()
  })

  test('show error on invalid login', async ({ page }) => {
    await page.goto(`/${LANG}/login`)

    await page.fill('input[type="email"]', 'wrong@test.com')
    await page.fill('input[type="password"]', 'WrongPass123!')
    await page.click('button[type="submit"]')

    await expect(page.locator('text=/invalid|error|Incorrect|Wrong/i')).toBeVisible({ timeout: 10000 })
  })

  test('navigate to forgot password page', async ({ page }) => {
    await page.goto(`/${LANG}/login`)

    await page.click('a[href*="forgot-password"]')
    await page.waitForURL(/forgot-password/)
    await expect(page.locator('input[type="email"]')).toBeVisible()
  })
})
