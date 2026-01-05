import React from 'react';

interface Heading {
  level: number;
  text: string;
  id: string;
}

interface DocumentOutlineProps {
  headings: Heading[];
  onNavigate: (id: string) => void;
  onClose: () => void;
}

export default function DocumentOutline({ headings, onNavigate, onClose }: DocumentOutlineProps) {
  if (headings.length === 0) {
    return null;
  }

  return (
    <div className="document-outline">
      <div className="outline-header">
        <span className="outline-title">📑 Содержание</span>
        <button 
          className="outline-close" 
          onClick={onClose}
          title="Скрыть содержание"
        >
          ✕
        </button>
      </div>
      <nav className="outline-nav">
        {headings.map((heading, index) => (
          <button
            key={`${heading.id}-${index}`}
            className={`outline-item outline-level-${heading.level}`}
            onClick={() => onNavigate(heading.id)}
            title={heading.text}
          >
            <span className="outline-number">
              {heading.level === 1 ? '●' : heading.level === 2 ? '○' : '·'}
            </span>
            <span className="outline-text">
              {heading.text || '(без названия)'}
            </span>
          </button>
        ))}
      </nav>
    </div>
  );
}
