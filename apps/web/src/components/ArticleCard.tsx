import React, { useState } from "react";
import { cn } from "../design-system/utils/cn";
import {
  CheckIcon,
  XMarkIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ArrowTopRightOnSquareIcon,
  BookOpenIcon,
  BeakerIcon,
  ClipboardDocumentIcon,
  LanguageIcon,
  ChartBarIcon,
} from "@heroicons/react/24/outline";

export interface ArticleAuthor {
  name: string;
  affiliation?: string;
}

export interface ArticleStats {
  hasStatistics: boolean;
  statisticalMethods?: string[];
  sampleSize?: number;
  pValues?: string[];
}

export interface ArticleData {
  id: string;
  pmid?: string;
  doi?: string;
  title: string;
  titleRu?: string;
  authors: ArticleAuthor[];
  journal?: string;
  year: number;
  abstract?: string;
  abstractRu?: string;
  publicationType?: string;
  status: "candidate" | "selected" | "excluded" | "deleted";
  sourceQuery?: string;
  source: "pubmed" | "doaj" | "wiley";
  citationCount?: number;
  hasFullText?: boolean;
  hasFreeFullText?: boolean;
  stats?: ArticleStats;
  tags?: string[];
  notes?: string;
}

interface ArticleCardProps {
  article: ArticleData;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onStatusChange: (id: string, status: ArticleData["status"]) => void;
  onOpenDetails?: (id: string) => void;
  onTranslate?: (id: string) => void;
  onDetectStats?: (id: string) => void;
  onCopyToClipboard?: (id: string) => void;
  language?: "en" | "ru";
  compact?: boolean;
  className?: string;
}

const STATUS_CONFIG: Record<
  ArticleData["status"],
  {
    bg: string;
    border: string;
    text: string;
    label: string;
    icon: React.ReactNode;
  }
> = {
  candidate: {
    bg: "bg-amber-500/10 dark:bg-amber-500/20",
    border: "border-l-amber-500",
    text: "text-amber-600 dark:text-amber-400",
    label: "Candidate",
    icon: <BeakerIcon className="w-3.5 h-3.5" />,
  },
  selected: {
    bg: "bg-emerald-500/10 dark:bg-emerald-500/20",
    border: "border-l-emerald-500",
    text: "text-emerald-600 dark:text-emerald-400",
    label: "Selected",
    icon: <CheckIcon className="w-3.5 h-3.5" />,
  },
  excluded: {
    bg: "bg-rose-500/10 dark:bg-rose-500/20",
    border: "border-l-rose-500",
    text: "text-rose-600 dark:text-rose-400",
    label: "Excluded",
    icon: <XMarkIcon className="w-3.5 h-3.5" />,
  },
  deleted: {
    bg: "bg-neutral-500/10 dark:bg-neutral-500/20",
    border: "border-l-neutral-400",
    text: "text-neutral-500 dark:text-neutral-400",
    label: "Deleted",
    icon: <XMarkIcon className="w-3.5 h-3.5" />,
  },
};

const SOURCE_STYLES: Record<ArticleData["source"], string> = {
  pubmed: "bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400",
  doaj: "bg-purple-500/10 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400",
  wiley:
    "bg-orange-500/10 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400",
};

const PUB_TYPE_LABELS: Record<string, string> = {
  systematic_review: "Systematic Review",
  meta_analysis: "Meta-Analysis",
  rct: "RCT",
  clinical_trial: "Clinical Trial",
  review: "Review",
  books: "Book",
};

