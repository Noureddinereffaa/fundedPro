import { test as setup, expect } from '@playwright/test'

const TEST_EMAIL = `e2e_${Date.now()}@test.profundx.com`
const TEST_PASSWORD = 'TestPass123!'

setup('register new test user', async ({ page }) => {
  await page.goto('/register')
  await page.fill('input[name="email"]', TEST_EMAIL)
  await page.fill('input[name="password"]', TEST_PASSWORD)
  await page.fill('input[name="confirmPassword"]', TEST_PASSWORD)
  await page.click('button[type="submit"]')

  await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 })
  await page.context().storageState({ path: 'storageState.json' })
})

export { TEST_EMAIL, TEST_PASSWORD }
