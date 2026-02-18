import { expect, type APIRequestContext, type Page } from "@playwright/test";

export type E2ECredentials = {
  email: string;
  password: string;
};

export function createCredentials(prefix: string): E2ECredentials {
  const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  return {
    email: `${prefix}.${unique}@example.com`,
    password: "E2ePassword!12345",
  };
}

export async function disableOnboarding(page: Page): Promise<void> {
  await page.addInitScript(() => {
    window.localStorage.setItem("onboarding_completed", "true");
  });
}

export async function registerViaApi(
  request: APIRequestContext,
  credentials: E2ECredentials,
): Promise<void> {
  const response = await request.post("/api/auth/register", {
    data: credentials,
  });
  expect([200, 409]).toContain(response.status());
}

export async function loginViaUi(
  page: Page,
  credentials: E2ECredentials,
): Promise<void> {
  await page.goto("/login");
  await page.getByTestId("login-email-input").fill(credentials.email);
  await page.getByTestId("login-password-input").fill(credentials.password);
  await page.getByTestId("login-submit-button").click();
  await expect(page).toHaveURL(/\/projects/);
}

export async function readAuthTokens(page: Page): Promise<{
  accessToken: string | null;
  refreshToken: string | null;
}> {
  return page.evaluate(() => {
    return {
      accessToken: window.localStorage.getItem("mdsystem_token"),
      refreshToken: window.localStorage.getItem("mdsystem_refresh_token"),
    };
  });
}