export default function ArticleCard({
  article,
  isSelected,
  onSelect,
  onStatusChange,
  onOpenDetails,
  onTranslate,
  onDetectStats,
  onCopyToClipboard,
  language = "en",
  compact = false,
  className,
}: ArticleCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showActions, setShowActions] = useState(false);

  const statusConfig = STATUS_CONFIG[article.status];
  const sourceStyle = SOURCE_STYLES[article.source];

  const displayTitle =
    language === "ru" && article.titleRu ? article.titleRu : article.title;
  const displayAbstract =
    language === "ru" && article.abstractRu
      ? article.abstractRu
      : article.abstract;

  const authorsDisplay = article.authors
    .slice(0, 3)
    .map((a) => a.name)
    .join(", ");
  const hasMoreAuthors = article.authors.length > 3;

  return (
    <article
      className={cn(
        "article-mosaic-card group",
        "relative overflow-hidden rounded-2xl border-l-4 transition-all duration-200",
        "bg-white dark:bg-neutral-900",
        "border border-neutral-200 dark:border-neutral-800",
        statusConfig.border,
        isSelected &&
          "ring-2 ring-blue-500 ring-offset-2 ring-offset-white dark:ring-offset-neutral-950",
        "hover:shadow-lg hover:shadow-neutral-200/50 dark:hover:shadow-neutral-900/50",
        className,
      )}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Main Content */}
      <div className={cn("p-4", compact && "p-3")}>
        {/* Top Row: Checkbox + Badges */}
        <div className="flex items-start gap-3">
          {/* Selection Checkbox */}
          <label className="shrink-0 mt-0.5 cursor-pointer">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => onSelect(article.id)}
              className="w-4 h-4 rounded-md border-neutral-300 dark:border-neutral-600 text-blue-500 focus:ring-blue-500/30 focus:ring-offset-0"
            />
          </label>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Badges Row */}
            <div className="flex flex-wrap items-center gap-1.5 mb-2">
              {/* Status Badge */}
              <span
                className={cn(
                  "inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full",
                  statusConfig.bg,
                  statusConfig.text,
                )}
              >
                {statusConfig.icon}
                {statusConfig.label}
              </span>

              {/* Source Badge */}
              <span
                className={cn(
                  "px-2 py-0.5 text-xs font-semibold rounded-full uppercase tracking-wider",
                  sourceStyle,
                )}
              >
                {article.source}
              </span>

              {/* Publication Type */}
              {article.publicationType && (
                <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400">
                  {PUB_TYPE_LABELS[article.publicationType] ||
                    article.publicationType}
                </span>
              )}

              {/* Statistics Badge */}
              {article.stats?.hasStatistics && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-teal-500/10 text-teal-600 dark:bg-teal-500/20 dark:text-teal-400">
                  <ChartBarIcon className="w-3 h-3" />
                  Stats
                </span>
              )}

              {/* Year - Right aligned */}
              <span className="ml-auto text-xs font-medium text-neutral-400 dark:text-neutral-500">
                {article.year}
              </span>
            </div>

            {/* Title */}
            <h3
              className={cn(
                "text-base font-semibold leading-snug cursor-pointer transition-colors",
                "text-neutral-900 dark:text-neutral-100",
                "hover:text-blue-600 dark:hover:text-blue-400",
                compact && "text-sm",
              )}
              onClick={() => onOpenDetails?.(article.id)}
            >
              {displayTitle}
            </h3>

            {/* Authors & Journal */}
            <div
              className={cn(
                "mt-2 flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400",
                compact && "text-xs",
              )}
            >
              <span className="truncate">
                {authorsDisplay}
                {hasMoreAuthors && (
                  <span className="text-neutral-400 dark:text-neutral-500">
                    {" "}
                    +{article.authors.length - 3}
                  </span>
                )}
              </span>
              {article.journal && (
                <>
                  <span className="text-neutral-300 dark:text-neutral-600">
                    •
                  </span>
                  <span className="truncate italic text-neutral-500 dark:text-neutral-400">
                    {article.journal}
                  </span>
                </>
              )}
            </div>

            {/* IDs Row */}
            <div className="mt-2 flex items-center gap-4 text-xs">
              {article.pmid && (
                <a
                  href={`https://pubmed.ncbi.nlm.nih.gov/${article.pmid}/`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-neutral-500 hover:text-blue-500 transition-colors"
                >
                  PMID: {article.pmid}
                  <ArrowTopRightOnSquareIcon className="w-3 h-3" />
                </a>
              )}
              {article.doi && (
                <a
                  href={`https://doi.org/${article.doi}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-neutral-500 hover:text-blue-500 transition-colors"
                >
                  DOI
                  <ArrowTopRightOnSquareIcon className="w-3 h-3" />
                </a>
              )}
              {article.citationCount !== undefined &&
                article.citationCount > 0 && (
                  <span className="inline-flex items-center gap-1 text-neutral-500">
                    <BookOpenIcon className="w-3 h-3" />
                    {article.citationCount}
                  </span>
                )}
            </div>

            {/* Abstract (Expandable) */}
            {displayAbstract && !compact && (
              <div className="mt-3">
                <p
                  className={cn(
                    "text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed",
                    !isExpanded && "line-clamp-2",
                  )}
                >
                  {displayAbstract}
                </p>
                {displayAbstract.length > 200 && (
                  <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="mt-1 text-xs font-medium text-blue-500 hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-1 transition-colors"
                  >
                    {isExpanded ? (
                      <>
                        <ChevronUpIcon className="w-3 h-3" />
                        Show less
                      </>
                    ) : (
                      <>
                        <ChevronDownIcon className="w-3 h-3" />
                        Show more
                      </>
                    )}
                  </button>
                )}
              </div>
            )}

            {/* Statistics Preview */}
            {article.stats?.hasStatistics && isExpanded && (
              <div className="mt-3 p-3 rounded-xl bg-teal-50 dark:bg-teal-900/20">
                <h4 className="text-xs font-semibold text-teal-700 dark:text-teal-300 mb-1">
                  Statistical Methods
                </h4>
                {article.stats.statisticalMethods && (
                  <p className="text-xs text-neutral-600 dark:text-neutral-400">
                    {article.stats.statisticalMethods.join(", ")}
                  </p>
                )}
                {article.stats.sampleSize && (
                  <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1">
                    Sample size: n={article.stats.sampleSize}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Actions Bar - Appears on hover */}
      <div
        className={cn(
          "flex items-center justify-between px-4 py-2.5",
          "bg-neutral-50 dark:bg-neutral-800/50",
          "border-t border-neutral-100 dark:border-neutral-800",
          "transition-all duration-200",
          showActions || isSelected ? "opacity-100" : "opacity-0",
        )}
      >
        {/* Status Actions */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => onStatusChange(article.id, "selected")}
            disabled={article.status === "selected"}
            className={cn(
              "p-1.5 rounded-lg transition-all text-xs",
              article.status === "selected"
                ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400"
                : "text-neutral-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 dark:hover:text-emerald-400",
            )}
            title="Select"
          >
            <CheckIcon className="w-4 h-4" />
          </button>
          <button
            onClick={() => onStatusChange(article.id, "candidate")}
            disabled={article.status === "candidate"}
            className={cn(
              "p-1.5 rounded-lg transition-all text-xs",
              article.status === "candidate"
                ? "bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400"
                : "text-neutral-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/30 dark:hover:text-amber-400",
            )}
            title="Mark as Candidate"
          >
            <BeakerIcon className="w-4 h-4" />
          </button>
          <button
            onClick={() => onStatusChange(article.id, "excluded")}
            disabled={article.status === "excluded"}
            className={cn(
              "p-1.5 rounded-lg transition-all text-xs",
              article.status === "excluded"
                ? "bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400"
                : "text-neutral-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30 dark:hover:text-rose-400",
            )}
            title="Exclude"
          >
            <XMarkIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Utility Actions */}
        <div className="flex items-center gap-1">
          {onTranslate && !article.titleRu && (
            <button
              onClick={() => onTranslate(article.id)}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
              title="Translate"
            >
              <LanguageIcon className="w-4 h-4" />
            </button>
          )}
          {onDetectStats && !article.stats && (
            <button
              onClick={() => onDetectStats(article.id)}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-teal-500 hover:bg-teal-50 dark:hover:bg-teal-900/30 transition-colors"
              title="Detect Statistics"
            >
              <ChartBarIcon className="w-4 h-4" />
            </button>
          )}
          {onCopyToClipboard && (
            <button
              onClick={() => onCopyToClipboard(article.id)}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
              title="Copy Citation"
            >
              <ClipboardDocumentIcon className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
