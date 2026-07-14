import { test, expect } from '@playwright/test'

const LANG = 'en'
const TEST_EMAIL = `e2e_badge_${Date.now()}@test.profundx.com`
const TEST_PASSWORD = 'TestPass123!'

test.describe('Badges page', () => {
  test.beforeAll(async ({ browser }) => {
    const ctx = await browser.newContext()
    const page = await ctx.newPage()
    await page.goto(`/${LANG}/register`)
    await page.fill('input[placeholder*="First"]', 'Badge')
    await page.fill('input[placeholder*="Last"]', 'User')
    await page.fill('input[type="email"]', TEST_EMAIL)
    await page.fill('input[type="password"]', TEST_PASSWORD)
    await page.fill('input[placeholder="••••••••"]', TEST_PASSWORD)
    await page.click('button[type="submit"]')
    await page.waitForURL(/\/dashboard/, { timeout: 15000 })
    await ctx.storageState({ path: 'badge-auth.json' })
    await ctx.close()
  })

  test('badges page renders with badge grid', async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: 'badge-auth.json' })
    const page = await ctx.newPage()
    await page.goto(`/${LANG}/badges`)

    await expect(page.locator('body')).toBeVisible()
    const bodyText = await page.locator('body').innerText()

    const badgeKeywords = ['badge', 'progress', 'tier', 'unlock', 'achievement']
    const found = badgeKeywords.some(k => bodyText.toLowerCase().includes(k))
    expect(found).toBeTruthy()

    await ctx.close()
  })

  test('badge progress is visible', async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: 'badge-auth.json' })
    const page = await ctx.newPage()
    await page.goto(`/${LANG}/badges`)

    const progressIndicators = page.locator('[role="progressbar"], progress, .progress-bar, div[style*="width"]')
    const count = await progressIndicators.count()
    expect(count).toBeGreaterThanOrEqual(1)

    await ctx.close()
  })
})
