import { expect, test } from "@playwright/test";
import {
  createCredentials,
  disableOnboarding,
  loginViaUi,
  registerViaApi,
} from "./helpers";

test.describe("Browser project core flow", () => {
  test.beforeEach(async ({ page }) => {
    await disableOnboarding(page);
  });

  test("creates project and opens project detail with tab switch", async ({
    page,
    request,
  }) => {
    const credentials = createCredentials("e2e-project");
    await registerViaApi(request, credentials);
    await loginViaUi(page, credentials);

    const projectName = `E2E Project ${Date.now()}`;
    await page.getByTestId("projects-create-button").first().click();
    await page.getByTestId("project-name-input").fill(projectName);
    await page
      .getByTestId("project-description-input")
      .fill("Playwright project flow smoke");
    await page.getByTestId("project-create-submit-button").click();

    const projectCard = page.locator(".project-card", { hasText: projectName });
    await expect(projectCard).toBeVisible();
    await projectCard.getByRole("button", { name: "Открыть" }).click();

    await expect(page).toHaveURL(/\/projects\/[^/?]+/);
    await expect(
      page.locator(".sidebar-nav-item", { hasText: "База статей" }),
    ).toBeVisible();

    await page.locator(".sidebar-nav-item", { hasText: "Документы" }).click();
    await expect(page).toHaveURL(/tab=documents/);
    await expect(
      page.getByRole("heading", { name: "Документы проекта" }),
    ).toBeVisible();
  });
});
