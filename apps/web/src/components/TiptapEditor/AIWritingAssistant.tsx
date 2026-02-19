/**
 * AIWritingAssistant - Floating panel for AI-powered text editing
 *
 * Features:
 * 1. Text improvement (academic style) with 2 variants
 *    - Extended mode: checks bibliography references against full text
 * 2. Table/chart generation from selected text
 * 3. Illustration generation from selected text
 */
import React, { useState, useCallback, useRef, useEffect } from "react";
import type { Editor } from "@tiptap/react";
import DOMPurify from "dompurify";
import {
  apiAIImproveText,
  apiAIGenerateTable,
  apiAIGenerateIllustration,
  type AIImproveTextVariant,
  type DOIFullTextStatus,
  type AIGenerateTableResponse,
  type AIGenerateIllustrationResponse,
} from "../../lib/api";
import { getErrorMessage } from "../../lib/errorUtils";
import {
  IconSparkles,
  IconClose,
  IconCheck,
  IconRefresh,
  IconTableCells,
  IconPhoto,
  IconChevronLeft,
  IconExclamation,
  IconLink,
  IconUpload,
  IconChartBar,
} from "../FlowbiteIcons";
import { editorEvents } from "../../lib/editorEvents";

// ===== Types =====

type AssistantMode =
  | "menu" // Main menu
  | "improve" // Text improvement
  | "improve_loading" // Loading improvement
  | "improve_results" // Show variants
  | "improve_doi_check" // Checking DOIs for full text
  | "table" // Table generation
  | "table_loading"
  | "table_results"
  | "illustration" // Illustration generation
  | "illustration_loading"
  | "illustration_results";

type TableTypeOption = "comparison" | "summary" | "data" | "auto";
type IllustrationTypeOption =
  | "diagram"
  | "flowchart"
  | "schema"
  | "infographic"
  | "auto";

interface AIWritingAssistantProps {
  editor: Editor;
  projectId: string;
  documentTitle?: string;
  onClose: () => void;
  onSaveStatistic?: (data: {
    title: string;
    description?: string;
    tableData: { headers: string[]; rows: string[][] };
  }) => Promise<string | null>;
}

// ===== Helper: Extract DOIs from text =====

function extractDOIsFromText(text: string): string[] {
  const doiRegex = /\b(10\.\d{4,}(?:\.\d+)*\/\S+?)(?=[,.\s;)\]>]|$)/gi;
  const matches = text.match(doiRegex);
  if (!matches) return [];
  return [...new Set(matches.map((d) => d.trim()))];
}

function sanitizeSvg(svgCode: string): string {
  if (!svgCode || typeof window === "undefined") {
    return "";
  }

  try {
    const clean = DOMPurify.sanitize(svgCode, {
      USE_PROFILES: { svg: true, svgFilters: true },
      ADD_TAGS: ["use"],
      FORBID_TAGS: ["script", "foreignObject"],
      FORBID_ATTR: ["onclick", "onerror", "onload", "xlink:href"],
    });

    // Verify the result is a valid SVG element
    const parser = new DOMParser();
    const doc = parser.parseFromString(clean, "image/svg+xml");
    const root = doc.documentElement;

    if (!root || root.tagName.toLowerCase() !== "svg") {
      return "";
    }

    return clean;
  } catch {
    return "";
  }
}

function isTableTypeOption(value: string): value is TableTypeOption {
  return ["comparison", "summary", "data", "auto"].includes(value);
}

function isIllustrationTypeOption(
  value: string,
): value is IllustrationTypeOption {
  return ["diagram", "flowchart", "schema", "infographic", "auto"].includes(
    value,
  );
}

// ===== Component =====

