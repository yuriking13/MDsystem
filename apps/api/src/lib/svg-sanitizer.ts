import { XMLValidator } from "fast-xml-parser";

const MAX_SVG_LENGTH = 250000;

const DISALLOWED_TAGS = [
  "script",
  "foreignObject",
  "iframe",
  "object",
  "embed",
  "link",
  "meta",
  "style",
  "image",
  "img",
  "audio",
  "video",
];

const ALLOWED_TAGS = new Set([
  "svg",
  "g",
  "defs",
  "symbol",
  "use",
  "title",
  "desc",
  "rect",
  "circle",
  "ellipse",
  "line",
  "polyline",
  "polygon",
  "path",
  "text",
  "tspan",
  "textPath",
  "linearGradient",
  "radialGradient",
  "stop",
  "clipPath",
  "mask",
  "pattern",
  "marker",
]);

const EVENT_HANDLER_ATTR_RE =
  /\s+on[a-z0-9:_-]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi;
const STYLE_ATTR_RE = /\s+style\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi;
const HREF_ATTR_RE =
  /\s+(xlink:href|href)\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi;
const DANGEROUS_PROTOCOL_RE = /(?:javascript|vbscript|data):/i;

export type SvgSanitizationResult =
  | {
      ok: true;
      sanitizedSvg: string;
    }
  | {
      ok: false;
      reason: string;
    };

function stripWrappingNoise(svgCode: string): string {
  let normalized = svgCode.trim();
  normalized = normalized.replace(/^\uFEFF/, "");
  normalized = normalized.replace(/<\?xml[\s\S]*?\?>/gi, "");
  normalized = normalized.replace(/<!DOCTYPE[\s\S]*?>/gi, "");
  normalized = normalized.replace(/<!--([\s\S]*?)-->/g, "");
  return normalized.trim();
}

function stripQuotes(value: string): string {
  if (value.length >= 2) {
    const first = value[0];
    const last = value[value.length - 1];
    if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
      return value.slice(1, -1);
    }
  }
  return value;
}

function removeDisallowedTags(svgCode: string): string {
  let sanitized = svgCode;
  for (const tag of DISALLOWED_TAGS) {
    const blockRe = new RegExp(`<${tag}\\b[\\s\\S]*?<\\/${tag}>`, "gi");
    const selfClosingRe = new RegExp(`<${tag}\\b[^>]*\\/?>`, "gi");
    sanitized = sanitized.replace(blockRe, "");
    sanitized = sanitized.replace(selfClosingRe, "");
  }
  return sanitized;
}

function validateAllowedTags(svgCode: string): SvgSanitizationResult {
  const tagRe = /<\/?\s*([a-zA-Z][\w:-]*)\b/g;
  for (const match of svgCode.matchAll(tagRe)) {
    const tagWithNs = match[1] || "";
    const tag = tagWithNs.includes(":")
      ? tagWithNs.split(":").pop() || tagWithNs
      : tagWithNs;

    if (!ALLOWED_TAGS.has(tag)) {
      return {
        ok: false,
        reason: `Disallowed SVG tag: ${tag}`,
      };
    }
  }

  return { ok: true, sanitizedSvg: svgCode };
}

function ensureSvgRoot(svgCode: string): SvgSanitizationResult {
  const openTagCount = (svgCode.match(/<svg\b/gi) || []).length;
  const closeTagCount = (svgCode.match(/<\/svg>/gi) || []).length;

  if (openTagCount !== 1 || closeTagCount !== 1) {
    return {
      ok: false,
      reason: "SVG must contain a single root <svg> element",
    };
  }

  if (!/^\s*<svg\b[\s\S]*<\/svg>\s*$/i.test(svgCode)) {
    return {
      ok: false,
      reason: "Input is not a standalone SVG document",
    };
  }

  return { ok: true, sanitizedSvg: svgCode };
}

export function sanitizeAndValidateSvg(svgCode: string): SvgSanitizationResult {
  if (!svgCode || typeof svgCode !== "string") {
    return { ok: false, reason: "SVG payload is empty" };
  }

  if (svgCode.length > MAX_SVG_LENGTH) {
    return {
      ok: false,
      reason: `SVG payload exceeds max length (${MAX_SVG_LENGTH})`,
    };
  }

  let sanitized = stripWrappingNoise(svgCode);
  sanitized = removeDisallowedTags(sanitized);
  sanitized = sanitized.replace(EVENT_HANDLER_ATTR_RE, "");
  sanitized = sanitized.replace(STYLE_ATTR_RE, "");
  sanitized = sanitized.replace(
    HREF_ATTR_RE,
    (_fullMatch: string, attrName: string, rawValue: string) => {
      const value = stripQuotes(rawValue).trim();
      if (value.startsWith("#")) {
        return ` ${attrName}="${value}"`;
      }
      return "";
    },
  );

  if (DANGEROUS_PROTOCOL_RE.test(sanitized)) {
    return {
      ok: false,
      reason: "SVG contains disallowed URL protocol",
    };
  }

  const rootCheck = ensureSvgRoot(sanitized);
  if (!rootCheck.ok) {
    return rootCheck;
  }

  const tagCheck = validateAllowedTags(sanitized);
  if (!tagCheck.ok) {
    return tagCheck;
  }

  const xmlValidation = XMLValidator.validate(sanitized);
  if (xmlValidation !== true) {
    return {
      ok: false,
      reason:
        typeof xmlValidation === "object" &&
        xmlValidation !== null &&
        "err" in xmlValidation
          ? String((xmlValidation.err as { msg?: string }).msg || "Invalid XML")
          : "Invalid SVG XML",
    };
  }

  return { ok: true, sanitizedSvg: sanitized };
}
