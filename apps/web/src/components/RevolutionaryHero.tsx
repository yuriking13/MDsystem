import React, { useEffect, useRef } from "react";
import { Link } from "react-router-dom";

interface RevolutionaryHeroProps {
  title: string;
  subtitle: string;
  description: string;
  ctaText: string;
  ctaLink: string;
  secondaryText?: string;
  secondaryLink?: string;
}

export default function RevolutionaryHero({
  title,
  subtitle,
  description,
  ctaText,
  ctaLink,
  secondaryText,
  secondaryLink,
}: RevolutionaryHeroProps) {
  const moleculeRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let progressTimer: number | undefined;

    // Animated progress bar on load
    const progressBar = progressRef.current;
    if (progressBar) {
      progressTimer = window.setTimeout(() => {
        progressBar.classList.add("progress-animated");
      }, 500);
    }

    // Floating molecule animation
    const molecule = moleculeRef.current;
    if (!molecule) {
      return () => {
        if (progressTimer !== undefined) {
          window.clearTimeout(progressTimer);
        }
      };
    }

    let mouseX = 0;
    let mouseY = 0;

    const handleMouseMove = (e: MouseEvent) => {
      mouseX = e.clientX / window.innerWidth - 0.5;
      mouseY = e.clientY / window.innerHeight - 0.5;

      molecule.classList.add("mouse-following");
      molecule.setAttribute("data-mouse-x", mouseX.toString());
      molecule.setAttribute("data-mouse-y", mouseY.toString());
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => {
      if (progressTimer !== undefined) {
        window.clearTimeout(progressTimer);
      }
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  return (
    <section className="laboratory-hero">
      <div className="hero-content">
        <div className="molecular-breadcrumb">
          <span className="reaction-appear">RESEARCH</span>
          <span>→</span>
          <span className="reaction-appear reaction-delay-2">SYNTHESIS</span>
          <span>→</span>
          <span className="reaction-appear reaction-delay-4">DISCOVERY</span>
        </div>

        <h1 className="reaction-appear reaction-delay-6">{title}</h1>

        <h2 className="hero-subtitle reaction-appear reaction-delay-8">
          {subtitle}
        </h2>

        <div className="reaction-progress">
          <div
            ref={progressRef}
            className="reaction-progress-bar progress-initial"
          />
        </div>

        <p className="hero-description reaction-appear reaction-delay-10">
          {description}
        </p>

        <div className="hero-actions reaction-appear reaction-delay-12">
          <Link to={ctaLink} className="reaction-button">
            {ctaText}
          </Link>
          {secondaryText && secondaryLink && (
            <Link to={secondaryLink} className="apparatus-link">
              {secondaryText}
            </Link>
          )}
        </div>

        <div className="scientific-metrics">
          <div className="metric">
            <span className="metric-number">∞</span>
            <span className="metric-label">POSSIBILITIES</span>
          </div>
          <div className="metric">
            <span className="metric-number">φ</span>
            <span className="metric-label">GOLDEN RATIO</span>
          </div>
          <div className="metric">
            <span className="metric-number">Δ</span>
            <span className="metric-label">CHANGE</span>
          </div>
        </div>
      </div>

      <div className="apparatus-sidebar">
        <div ref={moleculeRef} className="floating-molecule molecule-spin">
          <svg
            width="300"
            height="300"
            viewBox="0 0 300 300"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Revolutionary molecular structure visualization */}
            <defs>
              <radialGradient id="atomGradient" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="var(--color-vermillion)" />
                <stop offset="100%" stopColor="var(--color-copper)" />
              </radialGradient>
              <linearGradient
                id="bondGradient"
                x1="0%"
                y1="0%"
                x2="100%"
                y2="0%"
              >
                <stop offset="0%" stopColor="var(--color-prussian)" />
                <stop offset="100%" stopColor="var(--color-vermillion)" />
              </linearGradient>
            </defs>

            {/* Molecular bonds */}
            <line
              x1="150"
              y1="50"
              x2="150"
              y2="250"
              stroke="url(#bondGradient)"
              strokeWidth="4"
              opacity="0.7"
            />
            <line
              x1="75"
              y1="150"
              x2="225"
              y2="150"
              stroke="url(#bondGradient)"
              strokeWidth="4"
              opacity="0.7"
            />
            <line
              x1="100"
              y1="100"
              x2="200"
              y2="200"
              stroke="url(#bondGradient)"
              strokeWidth="3"
              opacity="0.5"
            />
            <line
              x1="200"
              y1="100"
              x2="100"
              y2="200"
              stroke="url(#bondGradient)"
              strokeWidth="3"
              opacity="0.5"
            />

            {/* Atoms */}
            <circle cx="150" cy="50" r="20" fill="url(#atomGradient)" />
            <circle cx="150" cy="250" r="20" fill="url(#atomGradient)" />
            <circle cx="75" cy="150" r="15" fill="var(--color-prussian)" />
            <circle cx="225" cy="150" r="15" fill="var(--color-prussian)" />
            <circle cx="100" cy="100" r="12" fill="var(--color-copper)" />
            <circle cx="200" cy="200" r="12" fill="var(--color-copper)" />
            <circle cx="200" cy="100" r="12" fill="var(--color-copper)" />
            <circle cx="100" cy="200" r="12" fill="var(--color-copper)" />

            {/* Central core */}
            <circle
              cx="150"
              cy="150"
              r="25"
              fill="var(--color-vermillion)"
              opacity="0.8"
            />
            <circle
              cx="150"
              cy="150"
              r="15"
              fill="var(--color-bone)"
              opacity="0.3"
            />
          </svg>
        </div>

        <div className="apparatus-data">
          <h3>RESEARCH STATUS</h3>
          <div className="data-row">
            <span>Active Projects:</span>
            <span className="data-value">∞</span>
          </div>
          <div className="data-row">
            <span>Success Rate:</span>
            <span className="data-value">99.7%</span>
          </div>
          <div className="data-row">
            <span>Innovation Index:</span>
            <span className="data-value">φ</span>
          </div>
        </div>
      </div>

      <style>{`
        .laboratory-hero {
          position: relative;
          overflow: hidden;
          background:
            radial-gradient(
              circle at 20% 80%,
              rgba(227, 66, 52, 0.1) 0%,
              transparent 50%
            ),
            radial-gradient(
              circle at 80% 20%,
              rgba(0, 49, 83, 0.1) 0%,
              transparent 50%
            );
        }

        .hero-content {
          padding-right: var(--space-phi-4);
        }

        .molecular-breadcrumb {
          font-family: var(--font-body);
          font-size: 0.75rem;
          font-weight: 700;
          color: var(--color-copper);
          letter-spacing: 0.2em;
          margin-bottom: var(--space-phi-3);
        }

        .hero-subtitle {
          font-family: var(--font-body);
          font-weight: 400;
          color: var(--text-notation);
          margin: var(--space-phi-3) 0;
          font-size: 1.2rem;
        }

        .hero-description {
          font-size: 1.1rem;
          line-height: 1.7;
          color: var(--text-formula);
          margin: var(--space-phi-4) 0;
          max-width: 500px;
        }

        .hero-actions {
          display: flex;
          gap: var(--space-phi-3);
          align-items: center;
          margin: var(--space-phi-5) 0;
        }

        .apparatus-link {
          color: var(--color-copper);
          text-decoration: none;
          font-weight: 600;
          font-family: var(--font-body);
          text-transform: uppercase;
          letter-spacing: 0.1em;
          border-bottom: 2px solid transparent;
          transition: all 0.3s ease;
        }

        .apparatus-link:hover {
          color: var(--color-vermillion);
          border-bottom-color: var(--color-vermillion);
        }

        .scientific-metrics {
          display: flex;
          gap: var(--space-phi-5);
          margin-top: var(--space-phi-6);
        }

        .metric {
          text-align: center;
        }

        .metric-number {
          display: block;
          font-family: var(--font-display);
          font-size: 2rem;
          font-weight: 900;
          color: var(--color-vermillion);
        }

        .metric-label {
          font-family: var(--font-body);
          font-size: 0.7rem;
          color: var(--color-copper);
          letter-spacing: 0.15em;
          font-weight: 700;
        }

        .floating-molecule {
          position: relative;
          transition: transform 0.3s ease;
          filter: drop-shadow(0 10px 30px rgba(227, 66, 52, 0.2));
        }

        .apparatus-data {
          margin-top: var(--space-phi-4);
          background: rgba(0, 0, 0, 0.3);
          backdrop-filter: blur(10px);
          padding: var(--space-phi-3);
          border-radius: var(--radius-molecular);
          border: 1px solid var(--color-copper);
        }

        .apparatus-data h3 {
          font-family: var(--font-body);
          font-size: 0.85rem;
          font-weight: 700;
          color: var(--color-vermillion);
          letter-spacing: 0.1em;
          margin-bottom: var(--space-phi-2);
        }

        .data-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: var(--space-phi-1) 0;
          border-bottom: 1px solid rgba(184, 115, 51, 0.2);
          font-family: var(--font-body);
          font-size: 0.8rem;
        }

        .data-row:last-child {
          border-bottom: none;
        }

        .data-value {
          color: var(--color-vermillion);
          font-weight: 700;
        }

        @media (max-width: 768px) {
          .scientific-metrics {
            gap: var(--space-phi-3);
          }

          .metric-number {
            font-size: 1.5rem;
          }

          .floating-molecule {
            width: 200px;
            height: 200px;
          }
        }
      `}</style>
    </section>
  );
}