export default function AIWritingAssistant({
  editor,
  projectId,
  documentTitle,
  onClose,
  onSaveStatistic,
}: AIWritingAssistantProps) {
  const [mode, setMode] = useState<AssistantMode>("menu");
  const [selectedText, setSelectedText] = useState("");
  const [contextText, setContextText] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Improve mode state
  const [variant1, setVariant1] = useState<AIImproveTextVariant | null>(null);
  const [variant2, setVariant2] = useState<AIImproveTextVariant | null>(null);
  const [notes, setNotes] = useState<string | null>(null);
  const [doiStatuses, setDoiStatuses] = useState<DOIFullTextStatus[]>([]);
  const [doiFullTextSnippets, setDoiFullTextSnippets] = useState<
    Array<{ doi: string; text: string }>
  >([]);
  const [pendingDoiInput, setPendingDoiInput] = useState<string | null>(null);
  const [pendingDoiUrl, setPendingDoiUrl] = useState("");
  const [pendingDoiFile, setPendingDoiFile] = useState<File | null>(null);

  // Table mode state
  const [tableResult, setTableResult] =
    useState<AIGenerateTableResponse | null>(null);
  const [tableType, setTableType] = useState<TableTypeOption>("auto");

  // Illustration mode state
  const [illustrationResult, setIllustrationResult] =
    useState<AIGenerateIllustrationResponse | null>(null);
  const [illustrationType, setIllustrationType] =
    useState<IllustrationTypeOption>("auto");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Get selected text from editor
  const getSelection = useCallback(() => {
    if (!editor) return { text: "", context: "" };

    const { from, to } = editor.state.selection;
    if (from === to) return { text: "", context: "" };

    const text = editor.state.doc.textBetween(from, to, " ");

    // Get some context around the selection
    const contextFrom = Math.max(0, from - 500);
    const contextTo = Math.min(editor.state.doc.content.size, to + 500);
    const context = editor.state.doc.textBetween(contextFrom, contextTo, " ");

    return { text, context };
  }, [editor]);

  // Update selected text on mount and selection change
  useEffect(() => {
    const { text, context } = getSelection();
    setSelectedText(text);
    setContextText(context);
  }, [getSelection]);

  // ===== Improve Text =====

  const handleImproveText = useCallback(
    async (withSources: boolean) => {
      const { text, context } = getSelection();
      if (!text) {
        setError("Выделите текст в редакторе для улучшения");
        return;
      }

      setSelectedText(text);
      setContextText(context);
      setError(null);
      setMode("improve_loading");

      try {
        const dois = extractDOIsFromText(text);
        const effectiveMode =
          withSources && dois.length > 0 ? "academic_with_sources" : "academic";

        const response = await apiAIImproveText(projectId, {
          selectedText: text,
          context,
          documentTitle,
          mode: effectiveMode,
          citationDois: dois.length > 0 ? dois : undefined,
          fullTextSnippets:
            doiFullTextSnippets.length > 0 ? doiFullTextSnippets : undefined,
        });

        if (!response.ok) {
          throw new Error(response.error || "AI improvement failed");
        }

        setVariant1(response.variant1);
        setVariant2(response.variant2);
        setNotes(response.notes);

        // Check if there are DOIs that need full text
        if (
          effectiveMode === "academic_with_sources" &&
          response.doiFullTextStatus
        ) {
          const unfound = response.doiFullTextStatus.filter(
            (s) => !s.fullTextFound,
          );
          if (unfound.length > 0) {
            setDoiStatuses(response.doiFullTextStatus);
            setMode("improve_doi_check");
            return;
          }
        }

        setMode("improve_results");
      } catch (err) {
        setError(getErrorMessage(err) || "Ошибка при улучшении текста");
        setMode("improve");
      }
    },
    [getSelection, projectId, documentTitle, doiFullTextSnippets],
  );

  // Apply selected variant
  const handleApplyVariant = useCallback(
    (variantText: string) => {
      if (!editor) return;

      const { from, to } = editor.state.selection;
      if (from === to) {
        setError("Текст больше не выделен. Выделите текст заново.");
        return;
      }

      editor
        .chain()
        .focus()
        .deleteRange({ from, to })
        .insertContentAt(from, variantText)
        .run();

      onClose();
    },
    [editor, onClose],
  );

  // ===== DOI Full Text Handling =====

  const handleProvideDOIUrl = useCallback((doi: string) => {
    setPendingDoiInput(doi);
    setPendingDoiUrl("");
    setPendingDoiFile(null);
  }, []);

  const handleSubmitDOIUrl = useCallback(async () => {
    if (!pendingDoiInput) return;

    if (pendingDoiUrl) {
      // TODO: Fetch text from URL (simplified - just store URL as reference)
      setDoiFullTextSnippets((prev) => [
        ...prev.filter((s) => s.doi !== pendingDoiInput),
        {
          doi: pendingDoiInput,
          text: `[Полнотекстовая версия по ссылке: ${pendingDoiUrl}]`,
        },
      ]);
    }

    setPendingDoiInput(null);
    setPendingDoiUrl("");
  }, [pendingDoiInput, pendingDoiUrl]);

  const handleFileUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !pendingDoiInput) return;

      try {
        const text = await file.text();
        setDoiFullTextSnippets((prev) => [
          ...prev.filter((s) => s.doi !== pendingDoiInput),
          { doi: pendingDoiInput, text: text.slice(0, 50000) },
        ]);
        setPendingDoiInput(null);
      } catch {
        setError("Не удалось прочитать файл");
      }
    },
    [pendingDoiInput],
  );

  const handleSkipDOIAndContinue = useCallback(() => {
    // Proceed with the improvement without full text
    setMode("improve_results");
  }, []);

  const handleRetryWithFullText = useCallback(() => {
    // Retry improvement with the full text snippets user provided
    handleImproveText(true);
  }, [handleImproveText]);

  // ===== Generate Table =====

  const handleGenerateTable = useCallback(async () => {
    const { text } = getSelection();
    if (!text) {
      setError("Выделите текст в редакторе для генерации таблицы");
      return;
    }

    setSelectedText(text);
    setError(null);
    setMode("table_loading");

    try {
      const response = await apiAIGenerateTable(projectId, {
        selectedText: text,
        tableType,
        documentTitle,
      });

      if (!response.ok) {
        throw new Error(response.error || "Table generation failed");
      }

      setTableResult(response);
      setMode("table_results");
    } catch (err) {
      setError(getErrorMessage(err) || "Ошибка генерации таблицы");
      setMode("table");
    }
  }, [getSelection, projectId, tableType, documentTitle]);

  const handleInsertTable = useCallback(async () => {
    if (!tableResult || !editor) return;

    // Save to statistics if handler available
    let statisticId: string | undefined;
    if (onSaveStatistic) {
      try {
        const id = await onSaveStatistic({
          title: tableResult.title,
          description: tableResult.description,
          tableData: {
            headers: tableResult.headers,
            rows: tableResult.rows,
          },
        });
        if (id) statisticId = id;
      } catch (err) {
        console.error("Failed to save table to statistics:", err);
      }
    }

    // Insert table into editor via event system
    editorEvents.emit("insertTable", {
      headers: tableResult.headers,
      rows: tableResult.rows,
      title: tableResult.title,
      statisticId,
    });

    onClose();
  }, [tableResult, editor, onSaveStatistic, onClose]);

  const handleInsertChart = useCallback(() => {
    if (!tableResult || !editor) return;

    // Insert chart via event system
    editorEvents.emit("insertChart", {
      id: `ai_chart_${Date.now()}`,
      config: {
        type: tableResult.suggestedChartType || "bar",
        title: tableResult.chartTitle || tableResult.title,
      },
      table_data: {
        headers: tableResult.headers,
        rows: tableResult.rows,
      },
    });

    onClose();
  }, [tableResult, editor, onClose]);

  // ===== Generate Illustration =====

  const handleGenerateIllustration = useCallback(async () => {
    const { text } = getSelection();
    if (!text) {
      setError("Выделите текст для генерации иллюстрации");
      return;
    }

    setSelectedText(text);
    setError(null);
    setMode("illustration_loading");

    try {
      const response = await apiAIGenerateIllustration(projectId, {
        selectedText: text,
        illustrationType,
        documentTitle,
      });

      if (!response.ok) {
        throw new Error(response.error || "Illustration generation failed");
      }

      setIllustrationResult(response);
      setMode("illustration_results");
    } catch (err) {
      setError(getErrorMessage(err) || "Ошибка генерации иллюстрации");
      setMode("illustration");
    }
  }, [getSelection, projectId, illustrationType, documentTitle]);

  const handleInsertIllustration = useCallback(() => {
    if (!illustrationResult || !editor) return;

    const safeSvg = sanitizeSvg(illustrationResult.svgCode);
    if (!safeSvg) {
      setError("Некорректный SVG-код иллюстрации");
      return;
    }

    // Create a blob URL from SVG
    const svgBlob = new Blob([safeSvg], {
      type: "image/svg+xml",
    });
    const svgUrl = URL.createObjectURL(svgBlob);

    // Insert image into editor
    editor
      .chain()
      .focus()
      .setImage({
        src: svgUrl,
        alt: illustrationResult.figureCaption || illustrationResult.title,
      })
      .run();

    // Add figure caption
    if (illustrationResult.figureCaption) {
      editor
        .chain()
        .focus()
        .insertContent({
          type: "paragraph",
          content: [
            {
              type: "text",
              text: illustrationResult.figureCaption,
            },
          ],
        })
        .run();
    }

    onClose();
  }, [illustrationResult, editor, onClose]);

  // ===== Render =====

  const renderMenu = () => (
    <div className="ai-assistant-menu">
      <div className="ai-assistant-header">
        <div className="ai-assistant-title">
          <IconSparkles size="sm" />
          <span>AI Ассистент</span>
        </div>
        <button
          className="ai-assistant-close"
          onClick={onClose}
          title="Закрыть"
        >
          <IconClose size="sm" />
        </button>
      </div>

      {!selectedText && (
        <div className="ai-assistant-hint">
          <IconExclamation size="sm" />
          <span>Выделите текст в редакторе для работы с AI</span>
        </div>
      )}

      {selectedText && (
        <div className="ai-assistant-selection-preview">
          <div className="ai-assistant-selection-label">Выделенный текст:</div>
          <div className="ai-assistant-selection-text">
            {selectedText.length > 200
              ? selectedText.slice(0, 200) + "..."
              : selectedText}
          </div>
        </div>
      )}

      <div className="ai-assistant-actions">
        <div className="ai-assistant-section-label">Улучшение текста</div>
        <button
          className="ai-assistant-action-btn"
          onClick={() => {
            const { text } = getSelection();
            if (!text) {
              setError("Выделите текст для улучшения");
              return;
            }
            setSelectedText(text);
            setMode("improve");
          }}
          disabled={!selectedText}
        >
          <IconSparkles size="sm" />
          <div>
            <div className="ai-action-title">Сделать академичнее</div>
            <div className="ai-action-desc">
              2 варианта улучшения стиля текста
            </div>
          </div>
        </button>

        <div className="ai-assistant-section-label">Визуализация</div>
        <button
          className="ai-assistant-action-btn"
          onClick={() => {
            const { text } = getSelection();
            if (!text) {
              setError("Выделите текст");
              return;
            }
            setSelectedText(text);
            setMode("table");
          }}
          disabled={!selectedText}
        >
          <IconTableCells size="sm" />
          <div>
            <div className="ai-action-title">Создать таблицу</div>
            <div className="ai-action-desc">
              Генерация таблицы/графика из текста
            </div>
          </div>
        </button>

        <button
          className="ai-assistant-action-btn"
          onClick={() => {
            const { text } = getSelection();
            if (!text) {
              setError("Выделите текст");
              return;
            }
            setSelectedText(text);
            setMode("illustration");
          }}
          disabled={!selectedText}
        >
          <IconPhoto size="sm" />
          <div>
            <div className="ai-action-title">Создать иллюстрацию</div>
            <div className="ai-action-desc">
              Схема, диаграмма или инфографика
            </div>
          </div>
        </button>
      </div>

      {error && <div className="ai-assistant-error">{error}</div>}
    </div>
  );

  const renderImproveMode = () => {
    const dois = extractDOIsFromText(selectedText);
    const hasDois = dois.length > 0;

    return (
      <div className="ai-assistant-panel">
        <div className="ai-assistant-header">
          <button className="ai-assistant-back" onClick={() => setMode("menu")}>
            <IconChevronLeft size="sm" />
          </button>
          <div className="ai-assistant-title">
            <IconSparkles size="sm" />
            <span>Улучшить текст</span>
          </div>
          <button className="ai-assistant-close" onClick={onClose}>
            <IconClose size="sm" />
          </button>
        </div>

        <div className="ai-assistant-selection-preview">
          <div className="ai-assistant-selection-label">Выделенный текст:</div>
          <div className="ai-assistant-selection-text">
            {selectedText.length > 300
              ? selectedText.slice(0, 300) + "..."
              : selectedText}
          </div>
        </div>

        {hasDois && (
          <div className="ai-assistant-doi-notice">
            <IconLink size="sm" />
            <span>
              Обнаружены ссылки на источники ({dois.length}). Можно проверить по
              полнотекстовым версиям.
            </span>
          </div>
        )}

        <div className="ai-assistant-improve-actions">
          <button
            className="ai-assistant-primary-btn"
            onClick={() => handleImproveText(false)}
          >
            <IconSparkles size="sm" />
            Улучшить стиль
          </button>

          {hasDois && (
            <button
              className="ai-assistant-secondary-btn"
              onClick={() => handleImproveText(true)}
            >
              <IconLink size="sm" />
              Улучшить с проверкой источников
            </button>
          )}
        </div>

        {error && <div className="ai-assistant-error">{error}</div>}
      </div>
    );
  };

  const renderLoading = (message: string) => (
    <div className="ai-assistant-panel">
      <div className="ai-assistant-header">
        <div className="ai-assistant-title">
          <IconSparkles size="sm" />
          <span>AI Ассистент</span>
        </div>
        <button className="ai-assistant-close" onClick={onClose}>
          <IconClose size="sm" />
        </button>
      </div>
      <div className="ai-assistant-loading">
        <div className="ai-assistant-spinner" />
        <span>{message}</span>
      </div>
    </div>
  );

  const renderImproveResults = () => (
    <div className="ai-assistant-panel ai-assistant-panel-wide">
      <div className="ai-assistant-header">
        <button
          className="ai-assistant-back"
          onClick={() => setMode("improve")}
        >
          <IconChevronLeft size="sm" />
        </button>
        <div className="ai-assistant-title">
          <IconSparkles size="sm" />
          <span>Варианты улучшения</span>
        </div>
        <button className="ai-assistant-close" onClick={onClose}>
          <IconClose size="sm" />
        </button>
      </div>

      {notes && <div className="ai-assistant-notes">{notes}</div>}

      <div className="ai-assistant-variants">
        {/* Variant 1 */}
        {variant1 && (
          <div className="ai-assistant-variant">
            <div className="ai-variant-header">
              <span className="ai-variant-label">Вариант 1</span>
              <span className="ai-variant-subtitle">Минимальная правка</span>
            </div>
            <div className="ai-variant-text">{variant1.text}</div>
            <div className="ai-variant-changes">{variant1.changes}</div>
            <button
              className="ai-assistant-apply-btn"
              onClick={() => handleApplyVariant(variant1.text)}
            >
              <IconCheck size="sm" />
              Применить вариант 1
            </button>
          </div>
        )}

        {/* Variant 2 */}
        {variant2 && (
          <div className="ai-assistant-variant">
            <div className="ai-variant-header">
              <span className="ai-variant-label">Вариант 2</span>
              <span className="ai-variant-subtitle">Глубокая переработка</span>
            </div>
            <div className="ai-variant-text">{variant2.text}</div>
            <div className="ai-variant-changes">{variant2.changes}</div>
            <button
              className="ai-assistant-apply-btn"
              onClick={() => handleApplyVariant(variant2.text)}
            >
              <IconCheck size="sm" />
              Применить вариант 2
            </button>
          </div>
        )}
      </div>

      <div className="ai-assistant-footer-actions">
        <button
          className="ai-assistant-secondary-btn"
          onClick={() => handleImproveText(false)}
        >
          <IconRefresh size="sm" />
          Повторить
        </button>
      </div>

      {error && <div className="ai-assistant-error">{error}</div>}
    </div>
  );

  const renderDOICheck = () => (
    <div className="ai-assistant-panel ai-assistant-panel-wide">
      <div className="ai-assistant-header">
        <button
          className="ai-assistant-back"
          onClick={() => setMode("improve_results")}
        >
          <IconChevronLeft size="sm" />
        </button>
        <div className="ai-assistant-title">
          <IconLink size="sm" />
          <span>Проверка источников</span>
        </div>
        <button className="ai-assistant-close" onClick={onClose}>
          <IconClose size="sm" />
        </button>
      </div>

      <div className="ai-assistant-doi-list">
        <p className="ai-doi-explanation">
          Для некоторых источников не найдена полнотекстовая версия. Вы можете
          предоставить ссылку или файл для более точного улучшения текста.
        </p>

        {doiStatuses.map((status) => (
          <div
            key={status.doi}
            className={`ai-doi-item ${status.fullTextFound ? "found" : "not-found"}`}
          >
            <div className="ai-doi-info">
              <span className="ai-doi-label">DOI: {status.doi}</span>
              {status.fullTextFound ? (
                <span className="ai-doi-status found">
                  <IconCheck size="sm" /> Найден
                </span>
              ) : (
                <span className="ai-doi-status not-found">
                  <IconExclamation size="sm" /> Не найден
                </span>
              )}
            </div>

            {!status.fullTextFound &&
              pendingDoiInput !== status.doi &&
              !doiFullTextSnippets.find((s) => s.doi === status.doi) && (
                <button
                  className="ai-assistant-secondary-btn small"
                  onClick={() => handleProvideDOIUrl(status.doi)}
                >
                  <IconLink size="sm" />
                  Предоставить ссылку/файл
                </button>
              )}

            {pendingDoiInput === status.doi && (
              <div className="ai-doi-input-group">
                <input
                  type="text"
                  className="ai-doi-url-input"
                  placeholder="Вставьте ссылку на полнотекстовую статью..."
                  value={pendingDoiUrl}
                  onChange={(e) => setPendingDoiUrl(e.target.value)}
                />
                <div className="ai-doi-input-actions">
                  <button
                    className="ai-assistant-primary-btn small"
                    onClick={handleSubmitDOIUrl}
                    disabled={!pendingDoiUrl}
                  >
                    <IconLink size="sm" /> Отправить
                  </button>
                  <span className="ai-doi-or">или</span>
                  <button
                    className="ai-assistant-secondary-btn small"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <IconUpload size="sm" /> Загрузить файл
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".txt,.html,.htm"
                    className="ai-hidden-file-input"
                    onChange={handleFileUpload}
                  />
                </div>
              </div>
            )}

            {doiFullTextSnippets.find((s) => s.doi === status.doi) && (
              <span className="ai-doi-status found">
                <IconCheck size="sm" /> Предоставлено
              </span>
            )}

            {status.fullTextFound && status.fullTextUrl && (
              <a
                href={status.fullTextUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="ai-doi-link"
              >
                Открыть полнотекстовую версию
              </a>
            )}
          </div>
        ))}
      </div>

      <div className="ai-assistant-footer-actions">
        <button
          className="ai-assistant-secondary-btn"
          onClick={handleSkipDOIAndContinue}
        >
          Пропустить и посмотреть результаты
        </button>
        {doiFullTextSnippets.length > 0 && (
          <button
            className="ai-assistant-primary-btn"
            onClick={handleRetryWithFullText}
          >
            <IconRefresh size="sm" />
            Повторить с полнотекстовыми данными
          </button>
        )}
      </div>
    </div>
  );

  const renderTableMode = () => (
    <div className="ai-assistant-panel">
      <div className="ai-assistant-header">
        <button className="ai-assistant-back" onClick={() => setMode("menu")}>
          <IconChevronLeft size="sm" />
        </button>
        <div className="ai-assistant-title">
          <IconTableCells size="sm" />
          <span>Создать таблицу</span>
        </div>
        <button className="ai-assistant-close" onClick={onClose}>
          <IconClose size="sm" />
        </button>
      </div>

      <div className="ai-assistant-selection-preview">
        <div className="ai-assistant-selection-label">Выделенный текст:</div>
        <div className="ai-assistant-selection-text">
          {selectedText.length > 300
            ? selectedText.slice(0, 300) + "..."
            : selectedText}
        </div>
      </div>

      <div className="ai-assistant-form-group">
        <label className="ai-assistant-label">Тип таблицы:</label>
        <select
          className="ai-assistant-select"
          value={tableType}
          onChange={(e) => {
            if (isTableTypeOption(e.target.value)) {
              setTableType(e.target.value);
            }
          }}
        >
          <option value="auto">Автоматически</option>
          <option value="comparison">Сравнительная</option>
          <option value="summary">Сводная</option>
          <option value="data">Данные</option>
        </select>
      </div>

      <button
        className="ai-assistant-primary-btn"
        onClick={handleGenerateTable}
      >
        <IconTableCells size="sm" />
        Сгенерировать таблицу
      </button>

      {error && <div className="ai-assistant-error">{error}</div>}
    </div>
  );

  const renderTableResults = () => {
    if (!tableResult) return null;

    return (
      <div className="ai-assistant-panel ai-assistant-panel-wide">
        <div className="ai-assistant-header">
          <button
            className="ai-assistant-back"
            onClick={() => setMode("table")}
          >
            <IconChevronLeft size="sm" />
          </button>
          <div className="ai-assistant-title">
            <IconTableCells size="sm" />
            <span>Результат: таблица</span>
          </div>
          <button className="ai-assistant-close" onClick={onClose}>
            <IconClose size="sm" />
          </button>
        </div>

        <div className="ai-table-title">{tableResult.title}</div>
        {tableResult.description && (
          <div className="ai-table-description">{tableResult.description}</div>
        )}

        <div className="ai-table-preview">
          <table className="ai-preview-table">
            <thead>
              <tr>
                {tableResult.headers.map((h, i) => (
                  <th key={i}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tableResult.rows.map((row, ri) => (
                <tr key={ri}>
                  {row.map((cell, ci) => (
                    <td key={ci}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {tableResult.notes && (
          <div className="ai-assistant-notes">{tableResult.notes}</div>
        )}

        <div className="ai-assistant-footer-actions">
          <button
            className="ai-assistant-primary-btn"
            onClick={handleInsertTable}
          >
            <IconTableCells size="sm" />
            Вставить таблицу
          </button>

          {tableResult.suggestedChartType &&
            tableResult.suggestedChartType !== "none" && (
              <button
                className="ai-assistant-secondary-btn"
                onClick={handleInsertChart}
              >
                <IconChartBar size="sm" />
                Вставить как график ({tableResult.suggestedChartType})
              </button>
            )}

          <button
            className="ai-assistant-secondary-btn"
            onClick={handleGenerateTable}
          >
            <IconRefresh size="sm" />
            Повторить
          </button>
        </div>
      </div>
    );
  };

  const renderIllustrationMode = () => (
    <div className="ai-assistant-panel">
      <div className="ai-assistant-header">
        <button className="ai-assistant-back" onClick={() => setMode("menu")}>
          <IconChevronLeft size="sm" />
        </button>
        <div className="ai-assistant-title">
          <IconPhoto size="sm" />
          <span>Создать иллюстрацию</span>
        </div>
        <button className="ai-assistant-close" onClick={onClose}>
          <IconClose size="sm" />
        </button>
      </div>

      <div className="ai-assistant-selection-preview">
        <div className="ai-assistant-selection-label">Выделенный текст:</div>
        <div className="ai-assistant-selection-text">
          {selectedText.length > 300
            ? selectedText.slice(0, 300) + "..."
            : selectedText}
        </div>
      </div>

      <div className="ai-assistant-form-group">
        <label className="ai-assistant-label">Тип иллюстрации:</label>
        <select
          className="ai-assistant-select"
          value={illustrationType}
          onChange={(e) => {
            if (isIllustrationTypeOption(e.target.value)) {
              setIllustrationType(e.target.value);
            }
          }}
        >
          <option value="auto">Автоматически</option>
          <option value="diagram">Диаграмма</option>
          <option value="flowchart">Блок-схема</option>
          <option value="schema">Схема</option>
          <option value="infographic">Инфографика</option>
        </select>
      </div>

      <button
        className="ai-assistant-primary-btn"
        onClick={handleGenerateIllustration}
      >
        <IconPhoto size="sm" />
        Сгенерировать иллюстрацию
      </button>

      {error && <div className="ai-assistant-error">{error}</div>}
    </div>
  );

  const renderIllustrationResults = () => {
    if (!illustrationResult) return null;

    return (
      <div className="ai-assistant-panel ai-assistant-panel-wide">
        <div className="ai-assistant-header">
          <button
            className="ai-assistant-back"
            onClick={() => setMode("illustration")}
          >
            <IconChevronLeft size="sm" />
          </button>
          <div className="ai-assistant-title">
            <IconPhoto size="sm" />
            <span>Результат: иллюстрация</span>
          </div>
          <button className="ai-assistant-close" onClick={onClose}>
            <IconClose size="sm" />
          </button>
        </div>

        <div className="ai-table-title">{illustrationResult.title}</div>
        {illustrationResult.description && (
          <div className="ai-table-description">
            {illustrationResult.description}
          </div>
        )}

        <div className="ai-illustration-preview">
          <div
            dangerouslySetInnerHTML={{
              __html: sanitizeSvg(illustrationResult.svgCode),
            }}
          />
        </div>

        {illustrationResult.figureCaption && (
          <div className="ai-figure-caption">
            {illustrationResult.figureCaption}
          </div>
        )}

        {illustrationResult.notes && (
          <div className="ai-assistant-notes">{illustrationResult.notes}</div>
        )}

        <div className="ai-assistant-footer-actions">
          <button
            className="ai-assistant-primary-btn"
            onClick={handleInsertIllustration}
          >
            <IconPhoto size="sm" />
            Вставить в документ
          </button>

          <button
            className="ai-assistant-secondary-btn"
            onClick={handleGenerateIllustration}
          >
            <IconRefresh size="sm" />
            Повторить
          </button>
        </div>
      </div>
    );
  };

  // Main render
  return (
    <>
      <button
        type="button"
        className="ai-assistant-backdrop"
        onClick={onClose}
        aria-label="Закрыть AI ассистент"
      />
      <div
        className="ai-assistant-overlay"
        ref={panelRef}
        role="dialog"
        aria-modal
      >
        {mode === "menu" && renderMenu()}
        {mode === "improve" && renderImproveMode()}
        {mode === "improve_loading" &&
          renderLoading("Улучшаю текст... Это может занять 10-30 секунд.")}
        {mode === "improve_results" && renderImproveResults()}
        {mode === "improve_doi_check" && renderDOICheck()}
        {mode === "table" && renderTableMode()}
        {mode === "table_loading" &&
          renderLoading("Генерирую таблицу... Это может занять 10-20 секунд.")}
        {mode === "table_results" && renderTableResults()}
        {mode === "illustration" && renderIllustrationMode()}
        {mode === "illustration_loading" &&
          renderLoading(
            "Генерирую иллюстрацию... Это может занять 15-30 секунд.",
          )}
        {mode === "illustration_results" && renderIllustrationResults()}
      </div>
    </>
  );
}
