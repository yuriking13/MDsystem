import React, { useState } from "react";
import { cn } from "../design-system/utils/cn";
import {
  CheckIcon,
  XMarkIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ArrowTopRightOnSquareIcon,
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

const STATUS_CONFIG = {
  candidate: {
    border: "border-l-amber-500",
    badge: "bg-amber-500/20 text-amber-400",
    label: "Candidate",
    icon: BeakerIcon,
  },
  selected: {
    border: "border-l-emerald-500",
    badge: "bg-emerald-500/20 text-emerald-400",
    label: "Selected",
    icon: CheckIcon,
  },
  excluded: {
    border: "border-l-rose-500",
    badge: "bg-rose-500/20 text-rose-400",
    label: "Excluded",
    icon: XMarkIcon,
  },
  deleted: {
    border: "border-l-neutral-500",
    badge: "bg-neutral-500/20 text-neutral-400",
    label: "Deleted",
    icon: XMarkIcon,
  },
};

const SOURCE_STYLES = {
  pubmed: "bg-blue-500/20 text-blue-400",
  doaj: "bg-purple-500/20 text-purple-400",
  wiley: "bg-orange-500/20 text-orange-400",
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

  const status = STATUS_CONFIG[article.status];
  const StatusIcon = status.icon;
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
        "article-card group",
        status.border,
        isSelected && "article-card--selected",
        className,
      )}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Main Content */}
      <div
        className={cn(
          "article-card-body",
          compact && "article-card-body--compact",
        )}
      >
        {/* Top Row: Checkbox + Badges */}
        <div className="article-card-top">
          {/* Selection Checkbox */}
          <label className="article-checkbox">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => onSelect(article.id)}
            />
          </label>

          {/* Badges */}
          <div className="article-badges">
            {/* Source Badge */}
            <span className={cn("article-badge", sourceStyle)}>
              {article.source.toUpperCase()}
            </span>

            {/* Publication Type */}
            {article.publicationType && (
              <span className="article-badge bg-neutral-700/50 text-neutral-300">
                {PUB_TYPE_LABELS[article.publicationType] ||
                  article.publicationType}
              </span>
            )}

            {/* Statistics Badge */}
            {article.stats?.hasStatistics && (
              <span className="article-badge bg-violet-500/20 text-violet-400">
                <ChartBarIcon className="w-3 h-3" />
                Stats
              </span>
            )}
          </div>

          {/* Year */}
          <span className="article-year">{article.year}</span>
        </div>

        {/* Title */}
        <h3
          className={cn("article-title", compact && "article-title--compact")}
          onClick={() => onOpenDetails?.(article.id)}
        >
          {displayTitle}
        </h3>

        {/* Authors & Journal */}
        <div className={cn("article-meta", compact && "article-meta--compact")}>
          <span className="article-authors">
            {authorsDisplay}
            {hasMoreAuthors && ` +${article.authors.length - 3} more`}
          </span>
          {article.journal && (
            <>
              <span className="article-meta-dot">•</span>
              <span className="article-journal">{article.journal}</span>
            </>
          )}
        </div>

        {/* IDs Row */}
        <div className="article-ids">
          {article.pmid && (
            <a
              href={`https://pubmed.ncbi.nlm.nih.gov/${article.pmid}/`}
              target="_blank"
              rel="noopener noreferrer"
              className="article-id-link"
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
              className="article-id-link"
            >
              DOI
              <ArrowTopRightOnSquareIcon className="w-3 h-3" />
            </a>
          )}
        </div>

        {/* Abstract */}
        {displayAbstract && !compact && (
          <div className="article-abstract-wrapper">
            <p
              className={cn(
                "article-abstract",
                !isExpanded && "article-abstract--collapsed",
              )}
            >
              {displayAbstract}
            </p>
            {displayAbstract.length > 150 && (
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="article-abstract-toggle"
              >
                {isExpanded ? (
                  <>
                    <ChevronUpIcon className="w-3 h-3" />
                    Hide
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
      </div>

      {/* Actions Bar */}
      <div
        className={cn(
          "article-actions",
          (showActions || isSelected) && "article-actions--visible",
        )}
      >
        {/* Status Actions */}
        <div className="article-status-actions">
          <button
            onClick={() => onStatusChange(article.id, "selected")}
            disabled={article.status === "selected"}
            className={cn(
              "article-action-btn",
              article.status === "selected"
                ? "article-action-btn--active-green"
                : "article-action-btn--green",
            )}
            title="Select"
          >
            <CheckIcon className="w-4 h-4" />
          </button>
          <button
            onClick={() => onStatusChange(article.id, "candidate")}
            disabled={article.status === "candidate"}
            className={cn(
              "article-action-btn",
              article.status === "candidate"
                ? "article-action-btn--active-amber"
                : "article-action-btn--amber",
            )}
            title="Candidate"
          >
            <BeakerIcon className="w-4 h-4" />
          </button>
          <button
            onClick={() => onStatusChange(article.id, "excluded")}
            disabled={article.status === "excluded"}
            className={cn(
              "article-action-btn",
              article.status === "excluded"
                ? "article-action-btn--active-rose"
                : "article-action-btn--rose",
            )}
            title="Exclude"
          >
            <XMarkIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Utility Actions */}
        <div className="article-util-actions">
          {onTranslate && !article.titleRu && (
            <button
              onClick={() => onTranslate(article.id)}
              className="article-action-btn article-action-btn--default"
              title="Translate"
            >
              <LanguageIcon className="w-4 h-4" />
            </button>
          )}
          {onDetectStats && !article.stats && (
            <button
              onClick={() => onDetectStats(article.id)}
              className="article-action-btn article-action-btn--default"
              title="Detect Statistics"
            >
              <ChartBarIcon className="w-4 h-4" />
            </button>
          )}
          {onCopyToClipboard && (
            <button
              onClick={() => onCopyToClipboard(article.id)}
              className="article-action-btn article-action-btn--default"
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
