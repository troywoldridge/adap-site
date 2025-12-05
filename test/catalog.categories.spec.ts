// tests/catalog.categories.spec.ts
import { test, expect } from "@playwright/test";

test.describe("@catalog @category @subcategory", () => {
  test("@smoke @category categories index page loads", async ({ page }) => {
    await page.goto("/categories");

    // Basic sanity: page title + heading
    await expect(page).toHaveTitle(/Categories/i);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/Categories/i);

    // Example: assert that "Large Format" category tile is visible
    await expect(page.getByRole("link", { name: /Large Format/i })).toBeVisible();
  });

  test("@category large format category shows correct products", async ({ page }) => {
    // Navigate directly if you know the slug:
    await page.goto("/categories/large-format");

    // Heading should mention the category
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/Large Format/i);

    // Example: category breadcrumb
    await expect(page.getByRole("navigation", { name: /Breadcrumb/i })).toContainText(
      /Home/i,
    );
    await expect(page.getByRole("navigation", { name: /Breadcrumb/i })).toContainText(
      /Large Format/i,
    );

    // Example: product card for a large format item
    // TODO: replace with a real product name that *should* appear in this category
    const productCard = page.getByRole("link", { name: /Banner/i }).first();
    await expect(productCard).toBeVisible();
  });

  test("@subcategory banners subcategory under large format shows correct data", async ({
    page,
  }) => {
    // Full flow: categories → Large Format → Banners
    await page.goto("/categories");

    // Click "Large Format"
    await page.getByRole("link", { name: /Large Format/i }).click();

    // Now click "Banners" subcategory tile / tab
    
    await page.getByRole("link", { name: /Banners/i }).click();

    // Assert URL pattern for subcategory
    await expect(page).toHaveURL(/\/categories\/large-format\/banners/i);

    // Assert heading shows both context + subcategory
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/Banners/i);

    // Example: assert that all product cards on this page are banners
    // You can refine this by checking label badges or category chips.
    const productCards = page.locator("[data-testid='product-card']");
    await expect(productCards).toHaveCountGreaterThan(0);

    // Example: ensure no obviously-wrong items appear
    // TODO: adjust to your catalog; idea is you assert absence
    await expect(page.getByText(/Business Cards/i)).toHaveCount(0);
  });

  test("@subcategory preserves filters and sort when navigating back and forth", async ({
    page,
  }) => {
    await page.goto("/categories/large-format/banners");

    // Example: apply a filter (size or finish)
    // TODO: replace with actual filter UI selectors
    await page.getByRole("button", { name: /Size/i }).click();
    await page.getByRole("checkbox", { name: /36x72/i }).check();
    await page.getByRole("button", { name: /Apply/i }).click();

    const filteredCards = page.locator("[data-testid='product-card']");
    const countAfterFilter = await filteredCards.count();
    expect(countAfterFilter).toBeGreaterThan(0);

    // Navigate away (e.g., to another subcategory) and back, and ensure filters persist
    await page.getByRole("link", { name: /Posters/i }).click();
    await page.goBack();

    // Depending on your app, you might expect filters to persist or reset.
    // If they should persist:
    await expect(filteredCards).toHaveCount(countAfterFilter);
  });
});
