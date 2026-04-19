import { test, expect } from '@playwright/test';

const STORE = 'http://localhost:4100';
const MERCHANT = 'http://localhost:4200';

// Golden path: a customer signs in, browses a shop, places an order, pays, and the merchant sees it.
test('customer can place an order and merchant sees it', async ({ browser }) => {
  const customerCtx = await browser.newContext();
  const customer = await customerCtx.newPage();

  // Customer signs in
  await customer.goto(`${STORE}/sign-in`);
  await customer.getByLabel('Email').fill('customer@lunchbox.test');
  await customer.getByLabel('Password').fill('lunchbox');
  await customer.getByRole('button', { name: /sign in/i }).click();

  // Landing page shows tenants
  await expect(customer.getByRole('link', { name: /Jan's Broodjes/i })).toBeVisible({ timeout: 15_000 });

  // Open Jan's Broodjes, add two items to cart
  await customer.getByRole('link', { name: /Jan's Broodjes/i }).click();
  await expect(customer.getByRole('heading', { name: /Jan's Broodjes/i })).toBeVisible();

  await customer.getByRole('button', { name: /add to cart/i }).first().click();
  await customer.getByRole('button', { name: /add to cart/i }).nth(1).click();

  // Go to cart
  await customer.getByRole('link', { name: /cart/i }).first().click();
  await expect(customer.getByRole('heading', { name: /Your cart/i })).toBeVisible();

  // Place order
  await customer.getByRole('button', { name: /place order/i }).click();
  await expect(customer.getByRole('heading', { name: /Checkout/i })).toBeVisible({ timeout: 10_000 });

  // Simulate payment
  await customer.getByRole('button', { name: /pay now/i }).click();
  await expect(customer.getByText(/Payment received/i)).toBeVisible({ timeout: 10_000 });

  // Now a merchant signs in and sees the paid order
  const merchantCtx = await browser.newContext();
  const merchant = await merchantCtx.newPage();
  await merchant.goto(`${MERCHANT}/sign-in`);
  await merchant.getByLabel('Email').fill('merchant@lunchbox.test');
  await merchant.getByLabel('Password').fill('lunchbox');
  await merchant.getByRole('button', { name: /sign in/i }).click();

  await expect(merchant.getByRole('heading', { name: /Your shops/i })).toBeVisible({ timeout: 15_000 });
  await merchant.getByRole('button', { name: /live orders/i }).first().click();
  await expect(merchant.getByRole('heading', { name: /Live orders/i })).toBeVisible();

  // The order should appear with PAID status
  await expect(merchant.getByText(/PAID/).first()).toBeVisible({ timeout: 15_000 });

  await customerCtx.close();
  await merchantCtx.close();
});
