import React, { useState, useCallback, useMemo } from 'react';
import type { Citation } from '../../lib/api';
import { 
  groupCitationsBySource, 
  sortCitationsForDisplay, 
  shouldShowSubNumber 
} from '../../lib/bibliographyManager';

interface BibliographySidebarProps {
  citations: Citation[];
  onClose: () => void;
  onRemoveCitation?: (citationId: string) => void;
  onUpdateCitationNote?: (citationId: string, note: string) => void;
}

/**
 * Список литературы документа
 * 
 * Отображает все цитаты документа с идентификаторами вида n#k, где:
 * - n — номер источника (в порядке первого появления в тексте)
 * - k — номер цитаты этого источника (1, 2, 3...)
 * 
 * Если у источника только одна цитата, отображается просто [n]
 */
export default function BibliographySidebar({
  citations = [],
  onClose,
  onRemoveCitation,
  onUpdateCitationNote,
}: BibliographySidebarProps) {
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');
  const [viewMode, setViewMode] = useState<'all' | 'bySource'>('all');
  
  // Защита от undefined/null
  const safeCitations = useMemo(() => citations || [], [citations]);
  
  // Сортируем цитаты для отображения
  const sortedCitations = useMemo(() => 
    sortCitationsForDisplay(safeCitations),
    [safeCitations]
  );
  
  // Группируем по источникам
  const groupedCitations = useMemo(() => 
    groupCitationsBySource(safeCitations),
    [safeCitations]
  );
  
  // Количество уникальных источников
  const uniqueSourcesCount = useMemo(() => 
    new Set(safeCitations.map(c => c.article_id)).size,
    [safeCitations]
  );

  const startEditNote = (citation: Citation) => {
    setEditingNoteId(citation.id);
    setNoteText(citation.note || '');
  };

  const saveNote = (citationId: string) => {
    if (onUpdateCitationNote) {
      onUpdateCitationNote(citationId, noteText);
    }
    setEditingNoteId(null);
    setNoteText('');
  };

  const cancelEditNote = () => {
    setEditingNoteId(null);
    setNoteText('');
  };

  // Переход к цитате в тексте при клике
  const handleCitationClick = useCallback((citationId: string) => {
    // Ищем элемент цитаты в редакторе по data-citation-id
    const citationEl = document.querySelector(
      `.citation-ref[data-citation-id="${citationId}"]`
    );
    
    if (citationEl) {
      // Скроллим к элементу
      citationEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      
      // Добавляем подсветку
      citationEl.classList.add('citation-highlight');
      
      // Убираем подсветку через 2 секунды
      setTimeout(() => {
        citationEl.classList.remove('citation-highlight');
      }, 2000);
    }
  }, []);

  // Форматирование отображаемого номера (n или n#k)
  const formatDisplayNumber = (citation: Citation): string => {
    const showSub = shouldShowSubNumber(safeCitations, citation.article_id);
    const subNum = citation.sub_number || 1;
    
    if (showSub) {
      return `${citation.inline_number}#${subNum}`;
    }
    return String(citation.inline_number);
  };

  // Рендер одной цитаты
  const renderCitation = (citation: Citation, showArticleInfo: boolean = true) => {
    const isEditingNote = editingNoteId === citation.id;
    const displayNum = formatDisplayNumber(citation);
    
    return (
      <div 
        key={citation.id} 
        className="bibliography-item" 
        id={`bib-${citation.id}`}
      >
        <span 
          className="bib-number bib-number-clickable"
          onClick={() => handleCitationClick(citation.id)}
          title="Перейти к цитате в тексте"
        >
          [{displayNum}]
        </span>
        <div className="bib-content">
          {showArticleInfo && (
            <div className="bib-article-info">
              {citation.article?.authors && citation.article.authors.length > 0 && (
                <div className="bib-authors">
                  {citation.article.authors.slice(0, 3).join(', ')}
                  {citation.article.authors.length > 3 && ' et al.'}
                </div>
              )}
              <div className="bib-title">{citation.article?.title_en || 'Без названия'}</div>
              {citation.article?.journal && (
                <div className="bib-journal">{citation.article.journal}</div>
              )}
              {citation.article?.year && (
                <div className="bib-year">{citation.article.year}</div>
              )}
            </div>
          )}
          
          {/* Note section - прямая цитата из текста */}
          {isEditingNote ? (
            <div className="bib-note-edit">
              <textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Добавить цитату из текста..."
                className="bib-note-input"
                rows={3}
                autoFocus
              />
              <div className="bib-note-actions">
                <button 
                  className="bib-note-save"
                  onClick={() => saveNote(citation.id)}
                >
                  ✓ Сохранить
                </button>
                <button 
                  className="bib-note-cancel"
                  onClick={cancelEditNote}
                >
                  ✕ Отмена
                </button>
              </div>
            </div>
          ) : (
            <>
              {citation.note ? (
                <div 
                  className="bib-note"
                  onClick={() => onUpdateCitationNote && startEditNote(citation)}
                  title="Нажмите чтобы редактировать"
                >
                  «{citation.note}»
                </div>
              ) : (
                onUpdateCitationNote && (
                  <button 
                    className="bib-add-note-btn"
                    onClick={() => startEditNote(citation)}
                  >
                    + Добавить цитату...
                  </button>
                )
              )}
            </>
          )}
          
          {onRemoveCitation && (
            <button
              className="bib-remove"
              onClick={() => onRemoveCitation(citation.id)}
              title="Удалить цитату"
            >
              ✕
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="bibliography-sidebar">
      <div className="bibliography-header">
        <span className="bibliography-title">
          Список литературы
          <span className="bib-count-badge" title={`${uniqueSourcesCount} источников, ${safeCitations.length} цитат`}>
            {uniqueSourcesCount}/{safeCitations.length}
          </span>
        </span>
        <div className="bibliography-controls">
          <button 
            className={`bib-view-toggle ${viewMode === 'all' ? 'active' : ''}`}
            onClick={() => setViewMode('all')}
            title="Все цитаты"
          >
            ☰
          </button>
          <button 
            className={`bib-view-toggle ${viewMode === 'bySource' ? 'active' : ''}`}
            onClick={() => setViewMode('bySource')}
            title="По источникам"
          >
            ▤
          </button>
          <button 
            className="bibliography-close" 
            onClick={onClose}
            title="Скрыть список литературы"
          >
            ✕
          </button>
        </div>
      </div>
      
      <div className="bibliography-list">
        {viewMode === 'all' ? (
          // Все цитаты в порядке нумерации
          sortedCitations.map((citation) => renderCitation(citation))
        ) : (
          // Группировка по источникам
          Array.from(groupedCitations.entries()).map(([articleId, citationInfos]) => {
            const firstCitation = safeCitations.find(c => c.article_id === articleId);
            if (!firstCitation) return null;
            
            const inlineNumber = citationInfos[0]?.number || 1;
            const citationCount = citationInfos.length;
            
            return (
              <div key={articleId} className="bibliography-source-group">
                <div className="bib-source-header">
                  <span className="bib-source-number">[{inlineNumber}]</span>
                  <div className="bib-source-info">
                    {firstCitation.article?.authors && firstCitation.article.authors.length > 0 && (
                      <div className="bib-authors">
                        {firstCitation.article.authors.slice(0, 3).join(', ')}
                        {firstCitation.article.authors.length > 3 && ' et al.'}
                      </div>
                    )}
                    <div className="bib-title">{firstCitation.article?.title_en || 'Без названия'}</div>
                    {firstCitation.article?.journal && (
                      <div className="bib-journal">{firstCitation.article.journal}</div>
                    )}
                    {firstCitation.article?.year && (
                      <div className="bib-year">{firstCitation.article.year}</div>
                    )}
                  </div>
                  {citationCount > 1 && (
                    <span className="bib-citation-count" title={`${citationCount} цитат`}>
                      ×{citationCount}
                    </span>
                  )}
                </div>
                
                {/* Список цитат этого источника */}
                <div className="bib-source-citations">
                  {citationInfos.map((info) => {
                    const citation = safeCitations.find(c => c.id === info.citationId);
                    if (!citation) return null;
                    
                    return (
                      <div key={citation.id} className="bib-sub-citation">
                        <span 
                          className="bib-sub-number bib-number-clickable"
                          onClick={() => handleCitationClick(citation.id)}
                          title="Перейти к цитате в тексте"
                        >
                          #{info.subNumber}
                        </span>
                        {citation.note ? (
                          <div 
                            className="bib-note-inline"
                            onClick={() => onUpdateCitationNote && startEditNote(citation)}
                          >
                            «{citation.note}»
                          </div>
                        ) : (
                          <span className="bib-no-note">без цитаты</span>
                        )}
                        {onRemoveCitation && (
                          <button
                            className="bib-remove-small"
                            onClick={() => onRemoveCitation(citation.id)}
                            title="Удалить цитату"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
        
        {safeCitations.length === 0 && (
          <div className="bib-empty">
            <p>Нет цитат в документе</p>
            <p className="bib-hint">Используйте кнопку «Цитата» для добавления</p>
          </div>
        )}
      </div>
    </div>
  );
}
