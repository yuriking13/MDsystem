import React, { useState } from "react";
import { cn } from "../design-system/utils/cn";
import {
  CheckIcon,
  XMarkIcon,
  StarIcon,
  DocumentTextIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ArrowTopRightOnSquareIcon,
  BookOpenIcon,
  BeakerIcon,
  ClipboardDocumentIcon,
  LanguageIcon,
  ChartBarIcon,
  EllipsisHorizontalIcon,
  TagIcon,
} from "@heroicons/react/24/outline";
import { StarIcon as StarIconSolid } from "@heroicons/react/24/solid";

interface ArticleAuthor {
  name: string;
  affiliation?: string;
}

interface ArticleStats {
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

const STATUS_COLORS: Record<
  ArticleData["status"],
  {
    bg: string;
    text: string;
    icon: React.ReactNode;
  }
> = {
  candidate: {
    bg: "bg-yellow-100 dark:bg-yellow-900/30",
    text: "text-yellow-700 dark:text-yellow-300",
    icon: <BeakerIcon className="w-3.5 h-3.5" />,
  },
  selected: {
    bg: "bg-green-100 dark:bg-green-900/30",
    text: "text-green-700 dark:text-green-300",
    icon: <CheckIcon className="w-3.5 h-3.5" />,
  },
  excluded: {
    bg: "bg-red-100 dark:bg-red-900/30",
    text: "text-red-700 dark:text-red-300",
    icon: <XMarkIcon className="w-3.5 h-3.5" />,
  },
  deleted: {
    bg: "bg-neutral-100 dark:bg-neutral-800",
    text: "text-neutral-500 dark:text-neutral-400",
    icon: <XMarkIcon className="w-3.5 h-3.5" />,
  },
};

const SOURCE_COLORS: Record<ArticleData["source"], string> = {
  pubmed: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300",
  doaj: "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300",
  wiley:
    "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300",
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

  const statusConfig = STATUS_COLORS[article.status];
  const sourceColor = SOURCE_COLORS[article.source];

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
    <div
      className={cn(
        "group relative bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700/50 rounded-xl overflow-hidden transition-all duration-200",
        isSelected && "ring-2 ring-blue-500 border-blue-500",
        "hover:shadow-lg hover:border-neutral-300 dark:hover:border-neutral-600",
        className,
      )}
    >
      {/* Main Content */}
      <div className={cn("p-4", compact && "p-3")}>
        {/* Top Row: Checkbox + Title + Status */}
        <div className="flex items-start gap-3">
          {/* Selection Checkbox */}
          <label className="flex-shrink-0 mt-1 cursor-pointer">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => onSelect(article.id)}
              className="w-4 h-4 rounded border-neutral-300 dark:border-neutral-600 text-blue-500 focus:ring-blue-500/50"
            />
          </label>

          {/* Title & Meta */}
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
                {article.status.charAt(0).toUpperCase() +
                  article.status.slice(1)}
              </span>

