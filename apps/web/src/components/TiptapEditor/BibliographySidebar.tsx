import React, { useState } from 'react';
import type { Citation } from '../../lib/api';

interface BibliographySidebarProps {
  citations: Citation[];
  onClose: () => void;
  onRemoveCitation?: (citationId: string) => void;
  onUpdateCitationNote?: (citationId: string, note: string) => void;
}

export default function BibliographySidebar({
  citations = [],
  onClose,
  onRemoveCitation,
  onUpdateCitationNote,
}: BibliographySidebarProps) {
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');
  
  // Защита от undefined/null
  const safeCitations = citations || [];

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

  return (
    <div className="bibliography-sidebar">
      <div className="bibliography-header">
        <span className="bibliography-title">Список литературы ({safeCitations.length})</span>
        <button 
          className="bibliography-close" 
          onClick={onClose}
          title="Скрыть список литературы"
        >
          ✕
        </button>
      </div>
      <div className="bibliography-list">
        {safeCitations.map((citation) => {
          const subNum = citation.sub_number || 1;
          const displayNum = subNum > 1 ? `${citation.inline_number}.${subNum}` : String(citation.inline_number);
          const isEditingNote = editingNoteId === citation.id;
          
          return (
            <div key={citation.id} className="bibliography-item" id={`bib-${citation.id}`}>
              <span className="bib-number">[{displayNum}]</span>
              <div className="bib-content">
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
                
                {/* Note section */}
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
                          + Добавить цитату из текста...
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
        })}
      </div>
    </div>
  );
}
