import React, { useEffect, useRef, useState } from "react";

/**
 * AnimatedBackground — animated gradient background with noise overlay.
 * Visibility is controlled by the parent (AppLayout).
 *
 * Theme-aware:
 *   Dark  → #074F83 / #01111D
 *   Light → #D88793 / #FFFFFF
 */
export default function AnimatedBackground() {
  const interBubbleRef = useRef<HTMLDivElement>(null);
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

  // Interactive mouse-follow bubble
  useEffect(() => {
    const interBubble = interBubbleRef.current;
    if (!interBubble) return;

    let curX = 0;
    let curY = 0;
    let tgX = 0;
    let tgY = 0;
    let animationId: number;

    const move = () => {
      curX += (tgX - curX) / 20;
      curY += (tgY - curY) / 20;
      interBubble.style.transform = `translate(${Math.round(curX)}px, ${Math.round(curY)}px)`;
      animationId = requestAnimationFrame(move);
    };

    const handleMouseMove = (event: MouseEvent) => {
      tgX = event.clientX;
      tgY = event.clientY;
    };

    window.addEventListener("mousemove", handleMouseMove);
    animationId = requestAnimationFrame(move);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      cancelAnimationFrame(animationId);
    };
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

      {/* Animated gradient blobs */}
      <div className="animated-bg__gradients">
        <div className="animated-bg__g1"></div>
        <div className="animated-bg__g2"></div>
        <div className="animated-bg__g3"></div>
        <div className="animated-bg__g4"></div>
        <div className="animated-bg__g5"></div>
        <div className="animated-bg__interactive" ref={interBubbleRef}></div>
      </div>
    </div>
  );
}
