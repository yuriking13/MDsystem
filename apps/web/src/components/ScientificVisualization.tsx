import React, { useEffect, useRef } from "react";

interface ScientificVisualizationProps {
  variant: "features" | "workflow" | "stats" | "cta";
}

export default function ScientificVisualization({
  variant,
}: ScientificVisualizationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set high DPI
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    let animationId: number;
    let time = 0;

    const animate = () => {
      ctx.clearRect(0, 0, rect.width, rect.height);

      if (variant === "features") {
        // Draw molecular network
        drawMolecularNetwork(ctx, rect.width, rect.height, time);
      } else if (variant === "workflow") {
        // Draw chemical reaction flow
        drawChemicalReaction(ctx, rect.width, rect.height, time);
      } else if (variant === "stats") {
        // Draw statistical apparatus
        drawStatisticalApparatus(ctx, rect.width, rect.height, time);
      } else if (variant === "cta") {
        // Draw synthesis process
        drawSynthesisProcess(ctx, rect.width, rect.height, time);
      }

      time += 0.01;
      animationId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [variant]);

  const drawMolecularNetwork = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    time: number,
  ) => {
    const centerX = width / 2;
    const centerY = height / 2;
    const nodes = 8;

    // Draw connections
    ctx.strokeStyle = "#B87333";
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.6;

    for (let i = 0; i < nodes; i++) {
      const angle1 = (i / nodes) * Math.PI * 2 + time;
      const angle2 = ((i + 1) / nodes) * Math.PI * 2 + time;

      const x1 = centerX + Math.cos(angle1) * (60 + Math.sin(time * 2) * 10);
      const y1 = centerY + Math.sin(angle1) * (60 + Math.cos(time * 2) * 10);
      const x2 = centerX + Math.cos(angle2) * (60 + Math.sin(time * 2) * 10);
      const y2 = centerY + Math.sin(angle2) * (60 + Math.cos(time * 2) * 10);

      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }

    // Draw nodes
    ctx.globalAlpha = 1;
    for (let i = 0; i < nodes; i++) {
      const angle = (i / nodes) * Math.PI * 2 + time;
      const x = centerX + Math.cos(angle) * (60 + Math.sin(time * 2) * 10);
      const y = centerY + Math.sin(angle) * (60 + Math.cos(time * 2) * 10);

      ctx.fillStyle = i % 3 === 0 ? "#E34234" : "#003153";
      ctx.beginPath();
      ctx.arc(x, y, 8 + Math.sin(time * 3 + i) * 2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Central atom
    ctx.fillStyle = "#E34234";
    ctx.beginPath();
    ctx.arc(centerX, centerY, 15 + Math.sin(time * 4) * 3, 0, Math.PI * 2);
    ctx.fill();
  };

  const drawChemicalReaction = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    time: number,
  ) => {
    const stages = 5;
    const stageWidth = width / stages;

    for (let i = 0; i < stages; i++) {
      const x = (i + 0.5) * stageWidth;
      const y = height / 2 + Math.sin(time * 2 + i) * 20;

      // Draw reaction vessel
      ctx.strokeStyle = "#B87333";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(x, y, 25, 0, Math.PI * 2);
      ctx.stroke();

      // Draw contents
      const intensity = (Math.sin(time * 3 + i * 0.5) + 1) / 2;
      ctx.fillStyle = `rgba(227, 66, 52, ${0.3 + intensity * 0.4})`;
      ctx.beginPath();
      ctx.arc(x, y, 20, 0, Math.PI * 2);
      ctx.fill();

      // Draw reaction arrows
      if (i < stages - 1) {
        ctx.strokeStyle = "#003153";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x + 30, y);
        ctx.lineTo(x + stageWidth - 30, y);
        ctx.stroke();

        // Arrow head
        ctx.beginPath();
        ctx.moveTo(x + stageWidth - 35, y - 5);
        ctx.lineTo(x + stageWidth - 30, y);
        ctx.lineTo(x + stageWidth - 35, y + 5);
        ctx.stroke();
      }
    }
  };

  const drawStatisticalApparatus = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    time: number,
  ) => {
    // Draw oscilloscope-like display
    const centerY = height / 2;

    // Frame
    ctx.strokeStyle = "#B87333";
    ctx.lineWidth = 4;
    ctx.strokeRect(20, 20, width - 40, height - 40);

    // Grid
    ctx.strokeStyle = "#003153";
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.3;

    for (let i = 1; i < 5; i++) {
      const x = (i / 5) * (width - 40) + 20;
      ctx.beginPath();
      ctx.moveTo(x, 20);
      ctx.lineTo(x, height - 20);
      ctx.stroke();

      const y = (i / 5) * (height - 40) + 20;
      ctx.beginPath();
      ctx.moveTo(20, y);
      ctx.lineTo(width - 20, y);
      ctx.stroke();
    }

    // Waveform
    ctx.globalAlpha = 1;
    ctx.strokeStyle = "#E34234";
    ctx.lineWidth = 3;
    ctx.beginPath();

    for (let x = 20; x < width - 20; x += 2) {
      const normalizedX = (x - 20) / (width - 40);
      const y =
        centerY +
        Math.sin(normalizedX * Math.PI * 4 + time * 4) * 40 +
        Math.sin(normalizedX * Math.PI * 8 + time * 2) * 20;

      if (x === 20) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();
  };

  const drawSynthesisProcess = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    time: number,
  ) => {
    const centerX = width / 2;
    const centerY = height / 2;

    // Draw complex apparatus
    // Central reaction chamber
    ctx.fillStyle = "rgba(227, 66, 52, 0.2)";
    ctx.strokeStyle = "#B87333";
    ctx.lineWidth = 3;

    ctx.beginPath();
    ctx.arc(centerX, centerY, 40, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Connecting tubes
    const tubes = 6;
    for (let i = 0; i < tubes; i++) {
      const angle = (i / tubes) * Math.PI * 2;
      const x1 = centerX + Math.cos(angle) * 40;
      const y1 = centerY + Math.sin(angle) * 40;
      const x2 = centerX + Math.cos(angle) * 80;
      const y2 = centerY + Math.sin(angle) * 80;

      ctx.strokeStyle = "#003153";
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();

      // End chambers
      const pulse = (Math.sin(time * 4 + i) + 1) / 2;
      ctx.fillStyle = `rgba(227, 66, 52, ${0.1 + pulse * 0.3})`;
      ctx.beginPath();
      ctx.arc(x2, y2, 15, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    // Central activity
    ctx.fillStyle = "#E34234";
    ctx.globalAlpha = 0.8 + Math.sin(time * 6) * 0.2;
    ctx.beginPath();
    ctx.arc(centerX, centerY, 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  };

  return (
    <div className="scientific-visualization">
      <canvas ref={canvasRef} className="scientific-canvas" />
      <style>{`
        .scientific-visualization {
          padding: var(--space-phi-3);
          background: var(--bg-apparatus);
          border-radius: var(--radius-compound);
          box-shadow: var(--shadow-apparatus);
        }

        .scientific-canvas {
          width: 100%;
          height: 300px;
          border-radius: var(--radius-compound);
          background: var(--bg-glass);
          border: 2px solid var(--color-copper);
        }
      `}</style>
    </div>
  );
}
