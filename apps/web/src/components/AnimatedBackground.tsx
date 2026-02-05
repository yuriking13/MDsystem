import React, { useEffect, useState } from "react";

/**
 * AnimatedBackground — animated gradient background with noise overlay.
 * Visibility is controlled by the parent (AppLayout).
 * Fully autonomous animation — no cursor tracking.
 *
 * Theme-aware:
 *   Dark  → #074F83 / #01111D
 *   Light → #D88793 / #FFFFFF
 */
export default function AnimatedBackground() {
  const [isDark, setIsDark] = useState(() => {
    return localStorage.getItem("theme") !== "light";
  });

  // Watch for theme changes (via data-theme attribute on <html>)
  useEffect(() => {
    const observer = new MutationObserver(() => {
      const theme = document.documentElement.getAttribute("data-theme");
      setIsDark(theme !== "light");
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme", "class"],
    });
    return () => observer.disconnect();
  }, []);

  return (
    <div
      className="animated-bg"
      data-theme-mode={isDark ? "dark" : "light"}
    >
      {/* Noise texture overlay */}
      <svg
        viewBox="0 0 100% 100%"
        xmlns="http://www.w3.org/2000/svg"
        className="animated-bg__noise"
      >
        <filter id="animBgNoiseFilter">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.6"
            stitchTiles="stitch"
          />
        </filter>
        <rect
          width="100%"
          height="100%"
          preserveAspectRatio="xMidYMid meet"
          filter="url(#animBgNoiseFilter)"
        />
      </svg>

      {/* SVG blur filter (used by gradients-container) */}
      <svg xmlns="http://www.w3.org/2000/svg" className="animated-bg__svg-blur">
        <defs>
          <filter id="animBgGoo">
            <feGaussianBlur
              in="SourceGraphic"
              stdDeviation="10"
              result="blur"
            />
            <feColorMatrix
              in="blur"
              mode="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -8"
              result="goo"
            />
            <feBlend in="SourceGraphic" in2="goo" />
          </filter>
        </defs>
      </svg>

      {/* Animated gradient blobs (fully autonomous, no cursor tracking) */}
      <div className="animated-bg__gradients">
        <div className="animated-bg__g1"></div>
        <div className="animated-bg__g2"></div>
        <div className="animated-bg__g3"></div>
        <div className="animated-bg__g4"></div>
        <div className="animated-bg__g5"></div>
      </div>
    </div>
  );
}
