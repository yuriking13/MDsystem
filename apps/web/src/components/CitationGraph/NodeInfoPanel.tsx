import React, { useState, useEffect } from "react";
import {
  apiGetArticleByPmid,
  apiTranslateText,
  apiImportFromGraph,
  type GraphNode,
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
import { getLevelName, getGraphNodeColors } from "./utils";
import type { EnrichedNodeData } from "./types";

function getPValueLabel(quality: number): string {
  if (quality >= 3) return "p < 0.001";
  if (quality === 2) return "p < 0.01";
  return "p < 0.05";
}

type Props = {
  node: GraphNode;
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
  const nodeLevelModifier =
    level === 0
      ? "level-0"
      : level === 1
        ? "level-1"
        : level === 2
          ? "level-2"
          : level === 3
            ? "level-3"
            : "level-default";

  const enLanguageButtonClassName = [
    "node-language-button",
    language === "en" ? "node-language-button--active" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const ruLanguageButtonClassName = [
    "node-language-button",
    language === "ru" ? "node-language-button--active" : "",
    translating ? "node-language-button--translating" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="node-info-panel">
      {/* Header Card */}
      <div
        className={`node-info-header node-info-header--${nodeLevelModifier}`}
      >
        <div className="node-info-header-top-row">
          <div
            className={`node-level-badge node-level-badge--${nodeLevelModifier}`}
          >
            {getLevelName(level)}
          </div>
          {/* Language Toggle */}
          <div className="language-toggle node-language-toggle">
            <button
              onClick={() => setLocalLanguage("en")}
              disabled={translating}
              className={enLanguageButtonClassName}
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
              className={ruLanguageButtonClassName}
              title={hasRussian ? "Русский перевод" : "Нажмите для перевода"}
            >
              {translating ? "..." : "RU"}
            </button>
          </div>
        </div>

        {/* Ошибка перевода */}
        {translationError && (
          <div className="node-translation-error">{translationError}</div>
        )}

        {/* Перевод в процессе */}
        {translating && (
          <div className="node-translating-info">
            <span className="loading-spinner node-loading-spinner-small" />
            Переводим...
          </div>
        )}

        {loadingData ? (
          <div className="node-title node-title--loading">
            Загрузка данных...
          </div>
        ) : (
          <>
            <div className="node-title">{displayTitle || node.label}</div>
            {displayData.authors && (
              <div className="node-authors-text">{displayData.authors}</div>
            )}
            {displayData.journal && (
              <div className="node-journal-text">{displayData.journal}</div>
            )}
          </>
        )}
      </div>

      {/* Abstract */}
      {displayAbstract && (
        <div className="node-abstract-container">
          <div className="node-abstract-title">Аннотация</div>
          <div className="node-abstract-text">{displayAbstract}</div>
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
            className="node-info-link node-info-link--break-word"
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
          <div className="node-info-value node-info-value--success">
            {displayData.citedByCount}
          </div>
        </div>
      )}

      {node.statsQuality && node.statsQuality > 0 && (
        <div className="node-info-row">
          <div className="node-info-label">
            <IconStar size="sm" />
            P-value (значимость)
          </div>
          <div className="node-info-value node-info-value--warning">
            {getPValueLabel(node.statsQuality)}
          </div>
        </div>
      )}

      {/* Add Buttons */}
      {(node.graphLevel === 2 ||
        node.graphLevel === 3 ||
        node.graphLevel === 0) && (
        <div className="node-add-buttons-wrap">
          <button
            onClick={() => handleAddToProject("candidate")}
            disabled={adding || addingToSelected}
            className="node-add-btn node-add-btn--split node-add-btn--candidate"
          >
            {adding ? (
              <>
                <span className="loading-spinner node-action-spinner" />
                Добавляю...
              </>
            ) : (
              <>
                <IconPlus size="sm" className="icon-sm node-action-icon" />В
                Кандидаты
              </>
            )}
          </button>
          <button
            onClick={() => handleAddToProject("selected")}
            disabled={adding || addingToSelected}
            className="node-add-btn node-add-btn--split node-add-btn--selected"
          >
            {addingToSelected ? (
              <>
                <span className="loading-spinner node-action-spinner" />
                Добавляю...
              </>
            ) : (
              <>
                <IconCheckCircle
                  size="sm"
                  className="icon-sm node-action-icon"
                />
                В Отобранные
              </>
            )}
          </button>
        </div>
      )}

      {addMessage && (
        <div className="node-add-message">
          <IconCheckCircle size="sm" />
          {addMessage}
        </div>
      )}
    </div>
  );
}
