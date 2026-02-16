import { describe, expect, it } from "vitest";
import {
  ADMIN_MOBILE_MAX_WIDTH,
  APP_MOBILE_MAX_WIDTH,
  isAdminMobileViewport,
  isAppMobileViewport,
} from "./responsive";

describe("responsive viewport helpers", () => {
  it("keeps app and admin mobile width breakpoints stable", () => {
    expect(APP_MOBILE_MAX_WIDTH).toBe(768);
    expect(ADMIN_MOBILE_MAX_WIDTH).toBe(900);
    expect(APP_MOBILE_MAX_WIDTH).toBeLessThan(ADMIN_MOBILE_MAX_WIDTH);
  });

  it("treats app viewport widths up to 768 as mobile", () => {
    expect(isAppMobileViewport(0)).toBe(true);
    expect(isAppMobileViewport(360)).toBe(true);
    expect(isAppMobileViewport(APP_MOBILE_MAX_WIDTH)).toBe(true);
    expect(isAppMobileViewport(APP_MOBILE_MAX_WIDTH + 1)).toBe(false);
  });

  it("treats admin viewport widths up to 900 as mobile", () => {
    expect(isAdminMobileViewport(0)).toBe(true);
    expect(isAdminMobileViewport(390)).toBe(true);
    expect(isAdminMobileViewport(ADMIN_MOBILE_MAX_WIDTH)).toBe(true);
    expect(isAdminMobileViewport(ADMIN_MOBILE_MAX_WIDTH + 1)).toBe(false);
  });
});
