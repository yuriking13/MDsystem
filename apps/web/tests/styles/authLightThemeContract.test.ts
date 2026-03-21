import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const legacyCss = readFileSync(
  resolve(process.cwd(), "src/styles/legacy.css"),
  "utf8",
);

describe("auth page light-theme visual contract", () => {
  it("keeps auth feature and card accent gradients on teal palette", () => {
    expect(legacyCss).toMatch(
      /\.light-theme \.auth-feature::before\s*\{[\s\S]*?background:\s*linear-gradient\(180deg,\s*#006761,\s*#0D9488\);/,
    );
    expect(legacyCss).toMatch(
      /\.light-theme \.auth-form-card::before\s*\{[\s\S]*?background:\s*linear-gradient\(135deg,\s*#006761,\s*#0D9488\);/,
    );
    expect(legacyCss).toMatch(
      /\.light-theme \.auth-submit\s*\{[\s\S]*?background:\s*linear-gradient\(135deg,\s*#006761,\s*#0D9488\);/,
    );
  });

  it("keeps auth typography and icon accents in updated teal-neutral values", () => {
    expect(legacyCss).toMatch(
      /\.light-theme \.auth-title\s*\{[\s\S]*?color:\s*#005550;/,
    );
    expect(legacyCss).toMatch(
      /\.light-theme \.auth-link\s*\{[\s\S]*?color:\s*#475569;/,
    );
    expect(legacyCss).toMatch(
      /\.light-theme \.auth-logo-icon\s*\{[\s\S]*?color:\s*#64748B;/,
    );
    expect(legacyCss).toMatch(
      /\.light-theme \.auth-feature-icon\s*\{[\s\S]*?color:\s*#006761;/,
    );
  });

  it("keeps auth input focus and hover states on teal focus/border shadows", () => {
    expect(legacyCss).toMatch(
      /\.light-theme \.auth-field input:focus\s*\{[\s\S]*?border-color:\s*rgba\(0, 103, 97,\s*0\.7\);/,
    );
    expect(legacyCss).toMatch(
      /\.light-theme \.auth-field input:focus\s*\{[\s\S]*?0 0 0 4px rgba\(0, 103, 97,\s*0\.2\),/,
    );
    expect(legacyCss).toMatch(
      /\.light-theme \.auth-feature:hover\s*\{[\s\S]*?border-color:\s*rgba\(0, 103, 97,\s*0\.55\);/,
    );
  });
});
