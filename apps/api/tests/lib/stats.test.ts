import { describe, it, expect } from "vitest";
import {
  extractStats,
  hasAnyStats,
  calculateStatsQuality,
  extractStatsEnhanced,
  type ExtractedStats,
} from "../../src/lib/stats.js";

describe("extractStats", () => {
  describe("p-values", () => {
    it("should extract p < 0.05", () => {
      const result = extractStats("The result was significant (p < 0.05).");
      expect(result.pValues).toHaveLength(1);
      expect(result.pValues[0].operator).toBe("<");
      expect(result.pValues[0].value).toBe(0.05);
    });

    it("should extract p = 0.001", () => {
      const result = extractStats("We found p = 0.001 for the main effect.");
      expect(result.pValues).toHaveLength(1);
      expect(result.pValues[0].operator).toBe("=");
      expect(result.pValues[0].value).toBe(0.001);
    });

    it("should extract P ≤ 0.01", () => {
      const result = extractStats("Statistical significance was P ≤ 0.01");
      expect(result.pValues).toHaveLength(1);
      expect(result.pValues[0].operator).toBe("≤");
      expect(result.pValues[0].value).toBe(0.01);
    });

    it("should extract multiple p-values", () => {
      const result = extractStats(
        "Main effect p < 0.001, interaction p = 0.03",
      );
      expect(result.pValues).toHaveLength(2);
    });

    it("should extract scientific notation p-values", () => {
      const result = extractStats("p = 1e-5 for the comparison");
      expect(result.pValues).toHaveLength(1);
      expect(result.pValues[0].value).toBe(0.00001);
    });
  });

  describe("t-tests", () => {
    it("should extract t(df) = value", () => {
      const result = extractStats("t(45) = 2.31, p = 0.025");
      expect(result.tTests).toHaveLength(1);
      expect(result.tTests[0].df).toBe(45);
      expect(result.tTests[0].value).toBe(2.31);
    });

    it("should extract negative t-values", () => {
      const result = extractStats("t(100) = -3.45");
      expect(result.tTests).toHaveLength(1);
      expect(result.tTests[0].value).toBe(-3.45);
    });
  });

  describe("confidence intervals", () => {
    it("should extract 95% CI with range", () => {
      const result = extractStats("OR = 1.5 (95% CI 1.2-2.3)");
      expect(result.confidenceIntervals).toHaveLength(1);
      expect(result.confidenceIntervals[0].level).toBe(95);
      expect(result.confidenceIntervals[0].low).toBe(1.2);
      expect(result.confidenceIntervals[0].high).toBe(2.3);
    });

    it("should extract CI 95% format", () => {
      const result = extractStats("Risk ratio 95% CI 0.8-1.1");
      expect(result.confidenceIntervals).toHaveLength(1);
    });
  });

  describe("effects", () => {
    it("should extract OR values", () => {
      const result = extractStats("The odds ratio OR = 2.5");
      expect(result.effects).toHaveLength(1);
      expect(result.effects[0].type).toBe("OR");
      expect(result.effects[0].value).toBe(2.5);
    });

    it("should extract RR values", () => {
      const result = extractStats("RR: 0.75 for the treatment group");
      expect(result.effects).toHaveLength(1);
      expect(result.effects[0].type).toBe("RR");
      expect(result.effects[0].value).toBe(0.75);
    });

    it("should extract HR values", () => {
      const result = extractStats("Hazard ratio HR = 1.30");
      expect(result.effects).toHaveLength(1);
      expect(result.effects[0].type).toBe("HR");
      expect(result.effects[0].value).toBe(1.3);
    });
  });

  describe("edge cases", () => {
    it("should handle null input", () => {
      const result = extractStats(null);
      expect(result.pValues).toEqual([]);
      expect(result.tTests).toEqual([]);
      expect(result.confidenceIntervals).toEqual([]);
      expect(result.effects).toEqual([]);
    });

    it("should handle undefined input", () => {
      const result = extractStats(undefined);
      expect(hasAnyStats(result)).toBe(false);
    });

    it("should handle empty string", () => {
      const result = extractStats("");
      expect(hasAnyStats(result)).toBe(false);
    });

    it("should handle text without statistics", () => {
      const result = extractStats(
        "This is a regular text without any statistical values.",
      );
      expect(hasAnyStats(result)).toBe(false);
    });
  });
});

