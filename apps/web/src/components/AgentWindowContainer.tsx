/**
 * AgentWindowContainer - CSS-based positioning container for agent windows
 * Removes inline styles and uses CSS custom properties instead
 */

import React, { useEffect, useRef } from "react";
import { AgentWindowState } from "../services/AgentCoordinator";

type Props = {
  windowState: AgentWindowState;
  isDragging: boolean;
  isResizing: boolean;
  children: React.ReactNode;
  onMouseDown: (e: React.MouseEvent) => void;
  className?: string;
};

export default function AgentWindowContainer({
  windowState,
  isDragging,
  isResizing,
  children,
  onMouseDown,
  className = "",
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Update CSS custom properties when window state changes
  useEffect(() => {
    if (containerRef.current) {
      const element = containerRef.current;
      // Use CSS dataset properties instead of style manipulation
      element.dataset.windowX = windowState.position.x.toString();
      element.dataset.windowY = windowState.position.y.toString();
      element.dataset.windowWidth = windowState.size.width.toString();
      element.dataset.windowHeight = windowState.size.height.toString();
      element.dataset.windowZ = windowState.zIndex.toString();
    }
  }, [windowState]);

  const containerClasses = [
    "agent-window",
    `agent-window--${windowState.type}`,
    windowState.isMinimized ? "agent-window--minimized" : "",
    isDragging ? "agent-window--dragging" : "",
    isResizing ? "agent-window--resizing" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      ref={containerRef}
      className={containerClasses}
      onMouseDown={onMouseDown}
    >
      {children}
    </div>
  );
}
