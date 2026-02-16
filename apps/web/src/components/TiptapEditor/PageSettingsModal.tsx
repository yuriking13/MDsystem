import React, { useState, useEffect } from "react";
import type { CitationStyle } from "../../lib/api";
import { STYLE_CONFIGS } from "./TiptapEditor";

export interface PageSettings {
  marginTop: number;
  marginBottom: number;
  marginLeft: number;
  marginRight: number;
  fontSize: number;
  lineHeight: number;
  paragraphIndent: string;
  fontFamily: string;
  textAlign: string;
}

interface PageSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  citationStyle: CitationStyle;
  currentSettings: PageSettings;
  onApply: (settings: PageSettings) => void;
  onApplyStyle: (style: CitationStyle) => void;
}

// Style descriptions for validation
const STYLE_RULES = {
  gost: {
    name: "ГОСТ Р 7.0.5-2008",
    description: "Российский стандарт для научных публикаций",
    rules: [
      "Шрифт: Times New Roman, 12-14pt",
      "Межстрочный интервал: 1.5",
      "Абзацный отступ: 1.25 см",
      "Выравнивание: по ширине",
      "Поля: левое 25мм, правое 10мм, верх/низ 20мм",
      "Нумерация страниц: по центру сверху",
    ],
  },
  "gost-r-7-0-5-2008": {
    name: "ГОСТ Р 7.0.5-2008",
    description: "Российский стандарт для научных публикаций",
    rules: [
      "Шрифт: Times New Roman, 12-14pt",
      "Межстрочный интервал: 1.5",
      "Абзацный отступ: 1.25 см",
      "Выравнивание: по ширине",
      "Поля: левое 25мм, правое 10мм, верх/низ 20мм",
      "Нумерация страниц: по центру сверху",
    ],
  },
  vancouver: {
    name: "Vancouver",
    description: "Международный медицинский стандарт (ICMJE)",
    rules: [
      "Шрифт: Times New Roman, 12pt",
      "Межстрочный интервал: 2.0",
      "Без абзацного отступа",
      "Выравнивание: по левому краю",
      "Поля: 2.5 см со всех сторон",
      "Нумерация страниц: справа сверху",
    ],
  },
  apa: {
    name: "APA 7th Edition",
    description: "Стандарт Американской психологической ассоциации",
    rules: [
      "Шрифт: Times New Roman, 12pt",
      "Межстрочный интервал: 2.0",
      "Абзацный отступ: 1.27 см (0.5 дюйма)",
      "Выравнивание: по левому краю",
      "Поля: 2.54 см (1 дюйм) со всех сторон",
      "Нумерация страниц: справа сверху",
    ],
  },
};

