import { describe, expect, it } from "vitest";
import { translatePubmedQuery } from "../../src/lib/query-processor.js";

describe("translatePubmedQuery", () => {
  it("applies field tags term-by-term for tiab", () => {
    const q = translatePubmedQuery({
      query: '("heart failure" AND diabetes)',
      mode: "simple",
      fieldTag: "[tiab]",
    });
    expect(q).toBe('"heart failure"[tiab] AND diabetes[tiab]');
  });

  it("splits tokens in simple ti mode", () => {
    const q = translatePubmedQuery({
      query: "covid-19 vaccine children",
      mode: "simple",
      fieldTag: "[ti]",
    });
    expect(q).toBe("covid-19[ti] vaccine[ti] children[ti]");
  });

  it("does not collapse multi-token without quotes", () => {
    const q = translatePubmedQuery({
      query: "kidney allograft",
      mode: "simple",
      fieldTag: "[tiab]",
    });
    expect(q).toBe("kidney[tiab] allograft[tiab]");
  });
});
