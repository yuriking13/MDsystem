export type TrustProxyValue = boolean | number | string | string[];

const TRUTHY_VALUES = new Set(["1", "true", "yes", "on"]);
const FALSY_VALUES = new Set(["0", "false", "no", "off"]);

export function parseTrustProxy(
  value: string | null | undefined,
): TrustProxyValue | undefined {
  if (!value) {
    return undefined;
  }

  const normalized = value.trim();
  if (!normalized) {
    return undefined;
  }

  const lower = normalized.toLowerCase();

  if (TRUTHY_VALUES.has(lower)) {
    return true;
  }

  if (FALSY_VALUES.has(lower)) {
    return false;
  }

  if (/^\d+$/.test(normalized)) {
    return Number(normalized);
  }

  if (normalized.includes(",")) {
    return normalized
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean);
  }

  return normalized;
}
