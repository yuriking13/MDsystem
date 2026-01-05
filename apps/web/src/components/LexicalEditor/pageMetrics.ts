// Page metrics for A4 at 96 DPI
export const PX_PER_INCH = 96;
export const MM_PER_INCH = 25.4;

export const A4 = {
  widthMm: 210,
  heightMm: 297,
  widthPx: Math.round((210 / MM_PER_INCH) * PX_PER_INCH),   // ~794
  heightPx: Math.round((297 / MM_PER_INCH) * PX_PER_INCH),  // ~1123
};

export const PAGE_MARGIN = {
  top: 72,    // ~19mm
  right: 85,  // ~22mm  
  bottom: 72, // ~19mm
  left: 56,   // ~15mm (GOST requires asymmetric margins for binding)
};

export const PAGE_CONTENT = {
  widthPx: A4.widthPx - PAGE_MARGIN.left - PAGE_MARGIN.right,  // ~653
  heightPx: A4.heightPx - PAGE_MARGIN.top - PAGE_MARGIN.bottom, // ~979
};

// Zoom levels
export const ZOOM_LEVELS = [0.5, 0.75, 1, 1.25, 1.5];
export const DEFAULT_ZOOM = 0.75;

// Calculate if viewport can fit 2 pages
export function canFitTwoPages(viewportWidth: number, zoom: number, gap: number = 24): boolean {
  const pageWidth = A4.widthPx * zoom;
  return viewportWidth >= (pageWidth * 2 + gap * 3);
}
