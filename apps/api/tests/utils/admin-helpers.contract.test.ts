import { describe, expect, it } from "vitest";
import {
  generateAdminToken,
  hashAdminToken,
  normalizePagination,
} from "../../src/routes/admin/helpers.js";

describe("admin route helpers contract", () => {
  it("generates hex admin tokens with expected length", () => {
    const first = generateAdminToken();
    const second = generateAdminToken();

    expect(first).toMatch(/^[a-f0-9]{64}$/);
    expect(second).toMatch(/^[a-f0-9]{64}$/);
    expect(first).not.toBe(second);
  });

  it("hashes admin token deterministically with sha256-length digest", () => {
    const token = "test-admin-token-value";

    const hashA = hashAdminToken(token);
    const hashB = hashAdminToken(token);
    const hashOther = hashAdminToken("other-token-value");

    expect(hashA).toBe(hashB);
    expect(hashA).toMatch(/^[a-f0-9]{64}$/);
    expect(hashA).not.toBe(hashOther);
  });

  it("normalizes pagination input and caps limit", () => {
    expect(normalizePagination(2, 25, 50)).toEqual({
      page: 2,
      limit: 25,
      offset: 25,
    });

    expect(normalizePagination(0, -1, 20)).toEqual({
      page: 1,
      limit: 20,
      offset: 0,
    });

    expect(normalizePagination(3.9, 1000, 50)).toEqual({
      page: 3,
      limit: 100,
      offset: 200,
    });
  });
});
