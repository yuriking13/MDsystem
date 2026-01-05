import React, { useEffect, useRef, useState } from 'react';
import { Badge } from 'flowbite-react';

const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;
const MM_TO_PX = 3.7795275591; // 96 DPI

const PAGE_WIDTH = A4_WIDTH_MM * MM_TO_PX; // ~794px
const PAGE_HEIGHT = A4_HEIGHT_MM * MM_TO_PX; // ~1123px

interface PagesPluginProps {
  children: React.ReactNode;
}

export default function PagesPlugin({ children }: PagesPluginProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pages, setPages] = useState([1]); // Start with one page

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    container.style.setProperty('--page-width', `${PAGE_WIDTH}px`);
    container.style.setProperty('--page-height', `${PAGE_HEIGHT}px`);

    // Observer to add pages dynamically as content grows
    const observer = new ResizeObserver(() => {
      const contentHeight = container.scrollHeight;
      const pagesNeeded = Math.max(1, Math.ceil(contentHeight / PAGE_HEIGHT));
      
      if (pagesNeeded !== pages.length) {
        setPages(Array.from({ length: pagesNeeded }, (_, i) => i + 1));
      }
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, [pages.length]);

  return (
    <div ref={containerRef} className="pages-plugin-container">
      {pages.map((pageNum) => (
        <div key={pageNum} className="page-sheet">
          <Badge color="gray" className="page-number-badge">
            Страница {pageNum}
          </Badge>
          {pageNum === 1 && children}
        </div>
      ))}
    </div>
  );
}