export default function PageSettingsModal({
  isOpen,
  onClose,
  citationStyle,
  currentSettings,
  onApply,
  onApplyStyle,
}: PageSettingsModalProps) {
  const [settings, setSettings] = useState<PageSettings>(currentSettings);
  const [isCustom, setIsCustom] = useState(false);
  const [deviations, setDeviations] = useState<string[]>([]);

  // Update settings when props change
  useEffect(() => {
    setSettings(currentSettings);
  }, [currentSettings]);

  // Check for deviations from style
  useEffect(() => {
    const styleConfig = STYLE_CONFIGS[citationStyle] || STYLE_CONFIGS.gost;
    const newDeviations: string[] = [];

    if (Math.abs(settings.marginTop - styleConfig.marginTop) > 5) {
      newDeviations.push(
        `Верхнее поле: ${settings.marginTop}px (стандарт: ${styleConfig.marginTop}px)`,
      );
    }
    if (Math.abs(settings.marginBottom - styleConfig.marginBottom) > 5) {
      newDeviations.push(
        `Нижнее поле: ${settings.marginBottom}px (стандарт: ${styleConfig.marginBottom}px)`,
      );
    }
    if (Math.abs(settings.marginLeft - styleConfig.marginLeft) > 5) {
      newDeviations.push(
        `Левое поле: ${settings.marginLeft}px (стандарт: ${styleConfig.marginLeft}px)`,
      );
    }
    if (Math.abs(settings.marginRight - styleConfig.marginRight) > 5) {
      newDeviations.push(
        `Правое поле: ${settings.marginRight}px (стандарт: ${styleConfig.marginRight}px)`,
      );
    }
    if (settings.fontSize !== styleConfig.fontSize) {
      newDeviations.push(
        `Размер шрифта: ${settings.fontSize}pt (стандарт: ${styleConfig.fontSize}pt)`,
      );
    }
    if (Math.abs(settings.lineHeight - styleConfig.lineHeight) > 0.1) {
      newDeviations.push(
        `Интервал: ${settings.lineHeight} (стандарт: ${styleConfig.lineHeight})`,
      );
    }
    if (settings.textAlign !== styleConfig.textAlign) {
      const alignNames: Record<string, string> = {
        left: "по левому краю",
        right: "по правому краю",
        center: "по центру",
        justify: "по ширине",
      };
      newDeviations.push(
        `Выравнивание: ${alignNames[settings.textAlign] || settings.textAlign} (стандарт: ${alignNames[styleConfig.textAlign] || styleConfig.textAlign})`,
      );
    }

    setDeviations(newDeviations);
    setIsCustom(newDeviations.length > 0);
  }, [settings, citationStyle]);

  // Apply style preset
  const applyStylePreset = (style: CitationStyle) => {
    const styleConfig = STYLE_CONFIGS[style] || STYLE_CONFIGS.gost;
    const newSettings: PageSettings = {
      marginTop: styleConfig.marginTop,
      marginBottom: styleConfig.marginBottom,
      marginLeft: styleConfig.marginLeft,
      marginRight: styleConfig.marginRight,
      fontSize: styleConfig.fontSize,
      lineHeight: styleConfig.lineHeight,
      paragraphIndent: styleConfig.paragraphIndent,
      fontFamily: styleConfig.fontFamily,
      textAlign: styleConfig.textAlign,
    };
    setSettings(newSettings);
    onApplyStyle(style);
  };

  // Handle apply
  const handleApply = () => {
    onApply(settings);
    onClose();
  };

  // Reset to style defaults
  const resetToDefault = () => {
    applyStylePreset(citationStyle);
  };

  if (!isOpen) return null;

  const styleRule = STYLE_RULES[citationStyle] || STYLE_RULES.gost;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-content page-settings-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h3 className="modal-title">⚙️ Настройки страницы</h3>
          <button className="modal-close" onClick={onClose}>
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
        <div className="modal-body">
          {/* Style Presets */}
          <div className="page-settings-section">
            <label className="page-settings-section-title">
              Стиль оформления
            </label>
            <div className="row gap page-settings-style-options">
              {(["gost", "vancouver", "apa"] as CitationStyle[]).map(
                (style) => (
                  <button
                    key={style}
                    className={`btn ${citationStyle === style ? "" : "secondary"} page-settings-style-btn`}
                    onClick={() => applyStylePreset(style)}
                    type="button"
                  >
                    {(STYLE_RULES[style] || STYLE_RULES.gost).name}
                  </button>
                ),
              )}
            </div>
          </div>

          {/* Style Description */}
          <div className="card page-settings-style-card">
            <div className="page-settings-style-name">{styleRule.name}</div>
            <div className="page-settings-style-description">
              {styleRule.description}
            </div>
            <ul className="page-settings-style-rules">
              {styleRule.rules.map((rule, i) => (
                <li key={i}>{rule}</li>
              ))}
            </ul>
          </div>

          {/* Deviation Warning */}
          {isCustom && deviations.length > 0 && (
            <div className="alert page-settings-warning">
              <div className="page-settings-warning-title">
                ⚠️ Отклонения от стандарта {styleRule.name}
              </div>
              <ul className="page-settings-warning-list">
                {deviations.map((dev, i) => (
                  <li key={i}>{dev}</li>
                ))}
              </ul>
              <button
                className="btn secondary page-settings-warning-reset-btn"
                onClick={resetToDefault}
                type="button"
              >
                Восстановить стандартные настройки
              </button>
            </div>
          )}

          {/* Settings Grid */}
          <div className="page-settings-grid">
            {/* Margins */}
            <div className="card page-settings-panel">
              <h4 className="page-settings-panel-title">Поля страницы (px)</h4>
              <div className="page-settings-panel-grid">
                <label className="stack">
                  <span className="page-settings-form-label">Сверху</span>
                  <input
                    type="number"
                    value={settings.marginTop}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        marginTop: Number(e.target.value),
                      })
                    }
                    className="page-settings-input"
                  />
                </label>
                <label className="stack">
                  <span className="page-settings-form-label">Снизу</span>
                  <input
                    type="number"
                    value={settings.marginBottom}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        marginBottom: Number(e.target.value),
                      })
                    }
                    className="page-settings-input"
                  />
                </label>
                <label className="stack">
                  <span className="page-settings-form-label">Слева</span>
                  <input
                    type="number"
                    value={settings.marginLeft}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        marginLeft: Number(e.target.value),
                      })
                    }
                    className="page-settings-input"
                  />
                </label>
                <label className="stack">
                  <span className="page-settings-form-label">Справа</span>
                  <input
                    type="number"
                    value={settings.marginRight}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        marginRight: Number(e.target.value),
                      })
                    }
                    className="page-settings-input"
                  />
                </label>
              </div>
            </div>

            {/* Typography */}
            <div className="card page-settings-panel">
              <h4 className="page-settings-panel-title">Типографика</h4>
              <div className="page-settings-panel-grid">
                <label className="stack">
                  <span className="page-settings-form-label">
                    Размер шрифта (pt)
                  </span>
                  <select
                    value={settings.fontSize}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        fontSize: Number(e.target.value),
                      })
                    }
                    className="page-settings-input"
                  >
                    {[10, 11, 12, 13, 14, 16, 18].map((size) => (
                      <option key={size} value={size}>
                        {size} pt
                      </option>
                    ))}
                  </select>
                </label>
                <label className="stack">
                  <span className="page-settings-form-label">
                    Межстрочный интервал
                  </span>
                  <select
                    value={settings.lineHeight}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        lineHeight: Number(e.target.value),
                      })
                    }
                    className="page-settings-input"
                  >
                    {[1.0, 1.15, 1.5, 1.75, 2.0, 2.5].map((lh) => (
                      <option key={lh} value={lh}>
                        {lh}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="stack page-settings-full-width">
                  <span className="page-settings-form-label">
                    Отступ первой строки
                  </span>
                  <select
                    value={settings.paragraphIndent}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        paragraphIndent: e.target.value,
                      })
                    }
                    className="page-settings-input"
                  >
                    <option value="0">Без отступа</option>
                    <option value="1cm">1 см</option>
                    <option value="1.25cm">1.25 см (ГОСТ)</option>
                    <option value="1.27cm">1.27 см (APA)</option>
                    <option value="1.5cm">1.5 см</option>
                  </select>
                </label>
                <label className="stack page-settings-full-width">
                  <span className="page-settings-form-label">
                    Выравнивание текста
                  </span>
                  <select
                    value={settings.textAlign}
                    onChange={(e) =>
                      setSettings({ ...settings, textAlign: e.target.value })
                    }
                    className="page-settings-input"
                  >
                    <option value="left">По левому краю</option>
                    <option value="right">По правому краю</option>
                    <option value="center">По центру</option>
                    <option value="justify">По ширине</option>
                  </select>
                </label>
              </div>
            </div>
          </div>
        </div>
        {/* Actions */}
        <div className="modal-footer">
          <button className="btn-secondary" onClick={resetToDefault}>
            По умолчанию
          </button>
          <button className="btn-secondary" onClick={onClose}>
            Отмена
          </button>
          <button className="btn-primary" onClick={handleApply}>
            Применить
          </button>
        </div>
      </div>
    </div>
  );
}
