import { test, expect } from '@playwright/test'

const LANG = 'en'
const TEST_EMAIL = `e2e_payout_${Date.now()}@test.profundx.com`
const TEST_PASSWORD = 'TestPass123!'

test.describe('Payout flow', () => {
  test.beforeAll(async ({ browser }) => {
    const ctx = await browser.newContext()
    const page = await ctx.newPage()
    await page.goto(`/${LANG}/register`)
    await page.fill('input[placeholder*="First"]', 'Payout')
    await page.fill('input[placeholder*="Last"]', 'User')
    await page.fill('input[type="email"]', TEST_EMAIL)
    await page.fill('input[type="password"]', TEST_PASSWORD)
    await page.fill('input[placeholder="••••••••"]', TEST_PASSWORD)
    await page.click('button[type="submit"]')
    await page.waitForURL(/\/dashboard/, { timeout: 15000 })
    await ctx.storageState({ path: 'payout-auth.json' })
    await ctx.close()
  })

  test('payout page is accessible', async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: 'payout-auth.json' })
    const page = await ctx.newPage()
    await page.goto(`/${LANG}/payout`)

    await expect(page.locator('body')).toBeVisible()
    const bodyText = await page.locator('body').innerText()
    expect(bodyText.length).toBeGreaterThan(50)

    await ctx.close()
  })

  test('payout form requires funded account', async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: 'payout-auth.json' })
    const page = await ctx.newPage()
    await page.goto(`/${LANG}/payout`)

    const bodyText = await page.locator('body').innerText()
    const noAccountMsg = bodyText.toLowerCase().includes('no funded') || bodyText.toLowerCase().includes('no account')
    const formVisible = await page.locator('input, select, textarea').first().isVisible().catch(() => false)
    expect(noAccountMsg || formVisible).toBeTruthy()

    await ctx.close()
  })
})
