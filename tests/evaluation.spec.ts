import { test, expect } from '@playwright/test'

const LANG = 'en'
const TEST_EMAIL = `e2e_${Date.now()}@test.profundx.com`
const TEST_PASSWORD = 'TestPass123!'

test.describe('Evaluation purchase flow', () => {
  test.beforeAll(async ({ browser }) => {
    const ctx = await browser.newContext()
    const page = await ctx.newPage()
    await page.goto(`/${LANG}/register`)
    await page.fill('input[placeholder*="First"]', 'Bob')
    await page.fill('input[placeholder*="Last"]', 'Test')
    await page.fill('input[type="email"]', TEST_EMAIL)
    await page.fill('input[type="password"]', TEST_PASSWORD)
    await page.fill('input[placeholder="••••••••"]', TEST_PASSWORD)
    await page.click('button[type="submit"]')
    await page.waitForURL(/\/dashboard/, { timeout: 15000 })
    await ctx.storageState({ path: 'eval-auth.json' })
    await ctx.close()
  })

  test('pricing page shows evaluation plans', async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: 'eval-auth.json' })
    const page = await ctx.newPage()
    await page.goto(`/${LANG}/pricing`)

    await expect(page.locator('body')).toBeVisible()
    const bodyText = await page.locator('body').innerText()
    expect(bodyText.length).toBeGreaterThan(100)

    const buyButtons = page.locator('button, a').filter({ hasText: /buy|get started|purchase|choose|select/i })
    const btnCount = await buyButtons.count()
    expect(btnCount).toBeGreaterThanOrEqual(1)

    await ctx.close()
  })

  test('can select an account size', async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: 'eval-auth.json' })
    const page = await ctx.newPage()
    await page.goto(`/${LANG}/pricing`)

    const sizeElements = page.locator('text=/\$[\d,]+K|\$[\d,]+k|\d+K account|\d+k account/i')
    const count = await sizeElements.count()
    expect(count).toBeGreaterThanOrEqual(1)

    await ctx.close()
  })
})
