import { describe, expect, it } from "vitest";
import { getInlineStyleValue } from "../../src/components/TiptapEditor/extensions/inlineStyleUtils";

describe("getInlineStyleValue", () => {
  it("returns null when style attribute is missing", () => {
    const el = document.createElement("div");
    expect(getInlineStyleValue(el, "font-size")).toBeNull();
  });

  it("extracts style value by exact property", () => {
    const el = document.createElement("div");
    el.setAttribute("style", "font-size: 14px; color: #334155;");
    expect(getInlineStyleValue(el, "font-size")).toBe("14px");
    expect(getInlineStyleValue(el, "color")).toBe("#334155");
  });

  it("matches property name case-insensitively", () => {
    const el = document.createElement("div");
    el.setAttribute("style", "TEXT-ALIGN: center; background-color: #fff;");
    expect(getInlineStyleValue(el, "text-align")).toBe("center");
    expect(getInlineStyleValue(el, "BACKGROUND-COLOR")).toBe("#fff");
  });

  it("returns full declaration value when it contains colons", () => {
    const el = document.createElement("div");
    el.setAttribute(
      "style",
      "background-image: linear-gradient(90deg, #111 0%, #eee 100%);",
    );
    expect(getInlineStyleValue(el, "background-image")).toContain(
      "linear-gradient",
    );
  });

  it("returns null for missing property", () => {
    const el = document.createElement("div");
    el.setAttribute("style", "font-size: 16px;");
    expect(getInlineStyleValue(el, "line-height")).toBeNull();
  });
});
