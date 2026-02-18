const GRAPH_HOVER_CARD_CLASS_PREFIX = "graph-hover-card-pos-";
const GRAPH_HOVER_CARD_POSITION_STEP = 12;
const GRAPH_HOVER_CARD_MAX_RULES = 800;

const graphHoverCardRuleCache = new Map<string, string>();
let graphHoverCardStyleSheet: CSSStyleSheet | null = null;
let graphHoverCardStyleElement: HTMLStyleElement | null = null;

export const resetGraphHoverCardStyles = (): void => {
  graphHoverCardRuleCache.clear();
  if (graphHoverCardStyleElement?.parentNode) {
    graphHoverCardStyleElement.parentNode.removeChild(
      graphHoverCardStyleElement,
    );
  }
  graphHoverCardStyleElement = null;
  graphHoverCardStyleSheet = null;
};

const ensureGraphHoverCardStyleSheet = (): CSSStyleSheet | null => {
  if (graphHoverCardStyleSheet) return graphHoverCardStyleSheet;
  if (typeof document === "undefined") return null;

  const styleEl = document.createElement("style");
  styleEl.id = "graph-hover-card-rules";
  document.head.appendChild(styleEl);
  graphHoverCardStyleElement = styleEl;
  graphHoverCardStyleSheet = styleEl.sheet as CSSStyleSheet | null;
  return graphHoverCardStyleSheet;
};

export const ensureGraphHoverCardPositionClass = (
  left: number,
  top: number,
): string => {
  const roundedLeft =
    Math.round(left / GRAPH_HOVER_CARD_POSITION_STEP) *
    GRAPH_HOVER_CARD_POSITION_STEP;
  const roundedTop =
    Math.round(top / GRAPH_HOVER_CARD_POSITION_STEP) *
    GRAPH_HOVER_CARD_POSITION_STEP;
  const key = `${roundedLeft}:${roundedTop}`;
  const cachedClassName = graphHoverCardRuleCache.get(key);
  if (cachedClassName) return cachedClassName;

  if (graphHoverCardRuleCache.size >= GRAPH_HOVER_CARD_MAX_RULES) {
    resetGraphHoverCardStyles();
  }

  const hash = key.split("").reduce((acc, char) => {
    return (acc * 31 + char.charCodeAt(0)) % 2147483647;
  }, 23);
  const className = `${GRAPH_HOVER_CARD_CLASS_PREFIX}${hash.toString(36)}`;
  const styleSheet = ensureGraphHoverCardStyleSheet();

  if (styleSheet) {
    styleSheet.insertRule(
      `.${className}{left:${roundedLeft}px;top:${roundedTop}px;}`,
      styleSheet.cssRules.length,
    );
  }

  graphHoverCardRuleCache.set(key, className);
  return className;
};
