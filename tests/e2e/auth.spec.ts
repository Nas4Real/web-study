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

  test("loads the auth screens without browser errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    page.on("pageerror", (error) => errors.push(error.message));

    for (const path of ["/sign-in", "/sign-up", "/forgot-password"] as const) {
      await page.goto(path);
    }

    expect(errors).toEqual([]);
  });

  test("redirects an unauthenticated workspace request to sign in", async ({ browser }) => {
    const context = await browser.newContext({
      baseURL: "http://localhost:3000",
      extraHTTPHeaders: { "x-web-study-e2e-auth": "unauthenticated" },
    });
    const unauthenticatedPage = await context.newPage();

    await unauthenticatedPage.goto("/tasks?filter=high");

    await expect(unauthenticatedPage).toHaveURL(/\/sign-in\?next=%2Ftasks%3Ffilter%3Dhigh$/);
    await expect(
      unauthenticatedPage.getByRole("heading", { level: 2, name: "Welcome back" }),
    ).toBeVisible();

    await context.close();
  });

  for (const screen of [
    { name: "sign-in", path: "/sign-in" },
    { name: "sign-up", path: "/sign-up" },
    { name: "forgot-password", path: "/forgot-password" },
  ] as const) {
    test(`matches the approved ${screen.name} visual baseline`, async ({ page }) => {
      await page.goto(screen.path);
      await expect(page).toHaveScreenshot(`auth-${screen.name}-1440x900.png`, {
        animations: "disabled",
        fullPage: true,
      });
    });
  }

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
