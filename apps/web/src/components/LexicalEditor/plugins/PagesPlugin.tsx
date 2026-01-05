import React, { useEffect, useRef, useState, useCallback } from 'react';
import { A4, PAGE_MARGIN, PAGE_CONTENT, ZOOM_LEVELS, DEFAULT_ZOOM, canFitTwoPages } from '../pageMetrics';

interface PagesPluginProps {
  children: React.ReactNode;
  zoom?: number;
  onZoomChange?: (zoom: number) => void;
}

export default function PagesPlugin({ 
  children, 
  zoom = DEFAULT_ZOOM,
  onZoomChange 
}: PagesPluginProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [pageCount, setPageCount] = useState(1);
  const [columns, setColumns] = useState<1 | 2>(1);

  // Calculate number of pages based on content height
  const calculatePages = useCallback(() => {
    if (!contentRef.current) return;
    
    // Force layout recalculation
    const contentHeight = contentRef.current.scrollHeight;
    const pageHeight = PAGE_CONTENT.heightPx;
    const newPageCount = Math.max(1, Math.ceil(contentHeight / pageHeight));
    
    setPageCount(newPageCount);
  }, []);

  // Update columns based on viewport width
  const updateColumns = useCallback(() => {
    if (!viewportRef.current) return;
    
    const viewportWidth = viewportRef.current.clientWidth;
    setColumns(canFitTwoPages(viewportWidth, zoom) ? 2 : 1);
  }, [zoom]);

  // Observe content changes
  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;

    // Use ResizeObserver for size changes
    const resizeObserver = new ResizeObserver(() => {
      requestAnimationFrame(calculatePages);
    });
    resizeObserver.observe(el);

    // Use MutationObserver for DOM changes
    const mutationObserver = new MutationObserver(() => {
      requestAnimationFrame(calculatePages);
    });
    mutationObserver.observe(el, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
    });

    // Initial calculation
    calculatePages();

    return () => {
      resizeObserver.disconnect();
      mutationObserver.disconnect();
    };
  }, [calculatePages]);

  // Observe viewport for column layout
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;

    const resizeObserver = new ResizeObserver(updateColumns);
    resizeObserver.observe(el);
    updateColumns();

    return () => resizeObserver.disconnect();
  }, [updateColumns]);

  // CSS variables for page dimensions
  const cssVars = {
    '--page-width': `${A4.widthPx}px`,
    '--page-height': `${A4.heightPx}px`,
    '--page-content-width': `${PAGE_CONTENT.widthPx}px`,
    '--page-content-height': `${PAGE_CONTENT.heightPx}px`,
    '--margin-top': `${PAGE_MARGIN.top}px`,
    '--margin-right': `${PAGE_MARGIN.right}px`,
    '--margin-bottom': `${PAGE_MARGIN.bottom}px`,
    '--margin-left': `${PAGE_MARGIN.left}px`,
    '--zoom': zoom,
    '--page-count': pageCount,
  } as React.CSSProperties;

  return (
    <div 
      ref={viewportRef}
      className={`pages-viewport cols-${columns}`}
      style={cssVars}
    >
      {/* Zoom controls */}
      <div className="pages-zoom-controls">
        <button 
          className="zoom-btn"
          onClick={() => {
            const idx = ZOOM_LEVELS.indexOf(zoom);
            if (idx > 0) onZoomChange?.(ZOOM_LEVELS[idx - 1]);
          }}
          disabled={zoom <= ZOOM_LEVELS[0]}
          title="Уменьшить"
        >
          −
        </button>
        <span className="zoom-value">{Math.round(zoom * 100)}%</span>
        <button 
          className="zoom-btn"
          onClick={() => {
            const idx = ZOOM_LEVELS.indexOf(zoom);
            if (idx < ZOOM_LEVELS.length - 1) onZoomChange?.(ZOOM_LEVELS[idx + 1]);
          }}
          disabled={zoom >= ZOOM_LEVELS[ZOOM_LEVELS.length - 1]}
          title="Увеличить"
        >
          +
        </button>
        <span className="pages-info">
          {pageCount} {pageCount === 1 ? 'стр.' : 'стр.'}
        </span>
      </div>

      {/* Pages grid with CSS columns for content flow */}
      <div className="pages-grid">
        <div className="pages-paper-stack">
          {/* Background pages (visual only) */}
          {Array.from({ length: pageCount }, (_, i) => (
            <div key={i} className="page-background" data-page={i + 1}>
              <div className="page-header">
                {i > 0 && <span className="page-number-header">{i + 1}</span>}
              </div>
              <div className="page-footer">
                <span className="page-number-footer">Страница {i + 1}</span>
              </div>
            </div>
          ))}
          
          {/* Content layer with CSS columns */}
          <div className="pages-content-layer">
            <div 
              ref={contentRef}
              className="pages-content-flow"
            >
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
