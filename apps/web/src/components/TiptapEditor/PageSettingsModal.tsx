import React, { useState, useEffect } from 'react';
import type { CitationStyle } from '../../lib/api';
import { STYLE_CONFIGS } from './TiptapEditor';

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
    name: 'ГОСТ Р 7.0.5-2008',
    description: 'Российский стандарт для научных публикаций',
    rules: [
      'Шрифт: Times New Roman, 12-14pt',
      'Межстрочный интервал: 1.5',
      'Абзацный отступ: 1.25 см',
      'Выравнивание: по ширине',
      'Поля: левое 25мм, правое 10мм, верх/низ 20мм',
      'Нумерация страниц: по центру сверху',
    ],
  },
  'gost-r-7-0-5-2008': {
    name: 'ГОСТ Р 7.0.5-2008',
    description: 'Российский стандарт для научных публикаций',
    rules: [
      'Шрифт: Times New Roman, 12-14pt',
      'Межстрочный интервал: 1.5',
      'Абзацный отступ: 1.25 см',
      'Выравнивание: по ширине',
      'Поля: левое 25мм, правое 10мм, верх/низ 20мм',
      'Нумерация страниц: по центру сверху',
    ],
  },
  vancouver: {
    name: 'Vancouver',
    description: 'Международный медицинский стандарт (ICMJE)',
    rules: [
      'Шрифт: Times New Roman, 12pt',
      'Межстрочный интервал: 2.0',
      'Без абзацного отступа',
      'Выравнивание: по левому краю',
      'Поля: 2.5 см со всех сторон',
      'Нумерация страниц: справа сверху',
    ],
  },
  apa: {
    name: 'APA 7th Edition',
    description: 'Стандарт Американской психологической ассоциации',
    rules: [
      'Шрифт: Times New Roman, 12pt',
      'Межстрочный интервал: 2.0',
      'Абзацный отступ: 1.27 см (0.5 дюйма)',
      'Выравнивание: по левому краю',
      'Поля: 2.54 см (1 дюйм) со всех сторон',
      'Нумерация страниц: справа сверху',
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
      newDeviations.push(`Верхнее поле: ${settings.marginTop}px (стандарт: ${styleConfig.marginTop}px)`);
    }
    if (Math.abs(settings.marginBottom - styleConfig.marginBottom) > 5) {
      newDeviations.push(`Нижнее поле: ${settings.marginBottom}px (стандарт: ${styleConfig.marginBottom}px)`);
    }
    if (Math.abs(settings.marginLeft - styleConfig.marginLeft) > 5) {
      newDeviations.push(`Левое поле: ${settings.marginLeft}px (стандарт: ${styleConfig.marginLeft}px)`);
    }
    if (Math.abs(settings.marginRight - styleConfig.marginRight) > 5) {
      newDeviations.push(`Правое поле: ${settings.marginRight}px (стандарт: ${styleConfig.marginRight}px)`);
    }
    if (settings.fontSize !== styleConfig.fontSize) {
      newDeviations.push(`Размер шрифта: ${settings.fontSize}pt (стандарт: ${styleConfig.fontSize}pt)`);
    }
    if (Math.abs(settings.lineHeight - styleConfig.lineHeight) > 0.1) {
      newDeviations.push(`Интервал: ${settings.lineHeight} (стандарт: ${styleConfig.lineHeight})`);
    }
    if (settings.textAlign !== styleConfig.textAlign) {
      const alignNames: Record<string, string> = {
        left: 'по левому краю',
        right: 'по правому краю',
        center: 'по центру',
        justify: 'по ширине',
      };
      newDeviations.push(`Выравнивание: ${alignNames[settings.textAlign] || settings.textAlign} (стандарт: ${alignNames[styleConfig.textAlign] || styleConfig.textAlign})`);
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
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 700 }} onClick={(e) => e.stopPropagation()}>
        <div className="row space" style={{ marginBottom: 16 }}>
          <h3 style={{ margin: 0 }}>⚙️ Настройки страницы</h3>
          <button className="btn secondary" onClick={onClose}>✕</button>
        </div>

        {/* Style Presets */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 12, color: '#64748b', display: 'block', marginBottom: 8 }}>
            Стиль оформления
          </label>
          <div className="row gap" style={{ flexWrap: 'wrap' }}>
            {(['gost', 'vancouver', 'apa'] as CitationStyle[]).map((style) => (
              <button
                key={style}
                className={`btn ${citationStyle === style ? '' : 'secondary'}`}
                onClick={() => applyStylePreset(style)}
                style={{ flex: 1, minWidth: '150px' }}
              >
                {(STYLE_RULES[style] || STYLE_RULES.gost).name}
              </button>
            ))}
          </div>
        </div>

        {/* Style Description */}
        <div className="card" style={{ marginBottom: 16, padding: 12, background: 'rgba(75,116,255,0.05)' }}>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>{styleRule.name}</div>
          <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>{styleRule.description}</div>
          <ul style={{ margin: 0, paddingLeft: 20, fontSize: 11, color: '#94a3b8' }}>
            {styleRule.rules.map((rule, i) => (
              <li key={i}>{rule}</li>
            ))}
          </ul>
        </div>

        {/* Deviation Warning */}
        {isCustom && deviations.length > 0 && (
          <div className="alert" style={{ marginBottom: 16, background: 'rgba(234,179,8,0.1)', borderColor: '#eab308' }}>
            <div style={{ fontWeight: 600, marginBottom: 8, color: '#ca8a04' }}>
              ⚠️ Отклонения от стандарта {styleRule.name}
            </div>
            <ul style={{ margin: 0, paddingLeft: 20, fontSize: 11 }}>
              {deviations.map((dev, i) => (
                <li key={i}>{dev}</li>
              ))}
            </ul>
            <button 
              className="btn secondary" 
              onClick={resetToDefault}
              style={{ marginTop: 12, fontSize: 11 }}
            >
              Восстановить стандартные настройки
            </button>
          </div>
        )}

        {/* Settings Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
          {/* Margins */}
          <div className="card" style={{ padding: 12 }}>
            <h4 style={{ margin: '0 0 12px', fontSize: 13 }}>Поля страницы (px)</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <label className="stack">
                <span style={{ fontSize: 11, color: '#64748b' }}>Сверху</span>
                <input
                  type="number"
                  value={settings.marginTop}
                  onChange={(e) => setSettings({ ...settings, marginTop: Number(e.target.value) })}
                  style={{ padding: '6px 8px' }}
                />
              </label>
              <label className="stack">
                <span style={{ fontSize: 11, color: '#64748b' }}>Снизу</span>
                <input
                  type="number"
                  value={settings.marginBottom}
                  onChange={(e) => setSettings({ ...settings, marginBottom: Number(e.target.value) })}
                  style={{ padding: '6px 8px' }}
                />
              </label>
              <label className="stack">
                <span style={{ fontSize: 11, color: '#64748b' }}>Слева</span>
                <input
                  type="number"
                  value={settings.marginLeft}
                  onChange={(e) => setSettings({ ...settings, marginLeft: Number(e.target.value) })}
                  style={{ padding: '6px 8px' }}
                />
              </label>
              <label className="stack">
                <span style={{ fontSize: 11, color: '#64748b' }}>Справа</span>
                <input
                  type="number"
                  value={settings.marginRight}
                  onChange={(e) => setSettings({ ...settings, marginRight: Number(e.target.value) })}
                  style={{ padding: '6px 8px' }}
                />
              </label>
            </div>
          </div>

          {/* Typography */}
          <div className="card" style={{ padding: 12 }}>
            <h4 style={{ margin: '0 0 12px', fontSize: 13 }}>Типографика</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <label className="stack">
                <span style={{ fontSize: 11, color: '#64748b' }}>Размер шрифта (pt)</span>
                <select
                  value={settings.fontSize}
                  onChange={(e) => setSettings({ ...settings, fontSize: Number(e.target.value) })}
                  style={{ padding: '6px 8px' }}
                >
                  {[10, 11, 12, 13, 14, 16, 18].map((size) => (
                    <option key={size} value={size}>{size} pt</option>
                  ))}
                </select>
              </label>
              <label className="stack">
                <span style={{ fontSize: 11, color: '#64748b' }}>Межстрочный интервал</span>
                <select
                  value={settings.lineHeight}
                  onChange={(e) => setSettings({ ...settings, lineHeight: Number(e.target.value) })}
                  style={{ padding: '6px 8px' }}
                >
                  {[1.0, 1.15, 1.5, 1.75, 2.0, 2.5].map((lh) => (
                    <option key={lh} value={lh}>{lh}</option>
                  ))}
                </select>
              </label>
              <label className="stack" style={{ gridColumn: '1 / -1' }}>
                <span style={{ fontSize: 11, color: '#64748b' }}>Отступ первой строки</span>
                <select
                  value={settings.paragraphIndent}
                  onChange={(e) => setSettings({ ...settings, paragraphIndent: e.target.value })}
                  style={{ padding: '6px 8px' }}
                >
                  <option value="0">Без отступа</option>
                  <option value="1cm">1 см</option>
                  <option value="1.25cm">1.25 см (ГОСТ)</option>
                  <option value="1.27cm">1.27 см (APA)</option>
                  <option value="1.5cm">1.5 см</option>
                </select>
              </label>
              <label className="stack" style={{ gridColumn: '1 / -1' }}>
                <span style={{ fontSize: 11, color: '#64748b' }}>Выравнивание текста</span>
                <select
                  value={settings.textAlign}
                  onChange={(e) => setSettings({ ...settings, textAlign: e.target.value })}
                  style={{ padding: '6px 8px' }}
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

        {/* Actions */}
        <div className="row gap">
          <button className="btn" onClick={handleApply}>
            Применить
          </button>
          <button className="btn secondary" onClick={resetToDefault}>
            По умолчанию
          </button>
          <button className="btn secondary" onClick={onClose}>
            Отмена
          </button>
        </div>
      </div>
    </div>
  );
}
