import React from 'react';

interface PagesPluginProps {
  children: React.ReactNode;
}

/**
 * PagesPlugin - Renders content in a paper-like container
 * 
 * This provides a visual "paper" mode for the editor, showing content
 * in a white A4-like container. For true pagination with page breaks,
 * a more complex implementation would be needed.
 */
export default function PagesPlugin({ children }: PagesPluginProps) {
  return (
    <div className="pages-plugin-container">
      <div className="page-sheet">
        <div className="page-number-badge">
          Страница 1
        </div>
        <div className="page-content">
          {children}
        </div>
      </div>
    </div>
  );
}
