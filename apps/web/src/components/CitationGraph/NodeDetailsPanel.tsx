import React, { useState, useEffect } from "react";
import { cn } from "../../design-system/utils/cn";
import {
  IconClose as XMarkIcon,
  IconCalendar as CalendarIcon,
  IconTag as TagIcon,
  IconDocumentText as DocumentTextIcon,
  IconTrendingUp as ArrowTrendingUpIcon,
  IconStar as StarIcon,
  IconCheckCircle as CheckCircleIcon,
  IconPlus as PlusIcon,
  IconExternalLink as ArrowTopRightOnSquareIcon,
  IconRefresh as ArrowPathIcon,
  IconTranslate as LanguageIcon,
  IconLink as LinkIcon,
  IconCheckCircleFilled as CheckCircleSolidIcon,
} from "../FlowbiteIcons";
import {
  apiGetArticleByPmid,
  apiTranslateText,
  apiImportFromGraph,
} from "../../lib/api";
import { getErrorMessage } from "../../lib/errorUtils";

interface NodeDetailsPanelProps {
  node: {
    id: string;
    pmid?: string;
    doi?: string;
    title?: string;
    title_ru?: string;
    abstract?: string;
    abstract_ru?: string;
    authors?: string;
    journal?: string;
    year?: number;
    citedByCount?: number;
    statsQuality?: number;
    graphLevel?: number;
    label?: string;
    status?: string;
    source?: "pubmed" | "doaj" | "wiley";
  };
  projectId: string;
  onClose: () => void;
  onRefresh?: () => void;
  globalLang?: "en" | "ru";
  className?: string;
}

interface EnrichedNodeData {
  title: string | null;
  title_ru: string | null;
  abstract: string | null;
  abstract_ru: string | null;
  authors: string | null;
  journal: string | null;
  year: number | null;
  doi: string | null;
  citedByCount: number;
}

function getLevelColor(level: number): string {
  const colors: Record<number, string> = {
    0: "#ec4899", // citing - pink
    1: "#22c55e", // selected - green
    2: "#3b82f6", // candidate - blue
    3: "#f97316", // reference - orange
    4: "#ef4444", // excluded - red
    5: "#06b6d4", // related - cyan
  };
  return colors[level] || "#6b7280";
}

function getLevelName(level: number): string {
  const names: Record<number, string> = {
    0: "Citing",
    1: "Selected",
    2: "Candidate",
    3: "Reference",
    4: "Excluded",
    5: "Related",
  };
  return names[level] || "Unknown";
}

