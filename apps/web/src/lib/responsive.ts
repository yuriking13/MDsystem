export const APP_MOBILE_MAX_WIDTH = 768;
export const ADMIN_MOBILE_MAX_WIDTH = 900;

export function isAppMobileViewport(width: number): boolean {
  return width <= APP_MOBILE_MAX_WIDTH;
}

export function isAdminMobileViewport(width: number): boolean {
  return width <= ADMIN_MOBILE_MAX_WIDTH;
}