describe("hasAnyStats", () => {
  it("should return true when p-values present", () => {
    const stats: ExtractedStats = {
      pValues: [{ raw: "p < 0.05", operator: "<", value: 0.05 }],
      tTests: [],
      confidenceIntervals: [],
      effects: [],
    };
    expect(hasAnyStats(stats)).toBe(true);
  });

  it("should return true when t-tests present", () => {
    const stats: ExtractedStats = {
      pValues: [],
      tTests: [{ raw: "t(10)=2.0", df: 10, value: 2.0 }],
      confidenceIntervals: [],
      effects: [],
    };
    expect(hasAnyStats(stats)).toBe(true);
  });

  it("should return true when CI present", () => {
    const stats: ExtractedStats = {
      pValues: [],
      tTests: [],
      confidenceIntervals: [
        { raw: "95% CI 1.0-2.0", level: 95, low: 1.0, high: 2.0 },
      ],
      effects: [],
    };
    expect(hasAnyStats(stats)).toBe(true);
  });

  it("should return true when effects present", () => {
    const stats: ExtractedStats = {
      pValues: [],
      tTests: [],
      confidenceIntervals: [],
      effects: [{ raw: "OR=1.5", type: "OR", value: 1.5 }],
    };
    expect(hasAnyStats(stats)).toBe(true);
  });

  it("should return false when all arrays empty", () => {
    const stats: ExtractedStats = {
      pValues: [],
      tTests: [],
      confidenceIntervals: [],
      effects: [],
    };
    expect(hasAnyStats(stats)).toBe(false);
  });
});

describe("calculateStatsQuality", () => {
  it("should return 3 for p < 0.001", () => {
    const stats = extractStats("p < 0.0001");
    // p < 0.001 returns quality 3
    expect(calculateStatsQuality(stats)).toBe(3);
  });

  it("should return 2 for p < 0.01", () => {
    const stats = extractStats("p = 0.005");
    expect(calculateStatsQuality(stats)).toBe(2);
  });

  it("should return 1 for p < 0.05", () => {
    const stats = extractStats("p = 0.03");
    expect(calculateStatsQuality(stats)).toBe(1);
  });

  it("should return 0 for p >= 0.05", () => {
    const stats = extractStats("p = 0.10");
    expect(calculateStatsQuality(stats)).toBe(0);
  });

  it("should return 0 for no stats", () => {
    const stats = extractStats("No statistical values here");
    expect(calculateStatsQuality(stats)).toBe(0);
  });

  it("should return highest quality when multiple p-values", () => {
    const stats = extractStats("Effect 1: p = 0.04, Effect 2: p < 0.0001");
    expect(calculateStatsQuality(stats)).toBe(3);
  });
});

describe("extractStatsEnhanced", () => {
  it("should find F-statistics", () => {
    const result = extractStatsEnhanced("F(2, 120) = 5.67, p < 0.01");
    expect(result.additionalFindings).toContain("F(2, 120) = 5.67");
  });

  it("should find chi-square values", () => {
    const result = extractStatsEnhanced("χ² = 15.3, df = 2");
    expect(result.additionalFindings.some((f) => f.includes("χ²"))).toBe(true);
  });

  it("should find correlation coefficients", () => {
    const result = extractStatsEnhanced("r = 0.45, p < 0.05");
    expect(result.additionalFindings.some((f) => f.includes("r ="))).toBe(true);
  });

  it("should find sample sizes", () => {
    const result = extractStatsEnhanced("n = 150 participants");
    expect(result.additionalFindings.some((f) => f.includes("n ="))).toBe(true);
  });

  it("should find mean ± SD", () => {
    const result = extractStatsEnhanced("Mean age was 45.2 ± 12.3 years");
    expect(result.additionalFindings.some((f) => f.includes("±"))).toBe(true);
  });

  it("should find statistical significance phrases", () => {
    const result = extractStatsEnhanced(
      "The difference was statistically significant",
    );
    expect(
      result.additionalFindings.some((f) =>
        f.toLowerCase().includes("statistically significant"),
      ),
    ).toBe(true);
  });

  it('should find "no significant difference" phrases', () => {
    const result = extractStatsEnhanced(
      "There was no significant difference between groups",
    );
    expect(
      result.additionalFindings.some((f) =>
        f.toLowerCase().includes("no significant difference"),
      ),
    ).toBe(true);
  });
});
