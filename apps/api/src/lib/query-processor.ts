import { z } from "zod";

export type SearchMode = "simple" | "advanced";

export const SearchModeSchema = z.enum(["simple", "advanced"]);

const BOOLEAN_OPERATORS = ["AND", "OR", "NOT"] as const;

function normalizeSpaces(input: string): string {
  return input.replace(/\s+/g, " ").trim();
}

function tokenizeSimple(query: string): string[] {
  const tokens: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < query.length; i++) {
    const ch = query[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
      current += ch;
      continue;
    }
    if (!inQuotes && (ch === "(" || ch === ")")) {
      if (current.trim()) tokens.push(current.trim());
      tokens.push(ch);
      current = "";
      continue;
    }
    if (!inQuotes && /\s/.test(ch)) {
      if (current.trim()) tokens.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  if (current.trim()) tokens.push(current.trim());
  return tokens;
}

export function lintQuery(query: string): {
  warnings: string[];
  hasUnbalancedQuotes: boolean;
} {
  const warnings: string[] = [];
  const normalized = normalizeSpaces(query);

  // simple balance check for quotes and parentheses
  const quoteCount = (normalized.match(/"/g) || []).length;
  const hasUnbalancedQuotes = quoteCount % 2 !== 0;
  if (hasUnbalancedQuotes) warnings.push("Незакрытые кавычки");

  let balance = 0;
  for (const ch of normalized) {
    if (ch === "(") balance++;
    if (ch === ")") balance--;
    if (balance < 0) {
      warnings.push("Лишняя закрывающая скобка");
      break;
    }
  }
  if (balance > 0) warnings.push("Незакрытые скобки");

  return { warnings, hasUnbalancedQuotes };
}

function applyFieldTag(term: string, tag: string): string {
  if (!tag) return term;
  return `${term}${tag}`;
}

function stripOuterParens(value: string): string {
  const trimmed = value.trim();
  if (trimmed.startsWith("(") && trimmed.endsWith(")")) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function stripOuterQuotes(value: string): string {
  const trimmed = value.trim();
  if (trimmed.startsWith('"') && trimmed.endsWith('"') && trimmed.length >= 2) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

export function translatePubmedQuery(args: {
  query: string;
  mode: SearchMode;
  fieldTag: string;
}): string {
  const { query, mode, fieldTag } = args;
  if (mode === "advanced") {
    return normalizeSpaces(query);
  }

  const tokens = tokenizeSimple(query);
  const parts: string[] = [];

  for (const token of tokens) {
    if (token === "(" || token === ")") {
      parts.push(token);
      continue;
    }
    if (
      BOOLEAN_OPERATORS.includes(
        token.toUpperCase() as (typeof BOOLEAN_OPERATORS)[number],
      )
    ) {
      parts.push(token.toUpperCase());
      continue;
    }

    const isQuoted = token.startsWith('"') && token.endsWith('"');
    const cleaned = isQuoted
      ? stripOuterQuotes(stripOuterParens(token))
      : stripOuterParens(token);
    const tagged = isQuoted
      ? `"${cleaned}"${fieldTag}`
      : applyFieldTag(cleaned, fieldTag);
    parts.push(tagged);
  }

  const joined = parts.join(" ").trim();
  const trimmedParens = stripOuterParens(joined);
  return trimmedParens.trim();
}
