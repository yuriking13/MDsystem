import React, { useState } from "react";
import {
  ILLUSTRATION_GRADIENTS,
  COLOR_SCHEMES,
  generateFloatingParticles,
  generateBlob,
  generateWave,
  renderGradientDefs,
  type GradientConfig,
} from "../lib/illustrationPatterns";

interface IllustrationGeneratorProps {
  onGenerate?: (svgCode: string) => void;
}

/**
 * Интерактивный генератор иллюстраций
 * Позволяет пользователям создавать кастомные SVG иллюстрации с различными настройками
 */
export default function IllustrationGenerator({
  onGenerate,
}: IllustrationGeneratorProps) {
  const [pattern, setPattern] = useState<
    "particles" | "blob" | "wave" | "mixed"
  >("particles");
  const [gradient, setGradient] =
    useState<keyof typeof ILLUSTRATION_GRADIENTS>("sunset");
  const [particleCount, setParticleCount] = useState(12);
  const [animationIntensity, setAnimationIntensity] = useState(0.5);
  const [previewProgress, setPreviewProgress] = useState(0.5);

  // Генерация SVG кода на основе настроек
  const generateSVG = () => {
    const selectedGradient = ILLUSTRATION_GRADIENTS[gradient];
    const bounds = { width: 800, height: 600 };

    let content = "";

    switch (pattern) {
      case "particles":
        const particles = generateFloatingParticles(
          particleCount,
          bounds,
          previewProgress,
        );
        content = particles
          .map(
            (p, i) =>
              `<circle cx="${p.props.cx}" cy="${p.props.cy}" r="${p.props.r}" fill="url(#${gradient})" opacity="${p.props.opacity}" />`,
          )
          .join("\n      ");
        break;

      case "blob":
        const blobPath = generateBlob(400, 300, 150, animationIntensity, 8);
        content = `<path d="${blobPath}" fill="url(#${gradient})" opacity="0.6" />`;
        break;

      case "wave":
        const wavePath = generateWave(
          50 * animationIntensity,
          2,
          previewProgress * Math.PI * 2,
          800,
          300,
        );
        content = `<path d="${wavePath}" stroke="url(#${gradient})" stroke-width="3" fill="none" opacity="0.8" />`;
        break;

      case "mixed":
        const mixedParticles = generateFloatingParticles(
          particleCount / 2,
          bounds,
          previewProgress,
        );
        const mixedBlob = generateBlob(400, 300, 120, animationIntensity, 6);
        content = `
      <path d="${mixedBlob}" fill="url(#${gradient})" opacity="0.4" />
      ${mixedParticles
        .map(
          (p, i) =>
            `<circle cx="${p.props.cx}" cy="${p.props.cy}" r="${p.props.r}" fill="url(#${gradient})" opacity="${p.props.opacity}" />`,
        )
        .join("\n      ")}`;
        break;
    }

    const svgCode = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600">
  <defs>
    ${generateGradientDefsString([selectedGradient])}
  </defs>
  
  ${content}
</svg>`;

    return svgCode;
  };

  // Хелпер для генерации defs строки
  const generateGradientDefsString = (gradients: GradientConfig[]) => {
    return gradients
      .map((grad) => {
        if (grad.type === "linear") {
          return `<linearGradient id="${grad.id}" x1="${grad.x1}" y1="${grad.y1}" x2="${grad.x2}" y2="${grad.y2}">
      ${grad.colors.map((c) => `<stop offset="${c.offset}" stop-color="${c.color}" stop-opacity="${c.opacity ?? 1}" />`).join("\n      ")}
    </linearGradient>`;
        } else {
          return `<radialGradient id="${grad.id}">
      ${grad.colors.map((c) => `<stop offset="${c.offset}" stop-color="${c.color}" stop-opacity="${c.opacity ?? 1}" />`).join("\n      ")}
    </radialGradient>`;
        }
      })
      .join("\n    ");
  };

  const handleGenerate = () => {
    const svg = generateSVG();
    if (onGenerate) {
      onGenerate(svg);
    } else {
      // Скачать как файл
      const blob = new Blob([svg], { type: "image/svg+xml" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `illustration-${pattern}-${gradient}.svg`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const handleCopyCode = () => {
    const svg = generateSVG();
    navigator.clipboard.writeText(svg);
    alert("SVG код скопирован в буфер обмена!");
  };

  return (
    <div className="illustration-generator">
      <div className="generator-header">
        <h2>Генератор иллюстраций</h2>
        <p>Создайте кастомную SVG иллюстрацию для вашего лэндинга</p>
      </div>

      <div className="generator-content">
        {/* Превью */}
        <div className="generator-preview">
          <div
            className="preview-container"
            dangerouslySetInnerHTML={{ __html: generateSVG() }}
          />
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={previewProgress}
            onChange={(e) => setPreviewProgress(parseFloat(e.target.value))}
            className="preview-slider"
          />
          <p className="preview-label">Прогресс анимации</p>
        </div>

        {/* Настройки */}
        <div className="generator-controls">
          <div className="control-group">
            <label>Паттерн</label>
            <select
              value={pattern}
              onChange={(e) => setPattern(e.target.value as typeof pattern)}
            >
              <option value="particles">Частицы</option>
              <option value="blob">Органическая форма</option>
              <option value="wave">Волна</option>
              <option value="mixed">Микс</option>
            </select>
          </div>

          <div className="control-group">
            <label>Градиент</label>
            <select
              value={gradient}
              onChange={(e) =>
                setGradient(
                  e.target.value as keyof typeof ILLUSTRATION_GRADIENTS,
                )
              }
            >
              {Object.keys(ILLUSTRATION_GRADIENTS).map((key) => (
                <option key={key} value={key}>
                  {key}
                </option>
              ))}
            </select>
          </div>

          {pattern === "particles" || pattern === "mixed" ? (
            <div className="control-group">
              <label>Количество частиц: {particleCount}</label>
              <input
                type="range"
                min="5"
                max="30"
                value={particleCount}
                onChange={(e) => setParticleCount(parseInt(e.target.value))}
              />
            </div>
          ) : null}

          {(pattern === "blob" ||
            pattern === "wave" ||
            pattern === "mixed") && (
            <div className="control-group">
              <label>Интенсивность: {animationIntensity.toFixed(2)}</label>
              <input
                type="range"
                min="0.1"
                max="1"
                step="0.1"
                value={animationIntensity}
                onChange={(e) =>
                  setAnimationIntensity(parseFloat(e.target.value))
                }
              />
            </div>
          )}

          <div className="control-actions">
            <button onClick={handleGenerate} className="btn-primary">
              📥 Скачать SVG
            </button>
            <button onClick={handleCopyCode} className="btn-secondary">
              📋 Копировать код
            </button>
          </div>
        </div>
      </div>

      <div className="generator-footer">
        <h3>Как использовать</h3>
        <ol>
          <li>Настройте параметры иллюстрации</li>
          <li>Скачайте SVG файл или скопируйте код</li>
          <li>Используйте в своем проекте!</li>
        </ol>
        <p className="generator-tip">
          💡 <strong>Совет:</strong> Используйте ползунок "Прогресс анимации"
          для предпросмотра различных состояний
        </p>
      </div>

      <style>{`
        .illustration-generator {
          max-width: 1200px;
          margin: 0 auto;
          padding: 2rem;
        }

        .generator-header {
          text-align: center;
          margin-bottom: 2rem;
        }

        .generator-header h2 {
          font-size: 2rem;
          margin-bottom: 0.5rem;
        }

        .generator-content {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 2rem;
          margin-bottom: 2rem;
        }

        .generator-preview {
          background: var(--bg-secondary, #f5f5f5);
          border-radius: 12px;
          padding: 2rem;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .preview-container {
          width: 100%;
          max-width: 600px;
          aspect-ratio: 4/3;
          background: white;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }

        .preview-slider {
          width: 100%;
          max-width: 600px;
          margin-top: 1rem;
        }

        .preview-label {
          margin-top: 0.5rem;
          color: var(--text-secondary, #666);
          font-size: 0.875rem;
        }

        .generator-controls {
          background: var(--bg-secondary, #f5f5f5);
          border-radius: 12px;
          padding: 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .control-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .control-group label {
          font-weight: 600;
          color: var(--text-primary, #333);
        }

        .control-group select,
        .control-group input[type="range"] {
          width: 100%;
        }

        .control-group select {
          padding: 0.5rem;
          border: 1px solid var(--border-color, #ddd);
          border-radius: 6px;
          background: white;
        }

        .control-actions {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          margin-top: 1rem;
        }

        .btn-primary,
        .btn-secondary {
          padding: 0.75rem 1.5rem;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 600;
          transition: all 0.2s;
        }

        .btn-primary {
          background: var(--color-primary, #667eea);
          color: white;
        }

        .btn-primary:hover {
          background: var(--color-primary-dark, #5568d3);
          transform: translateY(-2px);
        }

        .btn-secondary {
          background: white;
          color: var(--color-primary, #667eea);
          border: 2px solid var(--color-primary, #667eea);
        }

        .btn-secondary:hover {
          background: var(--color-primary, #667eea);
          color: white;
          transform: translateY(-2px);
        }

        .generator-footer {
          background: var(--bg-secondary, #f5f5f5);
          border-radius: 12px;
          padding: 1.5rem;
        }

        .generator-footer h3 {
          margin-bottom: 1rem;
        }

        .generator-footer ol {
          margin-left: 1.5rem;
          margin-bottom: 1rem;
        }

        .generator-footer li {
          margin-bottom: 0.5rem;
        }

        .generator-tip {
          background: #fff3cd;
          border-left: 4px solid #ffc107;
          padding: 1rem;
          border-radius: 4px;
          margin-top: 1rem;
        }

        @media (max-width: 768px) {
          .generator-content {
            grid-template-columns: 1fr;
          }

          .illustration-generator {
            padding: 1rem;
          }
        }
      `}</style>
    </div>
  );
}
