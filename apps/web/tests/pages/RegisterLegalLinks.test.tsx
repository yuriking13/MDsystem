import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import RegisterPage from "../../src/pages/RegisterPage";
import TermsOfUsePage from "../../src/pages/TermsOfUsePage";
import PrivacyPolicyPage from "../../src/pages/PrivacyPolicyPage";

vi.mock("../../src/lib/api", () => ({
  apiRegister: vi.fn(),
}));

vi.mock("../../src/lib/AuthContext", () => ({
  useAuth: () => ({
    loginWithToken: vi.fn(),
  }),
}));

describe("Register legal links", () => {
  it("routes terms/privacy links from register page", async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={["/register"]}>
        <Routes>
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/terms" element={<div>Terms Route</div>} />
          <Route path="/privacy" element={<div>Privacy Route</div>} />
        </Routes>
      </MemoryRouter>,
    );

    const termsLink = screen.getByRole("link", {
      name: "Условиями использования",
    });
    const privacyLink = screen.getByRole("link", {
      name: "Политикой конфиденциальности",
    });

    expect(termsLink).toHaveAttribute("href", "/terms");
    expect(privacyLink).toHaveAttribute("href", "/privacy");

    await user.click(termsLink);
    expect(screen.getByText("Terms Route")).toBeInTheDocument();
  });

  it("renders dedicated terms and privacy pages", () => {
    const { unmount } = render(
      <MemoryRouter>
        <TermsOfUsePage />
      </MemoryRouter>,
    );
    expect(
      screen.getByRole("heading", { name: "Terms of Use / Условия использования" }),
    ).toBeInTheDocument();
    unmount();

    render(
      <MemoryRouter>
        <PrivacyPolicyPage />
      </MemoryRouter>,
    );
    expect(
      screen.getByRole("heading", {
        name: "Privacy Policy / Политика конфиденциальности",
      }),
    ).toBeInTheDocument();
  });
});