export default function NodeDetailsPanel({
  node,
  projectId,
  onClose,
  onRefresh,
  globalLang = "en",
  className,
}: NodeDetailsPanelProps) {
  const [adding, setAdding] = useState(false);
  const [addingToSelected, setAddingToSelected] = useState(false);
  const [addMessage, setAddMessage] = useState<string | null>(null);
  const [localLanguage, setLocalLanguage] = useState<"en" | "ru" | null>(null);
  const [loadingData, setLoadingData] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [translationError, setTranslationError] = useState<string | null>(null);
  const [enrichedData, setEnrichedData] = useState<EnrichedNodeData | null>(
    null,
  );

  const language = localLanguage ?? globalLang;

  // Load full data if node doesn't have title
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

  const handleTranslate = async () => {
    const titleToTranslate = enrichedData?.title || node.title;
    const abstractToTranslate = enrichedData?.abstract || node.abstract;

    if (!titleToTranslate && !abstractToTranslate) {
      setTranslationError("Nothing to translate");
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
        setTranslationError(result.error || "Translation error");
      }
    } catch (err) {
      setTranslationError(getErrorMessage(err));
    } finally {
      setTranslating(false);
    }
  };

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
      setAddMessage("No PMID or DOI to add");
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
      const statusLabel = status === "selected" ? "Selected" : "Candidates";
      setAddMessage(res.message || `Article added to ${statusLabel}!`);
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
  const showAddButtons = level === 0 || level === 2 || level === 3;

  return (
    <div
      className={cn(
        "w-80 bg-slate-900 border-l border-slate-700/50 flex flex-col overflow-hidden",
        className,
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/50">
        <div className="flex items-center gap-2">
          <span
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: getLevelColor(level) }}
          />
          <span
            className="text-xs font-medium px-2 py-0.5 rounded-full"
            style={{
              backgroundColor: `${getLevelColor(level)}20`,
              color: getLevelColor(level),
            }}
          >
            {getLevelName(level)}
          </span>
          {node.source && (
            <span className="text-xs text-slate-500 uppercase">
              {node.source}
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-slate-700/50 text-slate-400 hover:text-slate-200 transition-colors"
        >
          <XMarkIcon className="w-5 h-5" />
        </button>
      </div>

      {/* Language Toggle */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-800/50 border-b border-slate-700/50">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setLocalLanguage("en")}
            disabled={translating}
            className={cn(
              "px-3 py-1 text-xs font-medium rounded-md transition-colors",
              language === "en"
                ? "bg-blue-600 text-white"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-700/50",
            )}
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
            className={cn(
              "px-3 py-1 text-xs font-medium rounded-md transition-colors",
              language === "ru"
                ? "bg-blue-600 text-white"
                : translating
                  ? "bg-blue-600/50 text-white/70"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-700/50",
            )}
          >
            {translating ? (
              <ArrowPathIcon className="w-3 h-3 animate-spin" />
            ) : (
              "RU"
            )}
          </button>
        </div>
        {!hasRussian && !translating && (
          <span className="text-xs text-slate-500">Click RU to translate</span>
        )}
      </div>

      {/* Translation error */}
      {translationError && (
        <div className="px-4 py-2 bg-red-500/10 border-b border-red-500/20">
          <p className="text-xs text-red-400">{translationError}</p>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Title */}
        <div className="p-4 border-b border-slate-700/50">
          {loadingData ? (
            <div className="animate-pulse space-y-2">
              <div className="h-5 bg-slate-700 rounded w-full" />
              <div className="h-5 bg-slate-700 rounded w-3/4" />
            </div>
          ) : (
            <>
              <h3 className="text-sm font-semibold text-slate-200 leading-snug">
                {displayTitle || node.label || "Untitled"}
              </h3>
              {displayData.authors && (
                <p className="text-xs text-slate-400 mt-2 line-clamp-2">
                  {displayData.authors}
                </p>
              )}
              {displayData.journal && (
                <p className="text-xs text-slate-500 mt-1 italic">
                  {displayData.journal}
                </p>
              )}
            </>
          )}
        </div>

        {/* Abstract */}
        {displayAbstract && (
          <div className="p-4 border-b border-slate-700/50">
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
              Abstract
            </h4>
            <p className="text-sm text-slate-300 leading-relaxed line-clamp-6">
              {displayAbstract}
            </p>
            {displayAbstract.length > 300 && (
              <button className="text-xs text-blue-400 hover:text-blue-300 mt-2">
                Read more...
              </button>
            )}
          </div>
        )}

        {/* Metadata */}
        <div className="p-4 space-y-3">
          {displayData.year && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-400">
                <CalendarIcon className="w-4 h-4" />
                <span className="text-xs">Year</span>
              </div>
              <span className="text-sm text-slate-200">{displayData.year}</span>
            </div>
          )}

          {node.pmid && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-400">
                <TagIcon className="w-4 h-4" />
                <span className="text-xs">PMID</span>
              </div>
              <a
                href={`https://pubmed.ncbi.nlm.nih.gov/${node.pmid}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-sm text-blue-400 hover:text-blue-300 transition-colors"
              >
                {node.pmid}
                <ArrowTopRightOnSquareIcon className="w-3 h-3" />
              </a>
            </div>
          )}

          {displayData.doi && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-400">
                <LinkIcon className="w-4 h-4" />
                <span className="text-xs">DOI</span>
              </div>
              <a
                href={`https://doi.org/${displayData.doi}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-sm text-blue-400 hover:text-blue-300 transition-colors truncate max-w-45"
                title={displayData.doi}
              >
                {displayData.doi.length > 25
                  ? `${displayData.doi.substring(0, 25)}...`
                  : displayData.doi}
                <ArrowTopRightOnSquareIcon className="w-3 h-3 shrink-0" />
              </a>
            </div>
          )}

          {displayData.citedByCount > 0 && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-400">
                <ArrowTrendingUpIcon className="w-4 h-4" />
                <span className="text-xs">Citations</span>
              </div>
              <span className="text-sm text-emerald-400 font-medium">
                {displayData.citedByCount.toLocaleString()}
              </span>
            </div>
          )}

          {node.statsQuality && node.statsQuality > 0 && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-400">
                <StarIcon className="w-4 h-4" />
                <span className="text-xs">P-value Quality</span>
              </div>
              <span className="text-sm text-amber-400">
                {"★".repeat(node.statsQuality)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      {showAddButtons && (
        <div className="p-4 border-t border-slate-700/50 space-y-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleAddToProject("candidate")}
              disabled={adding || addingToSelected}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors",
                adding
                  ? "bg-slate-700 text-slate-400"
                  : "bg-blue-600 hover:bg-blue-500 text-white",
              )}
            >
              {adding ? (
                <ArrowPathIcon className="w-4 h-4 animate-spin" />
              ) : (
                <PlusIcon className="w-4 h-4" />
              )}
              Candidate
            </button>
            <button
              onClick={() => handleAddToProject("selected")}
              disabled={adding || addingToSelected}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors",
                addingToSelected
                  ? "bg-slate-700 text-slate-400"
                  : "bg-emerald-600 hover:bg-emerald-500 text-white",
              )}
            >
              {addingToSelected ? (
                <ArrowPathIcon className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircleSolidIcon className="w-4 h-4" />
              )}
              Selected
            </button>
          </div>

          {addMessage && (
            <div className="flex items-center gap-2 px-3 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
              <CheckCircleIcon className="w-4 h-4 text-emerald-400" />
              <span className="text-xs text-emerald-400">{addMessage}</span>
            </div>
          )}
        </div>
      )}

      {/* Quick Links */}
      <div className="p-4 border-t border-slate-700/50 bg-slate-800/30">
        <div className="flex items-center gap-2">
          {node.pmid && (
            <a
              href={`https://pubmed.ncbi.nlm.nih.gov/${node.pmid}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs bg-slate-700/50 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors"
            >
              <DocumentTextIcon className="w-4 h-4" />
              PubMed
            </a>
          )}
          {displayData.doi && (
            <a
              href={`https://doi.org/${displayData.doi}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs bg-slate-700/50 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors"
            >
              <LinkIcon className="w-4 h-4" />
              DOI
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
