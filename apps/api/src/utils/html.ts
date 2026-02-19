/**
 * Escape user-controlled values before interpolating into HTML.
 */
export function escapeHtml(value: string | number | null | undefined): string {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Build a safe DOI link segment for href interpolation.
 */
export function toEncodedDoiPath(doi: string): string {
  return encodeURIComponent(doi.trim());
}
