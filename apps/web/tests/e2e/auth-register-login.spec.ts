import { expect, test } from "@playwright/test";
import {
  createCredentials,
  disableOnboarding,
  readAuthTokens,
} from "./helpers";

test.describe("Browser auth flow: register/login", () => {
  test.beforeEach(async ({ page }) => {
    await disableOnboarding(page);
  });

  test("registers and then logs in again", async ({ page }) => {
    const credentials = createCredentials("e2e-register");

    await page.goto("/register");
    await page.getByTestId("register-email-input").fill(credentials.email);
    await page
      .getByTestId("register-password-input")
      .fill(credentials.password);
    await page.getByTestId("register-terms-checkbox").check();
    await page.getByTestId("register-submit-button").click();

    await expect(page).toHaveURL(/\/projects/);
    await expect(
      page.getByRole("heading", { name: "Мои проекты" }),
    ).toBeVisible();

    const tokensAfterRegister = await readAuthTokens(page);
    expect(tokensAfterRegister.accessToken).toBeTruthy();
    expect(tokensAfterRegister.refreshToken).toBeTruthy();

    await page.getByTestId("sidebar-logout-button").click();
    await expect(page).toHaveURL(/\/login/);

    await page.getByTestId("login-email-input").fill(credentials.email);
    await page.getByTestId("login-password-input").fill(credentials.password);
    await page.getByTestId("login-submit-button").click();
    await expect(page).toHaveURL(/\/projects/);
  });
});
