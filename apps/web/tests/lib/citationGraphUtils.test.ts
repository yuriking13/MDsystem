import { beforeEach, describe, expect, it } from "vitest";
import {
  CLUSTER_COLORS,
  CLUSTER_COLORS_PASTEL,
  adjustBrightness,
  formatTime,
  getClusterColor,
  getClusterColors,
  getGraphBackgroundColors,
  getGraphNodeColors,
  getLevelColor,
  getLevelName,
  isLightTheme,
  truncateText,
} from "../../src/components/CitationGraph/utils";

const GRAPH_NODE_VARS = [
  "--graph-node-citing",
  "--graph-node-selected",
  "--graph-node-excluded",
  "--graph-node-candidate-pubmed",
  "--graph-node-candidate-doaj",
  "--graph-node-candidate-wiley",
  "--graph-node-reference",
  "--graph-node-related",
  "--graph-node-ai-found",
  "--graph-node-pvalue",
  "--graph-node-default",
  "--graph-cluster-default",
  "--graph-bg",
  "--graph-bg-fullscreen",
  "--graph-link-color",
] as const;

describe("CitationGraph utils", () => {
  beforeEach(() => {
    document.body.classList.remove("light-theme");
    for (const variable of GRAPH_NODE_VARS) {
      document.documentElement.style.removeProperty(variable);
    }
  });

  it("formats seconds as mm:ss", () => {
    expect(formatTime(0)).toBe("00:00");
    expect(formatTime(9)).toBe("00:09");
    expect(formatTime(125)).toBe("02:05");
  });

  it("adjusts brightness for hex and rgb colors", () => {
    expect(adjustBrightness("#112233", 10)).toBe("rgb(19, 37, 56)");
    expect(adjustBrightness("rgb(10, 20, 30)", 20)).toBe("rgb(12, 24, 36)");
    expect(adjustBrightness("invalid", 20)).toBe("invalid");
  });

  it("uses CSS variables for graph node colors when available", () => {
    document.documentElement.style.setProperty(
      "--graph-node-citing",
      "#0ea5e9",
    );
    document.documentElement.style.setProperty(
      "--graph-node-candidate-pubmed",
      "#3b82f6",
    );
    document.documentElement.style.setProperty(
      "--graph-node-reference",
      "#38bdf8",
    );
    document.documentElement.style.setProperty(
      "--graph-node-related",
      "#14b8a6",
    );

    const colors = getGraphNodeColors();
    expect(colors.citing).toBe("#0ea5e9");
    expect(colors.candidatePubmed).toBe("#3b82f6");
    expect(colors.reference).toBe("#38bdf8");
    expect(colors.related).toBe("#14b8a6");
  });

  it("falls back to defaults when graph CSS variables are absent", () => {
    const colors = getGraphNodeColors();
    expect(colors.citing).toBe("#ec4899");
    expect(colors.candidatePubmed).toBe("#3b82f6");
    expect(colors.reference).toBe("#f97316");
    expect(colors.related).toBe("#06b6d4");
  });

  it("returns graph background tokens from CSS variables", () => {
    document.documentElement.style.setProperty("--graph-bg", "#f8fbff");
    document.documentElement.style.setProperty(
      "--graph-bg-fullscreen",
      "#f1f6ff",
    );
    document.documentElement.style.setProperty(
      "--graph-link-color",
      "rgba(37, 99, 235, 0.22)",
    );

    const background = getGraphBackgroundColors();
    expect(background.normal).toBe("#f8fbff");
    expect(background.fullscreen).toBe("#f1f6ff");
    expect(background.linkColor).toBe("rgba(37, 99, 235, 0.22)");
  });

  it("maps graph level labels and level colors", () => {
    document.documentElement.style.setProperty(
      "--graph-node-citing",
      "#0ea5e9",
    );
    document.documentElement.style.setProperty(
      "--graph-node-candidate-pubmed",
      "#3b82f6",
    );
    document.documentElement.style.setProperty(
      "--graph-node-reference",
      "#38bdf8",
    );
    document.documentElement.style.setProperty(
      "--graph-node-related",
      "#14b8a6",
    );
    document.documentElement.style.setProperty(
      "--graph-node-default",
      "#94a3b8",
    );

    expect(getLevelName(0)).toBe("Цитирует статью из базы");
    expect(getLevelName(1)).toBe("В проекте");
    expect(getLevelName(2)).toBe("Ссылка (reference)");
    expect(getLevelName(3)).toBe("Связанная работа");
    expect(getLevelName(10)).toBe("Уровень 10");

    expect(getLevelColor(0)).toBe("#0ea5e9");
    expect(getLevelColor(1)).toBe("#3b82f6");
    expect(getLevelColor(2)).toBe("#38bdf8");
    expect(getLevelColor(3)).toBe("#14b8a6");
    expect(getLevelColor(99)).toBe("#94a3b8");
  });

  it("switches cluster palette by light-theme body class", () => {
    expect(isLightTheme()).toBe(false);
    expect(getClusterColors()).toEqual(CLUSTER_COLORS);

    document.body.classList.add("light-theme");

    expect(isLightTheme()).toBe(true);
    expect(getClusterColors()).toEqual(CLUSTER_COLORS_PASTEL);
    expect(getClusterColor(0)).toBe(CLUSTER_COLORS_PASTEL[0]);
    expect(getClusterColor(11)).toBe(
      CLUSTER_COLORS_PASTEL[11 % CLUSTER_COLORS_PASTEL.length],
    );
  });

  it("truncates long text with ellipsis and preserves short text", () => {
    expect(truncateText("Короткий текст", 20)).toBe("Короткий текст");
    expect(truncateText("Очень длинный текст для обрезки", 12)).toBe(
      "Очень дли...",
    );
  });
});
