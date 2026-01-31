import React, { useState, useEffect } from "react";
import {
  apiGetArticleByPmid,
  apiTranslateText,
  apiImportFromGraph,
} from "../../lib/api";
import { getErrorMessage } from "../../lib/errorUtils";
import {
  IconPlus,
  IconCalendar,
  IconTag,
  IconDocumentText,
  IconTrendingUp,
  IconStar,
  IconCheckCircle,
} from "../FlowbiteIcons";
import { getLevelColor, getLevelName } from "./utils";
import type { EnrichedNodeData } from "./types";

type Props = {
  node: any;
  projectId: string;
  onRefresh?: () => void;
  globalLang?: "en" | "ru";
};

export default function NodeInfoPanel({
  node,
  projectId,
  onRefresh,
  globalLang = "en",
}: Props) {
  const [adding, setAdding] = useState(false);
  const [addingToSelected, setAddingToSelected] = useState(false);
  const [addMessage, setAddMessage] = useState<string | null>(null);
  const [localLanguage, setLocalLanguage] = useState<"en" | "ru" | null>(null);
  const [loadingData, setLoadingData] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [translationError, setTranslationError] = useState<string | null>(null);

  const language = localLanguage ?? globalLang;
  const [enrichedData, setEnrichedData] = useState<EnrichedNodeData | null>(
    null,
  );

  // Загружаем полные данные если у узла нет title (placeholder)
  useEffect(() => {
    if (!node.title && node.pmid && !enrichedData && !loadingData) {
      setLoadingData(true);
      apiGetArticleByPmid(node.pmid)
        .then((res) => {
          if (res.ok && res.article) {
            setEnrichedData({
              title: res.article.title,
              title_ru: res.article.title_ru,
              abstract: res.article.abstract,
              abstract_ru: res.article.abstract_ru,
              authors: res.article.authors,
              journal: res.article.journal,
              year: res.article.year,
              doi: res.article.doi,
              citedByCount: res.article.citedByCount || 0,
            });
          }
        })
        .catch((err) => {
          console.error("Failed to load article data:", err);
        })
        .finally(() => {
          setLoadingData(false);
        });
    }
  }, [node.pmid, node.title, enrichedData, loadingData]);

  // Функция перевода
  const handleTranslate = async () => {
    const titleToTranslate = enrichedData?.title || node.title;
    const abstractToTranslate = enrichedData?.abstract || node.abstract;

    if (!titleToTranslate && !abstractToTranslate) {
      setTranslationError("Нечего переводить");
      return;
    }

    setTranslating(true);
    setTranslationError(null);

    try {
      const result = await apiTranslateText(
        titleToTranslate || undefined,
        abstractToTranslate || undefined,
        node.pmid || undefined,
      );

      if (result.ok) {
        setEnrichedData((prev) => ({
          title: prev?.title || node.title || null,
          title_ru: result.title_ru || prev?.title_ru || null,
          abstract: prev?.abstract || node.abstract || null,
          abstract_ru: result.abstract_ru || prev?.abstract_ru || null,
          authors: prev?.authors || node.authors || null,
          journal: prev?.journal || node.journal || null,
          year: prev?.year || node.year || null,
          doi: prev?.doi || node.doi || null,
          citedByCount: prev?.citedByCount || node.citedByCount || 0,
        }));
        setLocalLanguage("ru");
      } else {
        setTranslationError(result.error || "Ошибка перевода");
      }
    } catch (err) {
      setTranslationError(getErrorMessage(err));
    } finally {
      setTranslating(false);
    }
  };

  // Объединяем данные узла и обогащенные данные
  const displayData = {
    title: enrichedData?.title || node.title || null,
    title_ru: enrichedData?.title_ru || node.title_ru || null,
    abstract: enrichedData?.abstract || node.abstract || null,
    abstract_ru: enrichedData?.abstract_ru || node.abstract_ru || null,
    authors: enrichedData?.authors || node.authors || null,
    journal: enrichedData?.journal || node.journal || null,
    year: enrichedData?.year || node.year || null,
    doi: enrichedData?.doi || node.doi || null,
    citedByCount: enrichedData?.citedByCount || node.citedByCount || 0,
  };

  const displayTitle =
    language === "ru" && displayData.title_ru
      ? displayData.title_ru
      : displayData.title;
  const displayAbstract =
    language === "ru" && displayData.abstract_ru
      ? displayData.abstract_ru
      : displayData.abstract;

  const handleAddToProject = async (status: "candidate" | "selected") => {
    const pmid = node.pmid;
    const doi = displayData.doi;

    if (!pmid && !doi) {
      setAddMessage("Нет PMID или DOI для добавления");
      return;
    }

    if (status === "selected") {
      setAddingToSelected(true);
    } else {
      setAdding(true);
    }
    setAddMessage(null);
    try {
      const payload = {
        pmids: pmid ? [pmid] : [],
        dois: doi ? [doi] : [],
        status,
      };
      const res = await apiImportFromGraph(projectId, payload);
      const statusLabel = status === "selected" ? "Отобранные" : "Кандидаты";
      setAddMessage(res.message || `Статья добавлена в ${statusLabel}!`);
      if (onRefresh) {
        setTimeout(() => onRefresh(), 500);
      }
    } catch (err) {
      setAddMessage(getErrorMessage(err));
    } finally {
      setAdding(false);
      setAddingToSelected(false);
    }
  };

  const level = node.graphLevel ?? 1;
  const hasRussian = !!(displayData.title_ru || displayData.abstract_ru);

  return (
    <div className="node-info-panel">
      {/* Header Card */}
      <div
        className="node-info-header"
        style={{ borderLeftColor: getLevelColor(level) }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 8,
          }}
        >
          <div
            className="node-level-badge"
            style={{ backgroundColor: getLevelColor(level) }}
          >
            {getLevelName(level)}
          </div>
          {/* Language Toggle */}
          <div
            className="language-toggle"
            style={{
              display: "flex",
              gap: 2,
              padding: 2,
              background: "rgba(255,255,255,0.1)",
              borderRadius: 6,
            }}
          >
            <button
              onClick={() => setLocalLanguage("en")}
              disabled={translating}
              style={{
                padding: "4px 8px",
                fontSize: 11,
                fontWeight: language === "en" ? 600 : 400,
                background: language === "en" ? "var(--accent)" : "transparent",
                color: language === "en" ? "white" : "var(--text-secondary)",
                border: "none",
                borderRadius: 4,
                cursor: "pointer",
              }}
            >
              EN
            </button>
            <button
              onClick={() => {
                if (hasRussian) {
                  setLocalLanguage("ru");
                } else {
                  handleTranslate();
                }
              }}
              disabled={translating}
              style={{
                padding: "4px 8px",
                fontSize: 11,
                fontWeight: language === "ru" ? 600 : 400,
                background:
                  language === "ru"
                    ? "var(--accent)"
                    : translating
                      ? "rgba(59, 130, 246, 0.3)"
                      : "transparent",
                color:
                  language === "ru" || translating
                    ? "white"
                    : "var(--text-secondary)",
                border: "none",
                borderRadius: 4,
                cursor: translating ? "wait" : "pointer",
              }}
              title={hasRussian ? "Русский перевод" : "Нажмите для перевода"}
            >
              {translating ? "..." : "RU"}
            </button>
          </div>
        </div>

        {/* Ошибка перевода */}
        {translationError && (
          <div
            style={{
              padding: "6px 12px",
              background: "rgba(239, 68, 68, 0.1)",
              fontSize: 11,
              color: "#ef4444",
              borderBottom: "1px solid var(--border-glass)",
            }}
          >
            {translationError}
          </div>
        )}

        {/* Перевод в процессе */}
        {translating && (
          <div
            style={{
              padding: "6px 12px",
              background: "rgba(59, 130, 246, 0.1)",
              fontSize: 11,
              color: "#3b82f6",
              borderBottom: "1px solid var(--border-glass)",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span
              className="loading-spinner"
              style={{ width: 12, height: 12 }}
            />
            Переводим...
          </div>
        )}

        {loadingData ? (
          <div
            className="node-title"
            style={{ color: "var(--text-secondary)", fontStyle: "italic" }}
          >
            Загрузка данных...
          </div>
        ) : (
          <>
            <div className="node-title">{displayTitle || node.label}</div>
            {displayData.authors && (
              <div
                style={{
                  fontSize: 12,
                  color: "var(--text-secondary)",
                  marginTop: 6,
                }}
              >
                {displayData.authors}
              </div>
            )}
            {displayData.journal && (
              <div
                style={{
                  fontSize: 11,
                  color: "var(--text-muted)",
                  marginTop: 4,
                  fontStyle: "italic",
                }}
              >
                {displayData.journal}
              </div>
            )}
          </>
        )}
      </div>

      {/* Abstract */}
      {displayAbstract && (
        <div
          style={{
            padding: "12px 16px",
            borderBottom: "1px solid var(--border-glass)",
            maxHeight: 200,
            overflowY: "auto",
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "var(--text-secondary)",
              marginBottom: 6,
              textTransform: "uppercase",
              letterSpacing: "0.5px",
            }}
          >
            Аннотация
          </div>
          <div
            style={{
              fontSize: 13,
              lineHeight: 1.6,
              color: "var(--text-primary)",
            }}
          >
            {displayAbstract}
          </div>
        </div>
      )}

      {/* Info Rows */}
      {displayData.year && (
        <div className="node-info-row">
          <div className="node-info-label">
            <IconCalendar size="sm" />
            Год
          </div>
          <div className="node-info-value">{displayData.year}</div>
        </div>
      )}

      {node.pmid && (
        <div className="node-info-row">
          <div className="node-info-label">
            <IconTag size="sm" />
            PMID
          </div>
          <a
            href={`https://pubmed.ncbi.nlm.nih.gov/${node.pmid}`}
            target="_blank"
            rel="noopener noreferrer"
            className="node-info-link"
          >
            {node.pmid} ↗
          </a>
        </div>
      )}

      {displayData.doi && (
        <div className="node-info-row">
          <div className="node-info-label">
            <IconDocumentText size="sm" />
            DOI
          </div>
          <a
            href={`https://doi.org/${displayData.doi}`}
            target="_blank"
            rel="noopener noreferrer"
            className="node-info-link"
            style={{ wordBreak: "break-all" }}
          >
            {displayData.doi} ↗
          </a>
        </div>
      )}

      {displayData.citedByCount > 0 && (
        <div className="node-info-row">
          <div className="node-info-label">
            <IconTrendingUp size="sm" />
            Цитирований
          </div>
          <div className="node-info-value" style={{ color: "#10b981" }}>
            {displayData.citedByCount}
          </div>
        </div>
      )}

      {node.statsQuality && node.statsQuality > 0 && (
        <div className="node-info-row">
          <div className="node-info-label">
            <IconStar size="sm" />
            P-value
          </div>
          <div className="node-info-value" style={{ color: "#fbbf24" }}>
            {"★".repeat(node.statsQuality)}
          </div>
        </div>
      )}

      {/* Add Buttons */}
      {(node.graphLevel === 2 ||
        node.graphLevel === 3 ||
        node.graphLevel === 0) && (
        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <button
            onClick={() => handleAddToProject("candidate")}
            disabled={adding || addingToSelected}
            className="node-add-btn"
            style={{
              flex: 1,
              background: "var(--accent)",
              borderColor: "var(--accent)",
            }}
          >
            {adding ? (
              <>
                <span
                  className="loading-spinner"
                  style={{
                    width: 14,
                    height: 14,
                    marginRight: 8,
                    display: "inline-block",
                    verticalAlign: "middle",
                  }}
                />
                Добавляю...
              </>
            ) : (
              <>
                <IconPlus
                  size="sm"
                  className="icon-sm"
                  style={{
                    marginRight: 6,
                    display: "inline",
                    verticalAlign: "middle",
                  }}
                />
                В Кандидаты
              </>
            )}
          </button>
          <button
            onClick={() => handleAddToProject("selected")}
            disabled={adding || addingToSelected}
            className="node-add-btn"
            style={{ flex: 1, background: "#22c55e", borderColor: "#16a34a" }}
          >
            {addingToSelected ? (
              <>
                <span
                  className="loading-spinner"
                  style={{
                    width: 14,
                    height: 14,
                    marginRight: 8,
                    display: "inline-block",
                    verticalAlign: "middle",
                  }}
                />
                Добавляю...
              </>
            ) : (
              <>
                <IconCheckCircle
                  size="sm"
                  className="icon-sm"
                  style={{
                    marginRight: 6,
                    display: "inline",
                    verticalAlign: "middle",
                  }}
                />
                В Отобранные
              </>
            )}
          </button>
        </div>
      )}

      {addMessage && (
        <div
          style={{
            marginTop: 12,
            padding: "10px 14px",
            backgroundColor: "rgba(16, 185, 129, 0.1)",
            borderRadius: 8,
            fontSize: 12,
            color: "#10b981",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <IconCheckCircle size="sm" />
          {addMessage}
        </div>
      )}
    </div>
  );
}
