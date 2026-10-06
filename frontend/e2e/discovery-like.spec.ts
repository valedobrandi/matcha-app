import { expect, test } from '@playwright/test'

const username = process.env.E2E_USERNAME
const password = process.env.E2E_PASSWORD

test('logs in, opens a suggested profile and likes it', async ({ page }) => {
  expect(username, 'set E2E_USERNAME to a seeded username').toBeTruthy()
  expect(password, 'set E2E_PASSWORD to the seed password').toBeTruthy()

  await page.goto('/auth/login')
  await page.getByLabel('Username').fill(username!)
  await page.getByLabel('Password').fill(password!)
  await page.getByRole('button', { name: 'Login', exact: true }).click()
  await expect(page).toHaveURL('/')

  await page.goto('/suggest')
  const card = page
    .getByTestId('profile-card')
    .filter({ has: page.getByRole('img', { name: 'unlike', exact: true }) })
    .first()
  await expect(card).toBeVisible()

  await card.getByRole('heading', { level: 2 }).click()
  await expect(page).toHaveURL(/\/users\/\d+$/)

  await page.getByRole('button', { name: /^Like (him|her)$/ }).click()
  await expect(page.getByRole('button', { name: /^(Liked by me|Connected)$/ })).toBeVisible()
})
