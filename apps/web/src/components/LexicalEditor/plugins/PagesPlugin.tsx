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

  // Calculate number of pages based on content scrollWidth (horizontal due to columns)
  const calculatePages = useCallback(() => {
    if (!contentRef.current) return;
    
    // With CSS columns, scrollWidth tells us total horizontal extent
    const scrollWidth = contentRef.current.scrollWidth;
    const columnWidth = PAGE_CONTENT.widthPx;
    const gap = 24; // column gap
    
    // Calculate how many columns (pages) we have
    const newPageCount = Math.max(1, Math.ceil(scrollWidth / (columnWidth + gap)));
    
    if (newPageCount !== pageCount) {
      setPageCount(newPageCount);
    }
  }, [pageCount]);

  // Observe content changes
  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;

    const resizeObserver = new ResizeObserver(() => {
      requestAnimationFrame(calculatePages);
    });
    resizeObserver.observe(el);

    const mutationObserver = new MutationObserver(() => {
      requestAnimationFrame(calculatePages);
    });
    mutationObserver.observe(el, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
    });

    // Initial calculation with delay for rendering
    setTimeout(calculatePages, 100);

    return () => {
      resizeObserver.disconnect();
      mutationObserver.disconnect();
    };
  }, [calculatePages]);

  // Recalculate on zoom change
  useEffect(() => {
    setTimeout(calculatePages, 50);
  }, [zoom, calculatePages]);

  const pageWidthScaled = A4.widthPx * zoom;
  const pageHeightScaled = A4.heightPx * zoom;
  const contentWidthScaled = PAGE_CONTENT.widthPx * zoom;
  const contentHeightScaled = PAGE_CONTENT.heightPx * zoom;
  const gap = 24;

  // Total width for all pages in a row
  const totalWidth = pageCount * pageWidthScaled + (pageCount - 1) * gap;

  return (
    <div ref={viewportRef} className="pages-viewport">
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

      {/* Scrollable pages area */}
      <div className="pages-scroll-area">
        <div 
          className="pages-container"
          style={{
            width: totalWidth,
            minHeight: pageHeightScaled,
          }}
        >
          {/* Page backgrounds */}
          {Array.from({ length: pageCount }, (_, i) => (
            <div 
              key={i} 
              className="page-paper"
              style={{
                width: pageWidthScaled,
                height: pageHeightScaled,
                left: i * (pageWidthScaled + gap),
              }}
            >
              <div className="page-footer">
                Страница {i + 1}
              </div>
            </div>
          ))}

          {/* Single content area with CSS columns */}
          <div 
            ref={contentRef}
            className="pages-content"
            style={{
              // Position content within page margins
              position: 'absolute',
              top: PAGE_MARGIN.top * zoom,
              left: PAGE_MARGIN.left * zoom,
              
              // Height matches content area of ONE page
              height: contentHeightScaled,
              
              // Width spans all pages
              width: pageCount * contentWidthScaled + (pageCount - 1) * (PAGE_MARGIN.right + gap + PAGE_MARGIN.left) * zoom,
              
              // CSS columns for automatic content flow
              columnWidth: contentWidthScaled,
              columnGap: (PAGE_MARGIN.right + gap + PAGE_MARGIN.left) * zoom,
              columnFill: 'auto',
              
              // Scale content
              fontSize: `${15 * zoom}px`,
              lineHeight: 1.7,
            }}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