              {/* Source Badge */}
              <span
                className={cn(
                  "px-2 py-0.5 text-xs font-medium rounded-full",
                  sourceColor,
                )}
              >
                {article.source.toUpperCase()}
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
                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300">
                  <ChartBarIcon className="w-3 h-3" />
                  Stats
                </span>
              )}

              {/* Full Text Badge */}
              {article.hasFreeFullText && (
                <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
                  Free Full Text
                </span>
              )}

              {/* Year */}
              <span className="text-xs text-neutral-400 ml-auto">
                {article.year}
              </span>
            </div>

            {/* Title */}
            <h3
              className={cn(
                "text-base font-semibold text-neutral-900 dark:text-neutral-100 leading-snug cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors",
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
                {hasMoreAuthors && ` +${article.authors.length - 3} more`}
              </span>
              {article.journal && (
                <>
                  <span className="text-neutral-300 dark:text-neutral-600">
                    •
                  </span>
                  <span className="truncate italic">{article.journal}</span>
                </>
              )}
            </div>

            {/* IDs Row */}
            <div className="mt-2 flex items-center gap-3 text-xs text-neutral-500">
              {article.pmid && (
                <a
                  href={`https://pubmed.ncbi.nlm.nih.gov/${article.pmid}/`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 hover:text-blue-500 transition-colors"
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
                  className="inline-flex items-center gap-1 hover:text-blue-500 transition-colors"
                >
                  DOI:{" "}
                  {article.doi.length > 30
                    ? `${article.doi.slice(0, 30)}...`
                    : article.doi}
                  <ArrowTopRightOnSquareIcon className="w-3 h-3" />
                </a>
              )}
              {article.citationCount !== undefined && (
                <span className="inline-flex items-center gap-1">
                  <BookOpenIcon className="w-3 h-3" />
                  {article.citationCount} citations
                </span>
              )}
            </div>

            {/* Tags */}
            {article.tags && article.tags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {article.tags.map((tag, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 px-1.5 py-0.5 text-xs rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400"
                  >
                    <TagIcon className="w-3 h-3" />
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Abstract (Expandable) */}
        {displayAbstract && !compact && (
          <div className="mt-3 pl-7">
            <div
              className={cn(
                "text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed",
                !isExpanded && "line-clamp-2",
              )}
            >
              {displayAbstract}
            </div>
            {displayAbstract.length > 200 && (
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="mt-1 text-xs text-blue-500 hover:text-blue-600 flex items-center gap-1"
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
          <div className="mt-3 pl-7 p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg text-sm">
            <h4 className="font-medium text-emerald-700 dark:text-emerald-300 mb-1">
              Statistical Methods
            </h4>
            {article.stats.statisticalMethods && (
              <p className="text-neutral-600 dark:text-neutral-400 text-xs">
                {article.stats.statisticalMethods.join(", ")}
              </p>
            )}
            {article.stats.sampleSize && (
              <p className="text-neutral-600 dark:text-neutral-400 text-xs mt-1">
                Sample size: n={article.stats.sampleSize}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Actions Bar */}
      <div
        className={cn(
          "flex items-center justify-between px-4 py-2 bg-neutral-50 dark:bg-neutral-800/50 border-t border-neutral-200 dark:border-neutral-700/50",
          "opacity-0 group-hover:opacity-100 transition-opacity",
          showActions && "opacity-100",
        )}
      >
        {/* Status Actions */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => onStatusChange(article.id, "selected")}
            disabled={article.status === "selected"}
            className={cn(
              "p-1.5 rounded-lg transition-colors text-xs flex items-center gap-1",
              article.status === "selected"
                ? "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400"
                : "hover:bg-green-100 dark:hover:bg-green-900/30 text-neutral-500 hover:text-green-600",
            )}
            title="Select"
          >
            <CheckIcon className="w-4 h-4" />
          </button>
          <button
            onClick={() => onStatusChange(article.id, "candidate")}
            disabled={article.status === "candidate"}
            className={cn(
              "p-1.5 rounded-lg transition-colors text-xs flex items-center gap-1",
              article.status === "candidate"
                ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400"
                : "hover:bg-yellow-100 dark:hover:bg-yellow-900/30 text-neutral-500 hover:text-yellow-600",
            )}
            title="Mark as Candidate"
          >
            <BeakerIcon className="w-4 h-4" />
          </button>
          <button
            onClick={() => onStatusChange(article.id, "excluded")}
            disabled={article.status === "excluded"}
            className={cn(
              "p-1.5 rounded-lg transition-colors text-xs flex items-center gap-1",
              article.status === "excluded"
                ? "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400"
                : "hover:bg-red-100 dark:hover:bg-red-900/30 text-neutral-500 hover:text-red-600",
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
              className="p-1.5 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-500 hover:text-blue-500 transition-colors"
              title="Translate"
            >
              <LanguageIcon className="w-4 h-4" />
            </button>
          )}
          {onDetectStats && !article.stats && (
            <button
              onClick={() => onDetectStats(article.id)}
              className="p-1.5 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-500 hover:text-emerald-500 transition-colors"
              title="Detect Statistics"
            >
              <ChartBarIcon className="w-4 h-4" />
            </button>
          )}
          {onCopyToClipboard && (
            <button
              onClick={() => onCopyToClipboard(article.id)}
              className="p-1.5 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 transition-colors"
              title="Copy Citation"
            >
              <ClipboardDocumentIcon className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => setShowActions(!showActions)}
            className="p-1.5 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-500 transition-colors md:hidden"
          >
            <EllipsisHorizontalIcon className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
