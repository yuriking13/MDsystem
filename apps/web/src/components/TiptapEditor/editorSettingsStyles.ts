export type EditorTypographySettings = {
  fontSize: number;
  lineHeight: number;
  paragraphIndent: string;
  fontFamily: string;
  textAlign: string;
};

const EDITOR_SETTINGS_CLASS_PREFIX = "tiptap-editor-settings-";
const editorSettingsClassCache = new Map<string, string>();
let editorSettingsStyleSheet: CSSStyleSheet | null = null;

const getEditorSettingsCacheKey = (settings: EditorTypographySettings) =>
  JSON.stringify(settings);

const getEditorSettingsClassName = (settings: EditorTypographySettings) => {
  const key = getEditorSettingsCacheKey(settings);
  const cached = editorSettingsClassCache.get(key);
  if (cached) return cached;

  const hash = Array.from(key).reduce((acc, char) => {
    return (acc * 31 + char.charCodeAt(0)) % 1000000007;
  }, 7);
  const className = `${EDITOR_SETTINGS_CLASS_PREFIX}${hash.toString(36)}`;
  editorSettingsClassCache.set(key, className);
  return className;
};

const ensureEditorSettingsStyleSheet = (): CSSStyleSheet | null => {
  if (editorSettingsStyleSheet) return editorSettingsStyleSheet;
  if (typeof document === "undefined") return null;

  const styleEl = document.createElement("style");
  styleEl.id = "tiptap-editor-settings-rules";
  document.head.appendChild(styleEl);
  editorSettingsStyleSheet = styleEl.sheet as CSSStyleSheet | null;
  return editorSettingsStyleSheet;
};

const ensureEditorSettingsClass = (settings: EditorTypographySettings) => {
  const className = getEditorSettingsClassName(settings);
  const styleSheet = ensureEditorSettingsStyleSheet();
  if (!styleSheet) return className;

  const hasRule = Array.from(styleSheet.cssRules).some(
    (rule) =>
      rule instanceof CSSStyleRule &&
      rule.selectorText === `.tiptap-editor-wrapper.${className}`,
  );
  if (hasRule) return className;

  styleSheet.insertRule(
    `.tiptap-editor-wrapper.${className}{--editor-font-size:${settings.fontSize}pt;--editor-line-height:${settings.lineHeight};--editor-paragraph-indent:${settings.paragraphIndent};--editor-font-family:${settings.fontFamily};--editor-text-align:${settings.textAlign};}`,
    styleSheet.cssRules.length,
  );

  return className;
};

export function applyEditorSettingsClass(
  wrapper: HTMLElement,
  settings: EditorTypographySettings,
): void {
  const settingsClass = ensureEditorSettingsClass(settings);
  const previousSettingsClass = Array.from(wrapper.classList).find(
    (className) => className.startsWith(EDITOR_SETTINGS_CLASS_PREFIX),
  );
  if (previousSettingsClass && previousSettingsClass !== settingsClass) {
    wrapper.classList.remove(previousSettingsClass);
  }
  wrapper.classList.add(settingsClass);
}
