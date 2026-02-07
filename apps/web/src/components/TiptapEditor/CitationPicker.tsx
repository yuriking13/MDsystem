import React, { useState, useCallback, useMemo, useEffect } from 'react';
import type { Article, CitationStyle } from '../../lib/api';

interface CitationPickerProps {
  articles: Article[];
  citationStyle: CitationStyle;
  onSelect: (article: Article) => void;
  onClose: () => void;
  isLoading?: boolean;
}

type SearchField = 'all' | 'title' | 'authors' | 'journal' | 'topic';
type SourceFilter = 'all' | 'pubmed' | 'doaj' | 'wiley';

/**
 * Расширенный выбор источника для цитирования
 * 
 * Поддерживает:
 * - Поиск по названию (pubmed, wiley, DOAJ)
 * - Поиск по теме
 * - Поиск по авторам
 * - Фильтрация по источнику
 */
export default function CitationPicker({
  articles,
  citationStyle,
  onSelect,
  onClose,
  isLoading = false,
}: CitationPickerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchField, setSearchField] = useState<SearchField>('all');
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(null);

  // Focus search input on mount
  useEffect(() => {
    const input = document.getElementById('citation-search-input');
    if (input) {
      input.focus();
    }
  }, []);

  // Format citation preview based on style
  const formatCitationPreview = useCallback((article: Article): string => {
    const authors = article.authors || [];
    const firstAuthor = authors[0] || 'Anonymous';
    const title = article.title_en;
    const year = article.year || 'n.d.';
    
    const parts = firstAuthor.split(' ');
    const shortAuthor = parts.length > 1 
      ? `${parts[0]} ${parts.slice(1).map(p => p[0] + '.').join('')}`
      : parts[0];
    
    switch (citationStyle) {
      case 'gost':
        return `${shortAuthor}${authors.length > 1 ? ' et al.' : ''} ${title.slice(0, 60)}${title.length > 60 ? '...' : ''} (${year})`;
      case 'apa':
        return `${shortAuthor}${authors.length > 1 ? ' et al.' : ''} (${year}). ${title.slice(0, 50)}...`;
      case 'vancouver':
        return `${shortAuthor}${authors.length > 1 ? ' et al' : ''}. ${title.slice(0, 50)}... ${year}`;
      default:
        return `${shortAuthor} (${year}) ${title.slice(0, 50)}...`;
    }
  }, [citationStyle]);

  // Get source display name
  const getSourceName = (source: string): string => {
    switch (source?.toLowerCase()) {
      case 'pubmed':
        return 'PubMed';
      case 'doaj':
        return 'DOAJ';
      case 'wiley':
        return 'Wiley';
      case 'crossref':
        return 'Crossref';
      default:
        return source || 'Unknown';
    }
  };

  // Get source badge color
  const getSourceColor = (source: string): string => {
    switch (source?.toLowerCase()) {
      case 'pubmed':
        return '#2563eb';
      case 'doaj':
        return '#f59e0b';
      case 'wiley':
        return '#8b5cf6';
      case 'crossref':
        return '#10b981';
      default:
        return '#64748b';
    }
  };

  // Filter articles based on search and filters
  const filteredArticles = useMemo(() => {
    let result = articles;
    
    // Source filter
    if (sourceFilter !== 'all') {
      result = result.filter(a => 
        a.source?.toLowerCase() === sourceFilter
      );
    }
    
    // Search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      
      result = result.filter(article => {
        switch (searchField) {
          case 'title':
            return (
              article.title_en?.toLowerCase().includes(query) ||
              article.title_ru?.toLowerCase().includes(query)
            );
          
          case 'authors':
            return article.authors?.some(author => 
              author.toLowerCase().includes(query)
            );
          
          case 'journal':
            return article.journal?.toLowerCase().includes(query);
          
          case 'topic':
            // Search in abstract and title
            return (
              article.title_en?.toLowerCase().includes(query) ||
              article.title_ru?.toLowerCase().includes(query) ||
              article.abstract_en?.toLowerCase().includes(query) ||
              article.abstract_ru?.toLowerCase().includes(query)
            );
          
          case 'all':
          default:
            return (
              article.title_en?.toLowerCase().includes(query) ||
              article.title_ru?.toLowerCase().includes(query) ||
              article.authors?.some(author => author.toLowerCase().includes(query)) ||
              article.journal?.toLowerCase().includes(query) ||
              article.abstract_en?.toLowerCase().includes(query)
            );
        }
      });
    }
    
    // Sort by relevance (title matches first, then by year desc)
    return result.sort((a, b) => {
      // If searching, prioritize title matches
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const aInTitle = a.title_en?.toLowerCase().includes(query) ? 1 : 0;
        const bInTitle = b.title_en?.toLowerCase().includes(query) ? 1 : 0;
        if (aInTitle !== bInTitle) return bInTitle - aInTitle;
      }
      
      // Then sort by year (newest first)
      return (b.year || 0) - (a.year || 0);
    });
  }, [articles, searchQuery, searchField, sourceFilter]);

  // Get unique sources for filter
  const availableSources = useMemo(() => {
    const sources = new Set<string>();
    articles.forEach(a => {
      if (a.source) sources.add(a.source.toLowerCase());
    });
    return Array.from(sources);
  }, [articles]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'Enter' && selectedArticleId) {
      const article = articles.find(a => a.id === selectedArticleId);
      if (article) onSelect(article);
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const currentIndex = filteredArticles.findIndex(a => a.id === selectedArticleId);
      
      if (e.key === 'ArrowDown') {
        const nextIndex = currentIndex < filteredArticles.length - 1 ? currentIndex + 1 : 0;
        setSelectedArticleId(filteredArticles[nextIndex]?.id || null);
      } else {
        const prevIndex = currentIndex > 0 ? currentIndex - 1 : filteredArticles.length - 1;
        setSelectedArticleId(filteredArticles[prevIndex]?.id || null);
      }
    }
  }, [selectedArticleId, filteredArticles, articles, onSelect, onClose]);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div 
        className="citation-picker-modal" 
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Header */}
        <div className="citation-picker-header">
          <h3>📚 Выберите источник для цитирования</h3>
          <button className="modal-close" onClick={onClose}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Search */}
        <div className="citation-search-container">
          <div className="citation-search-row">
            <select 
              className="citation-search-field"
              value={searchField}
              onChange={(e) => setSearchField(e.target.value as SearchField)}
            >
              <option value="all">🔍 Все поля</option>
              <option value="title">📄 Название</option>
              <option value="authors">👤 Авторы</option>
              <option value="journal">📰 Журнал</option>
              <option value="topic">💡 Тема</option>
            </select>
            <input
              id="citation-search-input"
              type="text"
              className="citation-search-input"
              placeholder="Введите поисковый запрос..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button 
              className={`citation-filter-toggle ${showFilters ? 'active' : ''}`}
              onClick={() => setShowFilters(!showFilters)}
              title="Фильтры"
            >
              ⚙
            </button>
          </div>

          {/* Filters */}
          {showFilters && (
            <div className="citation-filters">
              <span className="citation-filter-label">Источник:</span>
              <button 
                className={`citation-filter-btn ${sourceFilter === 'all' ? 'active' : ''}`}
                onClick={() => setSourceFilter('all')}
              >
                Все
              </button>
              {availableSources.map(source => (
                <button
                  key={source}
                  className={`citation-filter-btn ${sourceFilter === source ? 'active' : ''}`}
                  onClick={() => setSourceFilter(source as SourceFilter)}
                  style={{ 
                    borderColor: sourceFilter === source ? getSourceColor(source) : undefined,
                    color: sourceFilter === source ? getSourceColor(source) : undefined
                  }}
                >
                  {getSourceName(source)}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Results count */}
        <div className="citation-results-info">
          Найдено: <strong>{filteredArticles.length}</strong> из {articles.length} статей
          {searchQuery && <span className="citation-search-hint">• Нажмите Enter для выбора</span>}
        </div>

        {/* Article list */}
        <div className="citation-article-list">
          {isLoading ? (
            <div className="citation-loading">
              <div className="citation-spinner"></div>
              Загрузка статей...
            </div>
          ) : filteredArticles.length === 0 ? (
            <div className="citation-empty">
              {articles.length === 0 ? (
                <>
                  <p>Нет отобранных статей</p>
                  <p className="citation-empty-hint">
                    Сначала отберите статьи в разделе «База статей»
                  </p>
                </>
              ) : (
                <>
                  <p>Статьи не найдены</p>
                  <p className="citation-empty-hint">
                    Попробуйте изменить поисковый запрос или фильтры
                  </p>
                </>
              )}
            </div>
          ) : (
            filteredArticles.map((article) => (
              <div
                key={article.id}
                className={`citation-article-item ${selectedArticleId === article.id ? 'selected' : ''}`}
                onClick={() => onSelect(article)}
                onMouseEnter={() => setSelectedArticleId(article.id)}
              >
                <div className="citation-article-main">
                  <div className="citation-article-title">
                    {article.title_en || article.title_ru || 'Без названия'}
                  </div>
                  <div className="citation-article-meta">
                    <span className="citation-article-authors">
                      {article.authors?.slice(0, 3).join(', ')}
                      {article.authors && article.authors.length > 3 && ' et al.'}
                    </span>
                    {article.year && (
                      <span className="citation-article-year">{article.year}</span>
                    )}
                    {article.journal && (
                      <span className="citation-article-journal">{article.journal}</span>
                    )}
                  </div>
                </div>
                <div className="citation-article-side">
                  <span 
                    className="citation-source-badge"
                    style={{ backgroundColor: getSourceColor(article.source) }}
                  >
                    {getSourceName(article.source)}
                  </span>
                  {article.has_stats && (
                    <span className="citation-stats-badge" title="Содержит статистику">
                      📊
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer with preview */}
        {selectedArticleId && (
          <div className="citation-preview">
            <div className="citation-preview-label">Превью цитаты:</div>
            <div className="citation-preview-text">
              [{formatCitationPreview(articles.find(a => a.id === selectedArticleId)!)}]
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
