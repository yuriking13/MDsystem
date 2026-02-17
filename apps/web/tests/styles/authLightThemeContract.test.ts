import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const legacyCss = readFileSync(
  resolve(process.cwd(), "src/styles/legacy.css"),
  "utf8",
);

describe("auth page light-theme visual contract", () => {
  it("keeps auth feature and card accent gradients on blue palette", () => {
    expect(legacyCss).toMatch(
      /\.light-theme \.auth-feature::before\s*\{[\s\S]*?background:\s*linear-gradient\(180deg,\s*#2563EB,\s*#3B82F6\);/,
    );
    expect(legacyCss).toMatch(
      /\.light-theme \.auth-form-card::before\s*\{[\s\S]*?background:\s*linear-gradient\(135deg,\s*#2563EB,\s*#3B82F6\);/,
    );
    expect(legacyCss).toMatch(
      /\.light-theme \.auth-submit\s*\{[\s\S]*?background:\s*linear-gradient\(135deg,\s*#2563EB,\s*#3B82F6\);/,
    );
  });

  it("keeps auth typography and icon accents in updated blue-neutral values", () => {
    expect(legacyCss).toMatch(
      /\.light-theme \.auth-title\s*\{[\s\S]*?color:\s*#1D4ED8;/,
    );
    expect(legacyCss).toMatch(
      /\.light-theme \.auth-link\s*\{[\s\S]*?color:\s*#475569;/,
    );
    expect(legacyCss).toMatch(
      /\.light-theme \.auth-logo-icon\s*\{[\s\S]*?color:\s*#64748B;/,
    );
    expect(legacyCss).toMatch(
      /\.light-theme \.auth-feature-icon\s*\{[\s\S]*?color:\s*#2563EB;/,
    );
  });

  it("keeps auth input focus and hover states on blue focus/border shadows", () => {
    expect(legacyCss).toMatch(
      /\.light-theme \.auth-field input:focus\s*\{[\s\S]*?border-color:\s*rgba\(37,\s*99,\s*235,\s*0\.7\);/,
    );
    expect(legacyCss).toMatch(
      /\.light-theme \.auth-field input:focus\s*\{[\s\S]*?0 0 0 4px rgba\(37,\s*99,\s*235,\s*0\.2\),/,
    );
    expect(legacyCss).toMatch(
      /\.light-theme \.auth-feature:hover\s*\{[\s\S]*?border-color:\s*rgba\(37,\s*99,\s*235,\s*0\.55\);/,
    );
  });
});
