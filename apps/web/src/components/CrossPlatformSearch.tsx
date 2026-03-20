import React, { useState, useCallback, useEffect } from "react";
import {
  apiCrossPlatformSearch,
  apiGetSearchProviders,
  apiImportSearchResults,
  type SearchQuery,
  type SearchResult,
  type SearchProvider,
  type SearchProvidersResponse,
} from "../lib/api";

interface CrossPlatformSearchProps {
  projectId: string;
  onAddToSelected?: (articleIds: string[]) => void;
  onSearchComplete?: (results: SearchResult[], query: string) => void;
  className?: string;
}

interface SearchFilters {
  yearFrom?: number;
  yearTo?: number;
  language: "en" | "ru" | "any";
  sortBy: "relevance" | "date" | "citations";
  providers: SearchProvider[];
}

const DEFAULT_FILTERS: SearchFilters = {
  language: "any",
  sortBy: "relevance",
  providers: ["pubmed", "crossref"],
};

export default function CrossPlatformSearch({
  projectId,
  onAddToSelected,
  onSearchComplete,
  className = "",
}: CrossPlatformSearchProps) {
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<SearchFilters>(DEFAULT_FILTERS);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [searchStats, setSearchStats] = useState<{
    totalFound: number;
    searchTime: number;
    cached: boolean;
    providers: Record<
      string,
      { count: number; status: string; error?: string }
    >;
  } | null>(null);
  const [selectedResults, setSelectedResults] = useState<Set<string>>(
    new Set(),
  );
  const [availableProviders, setAvailableProviders] =
    useState<SearchProvidersResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Загрузка доступных провайдеров
  useEffect(() => {
    const loadProviders = async () => {
      try {
        const providers = await apiGetSearchProviders();
        setAvailableProviders(providers);
      } catch (err) {
        console.error("Failed to load search providers:", err);
      }
    };
    loadProviders();
  }, []);

  const handleSearch = useCallback(async () => {
    if (!query.trim() || isSearching) return;

    setIsSearching(true);
    setError(null);
    setResults([]);
    setSelectedResults(new Set());

    try {
      const searchQuery: SearchQuery = {
        query: query.trim(),
        providers: filters.providers,
        maxResults: 50,
        yearFrom: filters.yearFrom,
        yearTo: filters.yearTo,
        language: filters.language,
        sortBy: filters.sortBy,
        projectId,
      };

      const response = await apiCrossPlatformSearch(searchQuery);

      if (response.success) {
        setResults(response.data.results);
        setSearchStats({
          totalFound: response.data.totalFound,
          searchTime: response.data.searchTime,
          cached: response.data.cached,
          providers: response.data.providers,
        });
        onSearchComplete?.(response.data.results, query);
      } else {
        setError("Ошибка поиска");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Произошла ошибка поиска");
    } finally {
      setIsSearching(false);
    }
  }, [query, filters, projectId, onSearchComplete, isSearching]);

  const handleImportSelected = useCallback(async () => {
    const selectedIds = Array.from(selectedResults);
    if (selectedIds.length === 0 || isImporting) return;

    setIsImporting(true);

    try {
      const searchResults = results
        .filter((result) => selectedIds.includes(result.id))
        .map((result) => ({
          id: result.id,
          provider: result.provider,
          title: result.title,
          authors: result.authors,
          abstract: result.abstract,
          doi: result.doi,
          pmid: result.pmid,
          arxivId: result.arxivId,
          journal: result.journal,
          year: result.year,
          url: result.url,
        }));

      const response = await apiImportSearchResults({
        projectId,
        searchResults,
      });

      if (response.success && onAddToSelected) {
        const importedIds = response.imported.map((item) => item.id);
        onAddToSelected(importedIds);

        // Удаляем импортированные результаты из выбранных
        setSelectedResults((prev) => {
          const newSet = new Set(prev);
          importedIds.forEach((id) => newSet.delete(id));
          return newSet;
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка импорта");
    } finally {
      setIsImporting(false);
    }
  }, [selectedResults, results, projectId, onAddToSelected, isImporting]);

  const toggleResultSelection = useCallback((resultId: string) => {
    setSelectedResults((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(resultId)) {
        newSet.delete(resultId);
      } else {
        newSet.add(resultId);
      }
      return newSet;
    });
  }, []);

  const selectAllResults = useCallback(() => {
    setSelectedResults(new Set(results.map((r) => r.id)));
  }, [results]);

  const clearSelection = useCallback(() => {
    setSelectedResults(new Set());
  }, []);

  // Provider icons removed — handled via CSS classes per Flowbite-only rule

  const getProviderColor = (provider: SearchProvider) => {
    switch (provider) {
      case "pubmed":
        return "bg-blue-100 text-blue-800";
      case "crossref":
        return "bg-green-100 text-green-800";
      case "arxiv":
        return "bg-orange-100 text-orange-800";
      case "semantic":
        return "bg-purple-100 text-purple-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className={`cross-platform-search ${className}`}>
      {/* Search Form */}
      <div className="search-form space-y-4 p-4 border rounded-lg bg-gray-50">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Поисковый запрос
          </label>
          <div className="flex space-x-2">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="Введите ключевые слова, DOI, PMID или имя автора..."
              className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              disabled={isSearching}
            />
            <button
              onClick={handleSearch}
              disabled={isSearching || !query.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSearching ? (
                <div className="flex items-center space-x-2">
                  <svg
                    className="animate-spin w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 0 1 8-8V0l4 4-4 4V4a4 4 0 0 0-4 4H4z"
                    />
                  </svg>
                  <span>Поиск...</span>
                </div>
              ) : (
                "Найти"
              )}
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Providers */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Источники
            </label>
            <div className="space-y-2">
              {availableProviders?.providers.map((provider) => (
                <label key={provider.id} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={filters.providers.includes(provider.id)}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setFilters((prev) => ({
                        ...prev,
                        providers: checked
                          ? [...prev.providers, provider.id]
                          : prev.providers.filter((p) => p !== provider.id),
                      }));
                    }}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">
                    {provider.name}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Year Range */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Годы
            </label>
            <div className="space-y-2">
              <input
                type="number"
                placeholder="С года"
                value={filters.yearFrom || ""}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    yearFrom: e.target.value
                      ? parseInt(e.target.value)
                      : undefined,
                  }))
                }
                className="w-full text-sm rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                min="1800"
                max="2030"
              />
              <input
                type="number"
                placeholder="По год"
                value={filters.yearTo || ""}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    yearTo: e.target.value
                      ? parseInt(e.target.value)
                      : undefined,
                  }))
                }
                className="w-full text-sm rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                min="1800"
                max="2030"
              />
            </div>
          </div>

          {/* Language */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Язык
            </label>
            <select
              value={filters.language}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  language: e.target.value as "en" | "ru" | "any",
                }))
              }
              className="w-full text-sm rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="any">Любой язык</option>
              <option value="en">Только английский</option>
              <option value="ru">Только русский</option>
            </select>
          </div>

          {/* Sort By */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Сортировка
            </label>
            <select
              value={filters.sortBy}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  sortBy: e.target.value as "relevance" | "date" | "citations",
                }))
              }
              className="w-full text-sm rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="relevance">Релевантность</option>
              <option value="date">Дата (новые первыми)</option>
              <option value="citations">Количество цитирований</option>
            </select>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Search Stats */}
      {searchStats && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
          <div className="flex items-center justify-between text-sm text-blue-800">
            <span>
              Найдено <strong>{searchStats.totalFound}</strong> results in{" "}
              <strong>{searchStats.searchTime}ms</strong>
              {searchStats.cached && " (из кеша)"}
            </span>
            <div className="flex items-center space-x-2">
              {Object.entries(searchStats.providers).map(
                ([provider, stats]: [string, { count: number }]) => (
                  <span
                    key={provider}
                    className={`px-2 py-1 text-xs rounded-full ${getProviderColor(provider as SearchProvider)}`}
                  >
                    {stats.count}
                  </span>
                ),
              )}
            </div>
          </div>
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div className="mt-4">
          {/* Selection Controls */}
          <div className="flex items-center justify-between p-3 bg-gray-50 border-b">
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                {selectedResults.size} из {results.length} выбрано
              </span>
              <div className="flex space-x-2">
                <button
                  onClick={selectAllResults}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  Выбрать все
                </button>
                <button
                  onClick={clearSelection}
                  className="text-sm text-gray-600 hover:text-gray-800"
                >
                  Сбросить
                </button>
              </div>
            </div>
            {selectedResults.size > 0 && (
              <button
                onClick={handleImportSelected}
                disabled={isImporting}
                className="px-3 py-1 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                {isImporting
                  ? "Импорт..."
                  : `Импортировать ${selectedResults.size} статей`}
              </button>
            )}
          </div>

          {/* Results List */}
          <div className="max-h-96 overflow-y-auto">
            {results.map((result) => (
              <div
                key={result.id}
                className={`p-4 border-b hover:bg-gray-50 ${
                  selectedResults.has(result.id)
                    ? "bg-blue-50 border-blue-200"
                    : ""
                }`}
              >
                <div className="flex items-start space-x-3">
                  <input
                    type="checkbox"
                    checked={selectedResults.has(result.id)}
                    onChange={() => toggleResultSelection(result.id)}
                    className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-2">
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${getProviderColor(result.provider)}`}
                      >
                        {result.provider.toUpperCase()}
                      </span>
                      {result.year && (
                        <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full">
                          {result.year}
                        </span>
                      )}
                      <span className="text-xs text-gray-500">
                        Рел.: {(result.score * 100).toFixed(0)}%
                      </span>
                    </div>

                    <h4 className="font-medium text-gray-900 leading-tight mb-2">
                      {result.url ? (
                        <a
                          href={result.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          {result.title}
                        </a>
                      ) : (
                        result.title
                      )}
                    </h4>

                    {result.authors.length > 0 && (
                      <p className="text-sm text-gray-600 mb-2">
                        {result.authors.slice(0, 3).join(", ")}
                        {result.authors.length > 3 &&
                          ` и ещё ${result.authors.length - 3}`}
                      </p>
                    )}

                    {result.journal && (
                      <p className="text-sm text-gray-600 mb-2">
                        <em>{result.journal}</em>
                        {result.citationCount && (
                          <span className="ml-2 text-xs text-gray-500">
                            ({result.citationCount} цитирований)
                          </span>
                        )}
                      </p>
                    )}

                    {result.abstract && (
                      <p className="text-sm text-gray-700 line-clamp-2">
                        {result.abstract}
                      </p>
                    )}

                    {(result.doi || result.pmid || result.arxivId) && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {result.doi && (
                          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                            DOI: {result.doi}
                          </span>
                        )}
                        {result.pmid && (
                          <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                            PMID: {result.pmid}
                          </span>
                        )}
                        {result.arxivId && (
                          <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded">
                            arXiv: {result.arxivId}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!isSearching && results.length === 0 && query && (
        <div className="mt-8 text-center py-8">
          <svg
            className="mx-auto w-12 h-12 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <h3 className="mt-2 text-lg font-medium text-gray-900">
            Ничего не найдено
          </h3>
          <p className="mt-1 text-gray-500">
            Попробуйте изменить запрос или фильтры
          </p>
        </div>
      )}
    </div>
  );
}
