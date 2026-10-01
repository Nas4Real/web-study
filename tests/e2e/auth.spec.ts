import { expect, test } from "@playwright/test";

test.describe("auth screens", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
  });

  test("renders the corrected Sign In screen and navigates the auth flow", async ({ page }) => {
    await page.goto("/sign-in");

    await expect(page.getByRole("heading", { level: 1, name: "Master your academic schedule with quiet precision." })).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: "Welcome back" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Continue with Google" })).toBeVisible();
    await expect(page.getByText(/Apple/i)).toHaveCount(0);

    await page.getByRole("link", { name: "Forgot password?" }).click();
    await expect(page).toHaveURL(/\/forgot-password$/);
    await expect(page.getByRole("heading", { level: 2, name: "Reset password" })).toBeVisible();

    await page.getByRole("link", { name: "Back to sign in" }).click();
    await page.getByRole("link", { name: "Sign up for free" }).click();
    await expect(page).toHaveURL(/\/sign-up$/);
    await expect(page.getByRole("heading", { level: 2, name: "Create an account" })).toBeVisible();
    await expect(page.getByText(/Apple/i)).toHaveCount(0);
  });

  test("toggles password visibility without submitting the static form", async ({ page }) => {
    await page.goto("/sign-in");

    const password = page.getByLabel("Password", { exact: true });
    await expect(password).toHaveAttribute("type", "password");
    await page.getByRole("button", { name: "Show password" }).click();
    await expect(password).toHaveAttribute("type", "text");
    await expect(page).toHaveURL(/\/sign-in$/);
  });

  for (const viewport of [
    { width: 320, height: 800 },
    { width: 768, height: 1024 },
    { width: 1024, height: 900 },
  ] as const) {
    test(`keeps auth screens usable at ${viewport.width}px`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.goto("/sign-in");

      await expect(page.getByRole("heading", { level: 2, name: "Welcome back" })).toBeVisible();
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
      );
      expect(overflow).toBe(false);
    });
  }
});
