import { test, expect } from '@playwright/test'

const LANG = 'en'
const TEST_EMAIL = `e2e_${Date.now()}@test.profundx.com`
const TEST_PASSWORD = 'TestPass123!'

test.describe('Dashboard flows', () => {
  test.beforeAll(async ({ browser }) => {
    const ctx = await browser.newContext()
    const page = await ctx.newPage()
    await page.goto(`/${LANG}/register`)
    await page.fill('input[placeholder*="First"]', 'Jane')
    await page.fill('input[placeholder*="Last"]', 'Smith')
    await page.fill('input[type="email"]', TEST_EMAIL)
    await page.fill('input[type="password"]', TEST_PASSWORD)
    await page.fill('input[placeholder="••••••••"]', TEST_PASSWORD)
    await page.click('button[type="submit"]')
    await page.waitForURL(/\/dashboard/, { timeout: 15000 })
    await ctx.storageState({ path: 'dashboard-auth.json' })
    await ctx.close()
  })

  test('dashboard renders key sections', async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: 'dashboard-auth.json' })
    const page = await ctx.newPage()
    await page.goto(`/${LANG}/dashboard`)

    await expect(page.locator('body')).toBeVisible()
    const bodyText = await page.locator('body').innerText()

    const expectedSections = ['account', 'balance', 'trade', 'performance', 'chart']
    const found = expectedSections.some(s => bodyText.toLowerCase().includes(s))
    expect(found).toBeTruthy()

    await ctx.close()
  })

  test('sidebar navigation links are accessible', async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: 'dashboard-auth.json' })
    const page = await ctx.newPage()
    await page.goto(`/${LANG}/dashboard`)

    await expect(page.locator('body')).toBeVisible()

    const navLinks = page.locator('a[href*="/en/"]')
    const linkCount = await navLinks.count()
    expect(linkCount).toBeGreaterThan(0)

    await ctx.close()
  })

  test('navigate to pricing page', async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: 'dashboard-auth.json' })
    const page = await ctx.newPage()
    await page.goto(`/${LANG}/pricing`)

    await expect(page.locator('body')).toBeVisible()
    await expect(page.locator('h1, h2').first()).toBeVisible()

    await ctx.close()
  })
})
