import { describe, expect, it } from "vitest";
import { parseTrustProxy } from "../../src/utils/trust-proxy.js";

describe("parseTrustProxy", () => {
  it("parses boolean-like values", () => {
    expect(parseTrustProxy("true")).toBe(true);
    expect(parseTrustProxy("1")).toBe(true);
    expect(parseTrustProxy("false")).toBe(false);
    expect(parseTrustProxy("0")).toBe(false);
  });

  it("parses hop count", () => {
    expect(parseTrustProxy("2")).toBe(2);
  });

  it("parses comma-separated proxy CIDR list", () => {
    expect(parseTrustProxy("127.0.0.1, 10.0.0.0/8")).toEqual([
      "127.0.0.1",
      "10.0.0.0/8",
    ]);
  });

  it("returns undefined for empty values", () => {
    expect(parseTrustProxy(undefined)).toBeUndefined();
    expect(parseTrustProxy(null)).toBeUndefined();
    expect(parseTrustProxy(" ")).toBeUndefined();
  });
});
