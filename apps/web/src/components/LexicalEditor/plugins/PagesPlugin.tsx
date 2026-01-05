import React, { useEffect, useRef } from 'react';

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

  useEffect(() => {
    if (!containerRef.current) return;

    // This plugin creates visual page boundaries
    // The actual pagination happens via CSS
    const container = containerRef.current;
    container.style.setProperty('--page-width', `${PAGE_WIDTH}px`);
    container.style.setProperty('--page-height', `${PAGE_HEIGHT}px`);
  }, []);

  return (
    <div ref={containerRef} className="pages-plugin-container">
      <div className="page-sheet">
        {children}
      </div>
    </div>
  );
}
