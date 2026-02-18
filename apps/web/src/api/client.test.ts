import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  apiFetchMock,
  getTokenMock,
  setTokenMock,
  getRefreshTokenMock,
  setRefreshTokenMock,
  clearTokenMock,
  setAuthTokensMock,
} = vi.hoisted(() => ({
  apiFetchMock: vi.fn(),
  getTokenMock: vi.fn(),
  setTokenMock: vi.fn(),
  getRefreshTokenMock: vi.fn(),
  setRefreshTokenMock: vi.fn(),
  clearTokenMock: vi.fn(),
  setAuthTokensMock: vi.fn(),
}));

vi.mock("../lib/api", () => ({
  apiFetch: apiFetchMock,
}));

vi.mock("../lib/auth", () => ({
  getToken: getTokenMock,
  setToken: setTokenMock,
  getRefreshToken: getRefreshTokenMock,
  setRefreshToken: setRefreshTokenMock,
  clearToken: clearTokenMock,
  setAuthTokens: setAuthTokensMock,
}));

import {
  API_BASE,
  api,
  clearToken,
  getRefreshToken,
  getToken,
  setRefreshToken,
  setToken,
  setTokens,
} from "./client";

describe("api/client compatibility facade", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("normalizes relative paths and delegates to apiFetch", async () => {
    apiFetchMock.mockResolvedValueOnce({ ok: true });

    await api("/projects", { method: "GET" });

    expect(apiFetchMock).toHaveBeenCalledWith(`${API_BASE}/projects`, {
      method: "GET",
      auth: true,
    });
  });

  it("keeps /api paths unchanged", async () => {
    apiFetchMock.mockResolvedValueOnce({ ok: true });

    await api("/api/projects", { method: "GET" });

    expect(apiFetchMock).toHaveBeenCalledWith("/api/projects", {
      method: "GET",
      auth: true,
    });
  });

  it("delegates token and refresh-token helpers to auth module", () => {
    getTokenMock.mockReturnValueOnce("access-token");
    getRefreshTokenMock.mockReturnValueOnce("refresh-token");

    expect(getToken()).toBe("access-token");
    expect(getRefreshToken()).toBe("refresh-token");

    setToken("next-access");
    setRefreshToken("next-refresh");
    setTokens("final-access", "final-refresh");
    clearToken();

    expect(setTokenMock).toHaveBeenCalledWith("next-access");
    expect(setRefreshTokenMock).toHaveBeenCalledWith("next-refresh");
    expect(setAuthTokensMock).toHaveBeenCalledWith(
      "final-access",
      "final-refresh",
    );
    expect(clearTokenMock).toHaveBeenCalled();
  });
});
