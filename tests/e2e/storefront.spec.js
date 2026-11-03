import { test, expect } from "@playwright/test";

const storeFixture = {
  store: {
    id: "qa-store-001",
    storeName: "QuickCart QA Store",
    slug: "qa-store",
    tagline: "A storefront used for automated quality checks.",
    deliveryEnabled: true,
    deliveryFee: 300,
    primaryColor: "#12392d"
  },
  products: [
    { id: "qa-shirt", name: "Classic Test Shirt", description: "A test catalogue item", price: 2500, stock: 5, active: true, emoji: "👕", category: "Clothing" },
    { id: "qa-bag", name: "Canvas Test Bag", description: "Another test catalogue item", price: 1500, stock: 0, active: true, emoji: "👜", category: "Accessories" }
  ]
};

async function openStore(page) {
  await page.route("**/api/storefront/qa-store", route =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(storeFixture) })
  );
  await page.goto("/store/qa-store");
}

test("storefront renders products and makes sold-out inventory clear", async ({ page }) => {
  await openStore(page);
  await expect(page.getByRole("heading", { name: /find something/i })).toBeVisible();
  await expect(page.getByText("Classic Test Shirt")).toBeVisible();
  await expect(page.getByText("Canvas Test Bag")).toBeVisible();
  await expect(page.getByText("Sold out").first()).toBeVisible();
});

test("product search filters the catalogue without removing the search control", async ({ page }) => {
  await openStore(page);
  const search = page.getByPlaceholder("Search products…");
  await search.fill("Classic");
  await expect(page.getByText("Classic Test Shirt")).toBeVisible();
  await expect(page.getByText("Canvas Test Bag")).toHaveCount(0);
  await expect(search).toBeVisible();
});

test("guest can add an in-stock product and reach the guest checkout summary", async ({ page }) => {
  await openStore(page);
  await page.getByRole("button", { name: "Increase Classic Test Shirt quantity" }).click();
  await expect(page.getByRole("heading", { name: "Checkout as guest" })).toBeVisible();
  await expect(page.getByText(/no account required/i)).toBeVisible();
  await expect(page.getByRole("heading", { name: "Classic Test Shirt" })).toBeVisible();
});

test("guest cart is persisted per store and restored after a page reload", async ({ page }) => {
  await openStore(page);
  await page.getByRole("button", { name: "Increase Classic Test Shirt quantity" }).click();
  await expect.poll(() => page.evaluate(() => localStorage.getItem("qc_cart:qa-store-001:guest"))).toContain("qa-shirt");
  await page.reload();
  await expect(page.getByRole("heading", { name: "Checkout as guest" })).toBeVisible();
});

test("unauthenticated visitors cannot enter the private seller dashboard", async ({ page }) => {
  await page.goto("/app/overview");
  await expect(page).toHaveURL(/\/auth\/login$/);
  await expect(page.getByRole("heading", { name: /welcome back|sign in/i })).toBeVisible();
});

test("storefront has no horizontal page overflow at mobile viewport width", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await openStore(page);
  const dimensions = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    content: document.documentElement.scrollWidth
  }));
  expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport + 1);
});
