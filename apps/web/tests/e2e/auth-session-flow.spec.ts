import { expect, test } from "@playwright/test";
import {
  createCredentials,
  disableOnboarding,
  loginViaUi,
  readAuthTokens,
  registerViaApi,
} from "./helpers";

test.describe("Browser auth flow: refresh/logout/logout-all", () => {
  test.beforeEach(async ({ page }) => {
    await disableOnboarding(page);
  });

  test("handles token refresh, logout and logout-all", async ({
    page,
    request,
  }) => {
    const credentials = createCredentials("e2e-session");
    await registerViaApi(request, credentials);
    await loginViaUi(page, credentials);

    const tokensBeforeRefresh = await readAuthTokens(page);
    expect(tokensBeforeRefresh.accessToken).toBeTruthy();
    expect(tokensBeforeRefresh.refreshToken).toBeTruthy();

    await page.evaluate(() => {
      window.localStorage.setItem("mdsystem_token", "broken.token.value");
    });

    await page.goto("/projects");
    await expect(page).toHaveURL(/\/projects/);

    const tokensAfterRefresh = await readAuthTokens(page);
    expect(tokensAfterRefresh.accessToken).toBeTruthy();
    expect(tokensAfterRefresh.accessToken).not.toBe("broken.token.value");
    expect(tokensAfterRefresh.accessToken).not.toBe(
      tokensBeforeRefresh.accessToken,
    );

    await page.getByTestId("sidebar-logout-button").click();
    await expect(page).toHaveURL(/\/login/);

    const tokensAfterLogout = await readAuthTokens(page);
    expect(tokensAfterLogout.accessToken).toBeNull();
    expect(tokensAfterLogout.refreshToken).toBeNull();

    await loginViaUi(page, credentials);
    const tokensBeforeLogoutAll = await readAuthTokens(page);
    expect(tokensBeforeLogoutAll.accessToken).toBeTruthy();
    expect(tokensBeforeLogoutAll.refreshToken).toBeTruthy();

    const logoutAllResponse = await request.post("/api/auth/logout-all", {
      headers: {
        authorization: `Bearer ${tokensBeforeLogoutAll.accessToken}`,
      },
    });
    expect(logoutAllResponse.ok()).toBeTruthy();

    const refreshAfterLogoutAll = await request.post("/api/auth/refresh", {
      data: {
        refreshToken: tokensBeforeLogoutAll.refreshToken,
      },
    });
    expect(refreshAfterLogoutAll.status()).toBe(401);

    await page.evaluate(() => {
      window.localStorage.setItem("mdsystem_token", "broken.token.value");
    });
    await page.goto("/projects");
    await expect(page).toHaveURL(/\/login/);
  });
});
