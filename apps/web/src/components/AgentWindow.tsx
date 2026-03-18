/**
 * AgentWindow - Модальное окно агента с draggable функциональностью
 * Заменяет ArticleAISidebar для корректного отображения без перекрытия контента
 */

import React, { useState, useRef, useEffect, useCallback } from "react";
import AgentCoordinator, {
  AgentWindowState,
  AgentType,
} from "../services/AgentCoordinator";
import AgentWindowContainer from "./AgentWindowContainer";

type Props = {
  agentId: string;
  agentType: AgentType;
  title: string;
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
  resizable?: boolean;
};

export default function AgentWindow({
  agentId,
  agentType,
  title,
  isOpen,
  onClose,
  children,
  className = "",
  minWidth = 320,
  minHeight = 240,
  maxWidth = 800,
  maxHeight = 800,
  resizable = true,
}: Props) {
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [resizeStart, setResizeStart] = useState({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  });
  const windowRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);

  const [windowState, setWindowState] = useState<AgentWindowState>(() => {
    const agent = AgentCoordinator.getAgent(agentId);
    return (
      agent?.window || {
        id: `window-${agentId}`,
        type: agentType,
        isOpen: false,
        isMinimized: false,
        position: { x: 100, y: 100 },
        size: { width: 450, height: 600 },
        zIndex: 1000,
        title,
      }
    );
  });

  // Sync with AgentCoordinator
  useEffect(() => {
    const agent = AgentCoordinator.getAgent(agentId);
    if (agent?.window) {
      setWindowState(agent.window);
    }
  }, [agentId]);

  // Register/unregister agent
  useEffect(() => {
    AgentCoordinator.registerAgent(agentId, agentType, title);

    if (isOpen) {
      AgentCoordinator.openAgentWindow(agentId);
    }

    return () => {
      if (isOpen) {
        AgentCoordinator.closeAgentWindow(agentId);
      }
    };
  }, [agentId, agentType, title, isOpen]);

  // Handle window state changes
  useEffect(() => {
    const handleWindowEvent = (
      event: string,
      data: Record<string, unknown>,
    ) => {
      const windowData = data.window as AgentWindowState;
      if (windowData?.id === windowState.id) {
        setWindowState(windowData);
      }
    };

    AgentCoordinator.on("window-moved", handleWindowEvent);
    AgentCoordinator.on("window-resized", handleWindowEvent);

    return () => {
      AgentCoordinator.off("window-moved", handleWindowEvent);
      AgentCoordinator.off("window-resized", handleWindowEvent);
    };
  }, [windowState.id]);

  // ============================================================================
  // Dragging Logic
  // ============================================================================

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (
        e.target === headerRef.current ||
        headerRef.current?.contains(e.target as Node)
      ) {
        e.preventDefault();
        setIsDragging(true);

        const rect = windowRef.current?.getBoundingClientRect();
        if (rect) {
          setDragOffset({
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
          });
        }

        AgentCoordinator.bringWindowToFront(agentId);
      }
    },
    [agentId],
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (isDragging && !isResizing) {
        e.preventDefault();

        const newPosition = {
          x: e.clientX - dragOffset.x,
          y: e.clientY - dragOffset.y,
        };

        AgentCoordinator.moveAgentWindow(agentId, newPosition);
      }

      if (isResizing) {
        e.preventDefault();

        const deltaX = e.clientX - resizeStart.x;
        const deltaY = e.clientY - resizeStart.y;

        const newSize = {
          width: Math.max(
            minWidth,
            Math.min(maxWidth, resizeStart.width + deltaX),
          ),
          height: Math.max(
            minHeight,
            Math.min(maxHeight, resizeStart.height + deltaY),
          ),
        };

        AgentCoordinator.resizeAgentWindow(agentId, newSize);
      }
    },
    [
      isDragging,
      isResizing,
      dragOffset,
      resizeStart,
      agentId,
      minWidth,
      minHeight,
      maxWidth,
      maxHeight,
    ],
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setIsResizing(false);
  }, []);

  // Global mouse events for dragging
  useEffect(() => {
    if (isDragging || isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);

      // Add CSS classes instead of direct style manipulation
      document.body.classList.add(
        isDragging ? "agent-dragging" : "agent-resizing",
      );
      document.body.classList.add("agent-no-select");

      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
        document.body.classList.remove(
          "agent-dragging",
          "agent-resizing",
          "agent-no-select",
        );
      };
    }
  }, [isDragging, isResizing, handleMouseMove, handleMouseUp]);

  // ============================================================================
  // Resize Logic
  // ============================================================================

  const handleResizeStart = useCallback(
    (e: React.MouseEvent) => {
      if (!resizable) return;

      e.preventDefault();
      e.stopPropagation();

      setIsResizing(true);
      setResizeStart({
        x: e.clientX,
        y: e.clientY,
        width: windowState.size.width,
        height: windowState.size.height,
      });
    },
    [resizable, windowState.size],
  );

  // ============================================================================
  // Window Controls
  // ============================================================================

  const handleClose = useCallback(() => {
    AgentCoordinator.closeAgentWindow(agentId);
    onClose();
  }, [agentId, onClose]);

  const handleMinimize = useCallback(() => {
    AgentCoordinator.minimizeAgentWindow(agentId);
  }, [agentId]);

  const handleMaximize = useCallback(() => {
    const maxSize = {
      width: Math.min(maxWidth, window.innerWidth - 40),
      height: Math.min(maxHeight, window.innerHeight - 40),
    };
    AgentCoordinator.resizeAgentWindow(agentId, maxSize);
    AgentCoordinator.moveAgentWindow(agentId, { x: 20, y: 20 });
  }, [agentId, maxWidth, maxHeight]);

  // Don't render if not open
  if (!isOpen || !windowState.isOpen) {
    return null;
  }

  // This function is no longer needed since we're using CSS classes
  // Keeping for backward compatibility but not using in render

  return (
    <>
      {/* Backdrop */}
      <div className="agent-window-backdrop" />

      {/* Window */}
      <AgentWindowContainer
        ref={windowRef}
        windowState={windowState}
        isDragging={isDragging}
        isResizing={isResizing}
        onMouseDown={handleMouseDown}
        className={className}
      >
        {/* Window Header */}
        <div
          ref={headerRef}
          className={`agent-window-header ${isDragging ? "agent-window-header--dragging" : ""}`}
        >
          <div className="agent-window-title">
            <div
              className={`agent-window-type-indicator agent-window-type-indicator--${agentType}`}
            />
            <h3 className="agent-window-title-text">{windowState.title}</h3>
            <span className="agent-window-type-badge">{agentType}</span>
          </div>

          <div className="agent-window-controls">
            <button
              onClick={handleMinimize}
              className="agent-window-control agent-window-control--minimize"
              title="Minimize"
            >
              –
            </button>

            <button
              onClick={handleMaximize}
              className="agent-window-control agent-window-control--maximize"
              title="Maximize"
            >
              □
            </button>

            <button
              onClick={handleClose}
              className="agent-window-control agent-window-control--close"
              title="Close"
            >
              ×
            </button>
          </div>
        </div>

        {/* Window Content */}
        <div className="agent-window-content">
          {!windowState.isMinimized && (
            <div className="agent-window-content-inner">{children}</div>
          )}
        </div>

        {/* Resize Handle */}
        {resizable && !windowState.isMinimized && (
          <div
            className="agent-window-resize-handle"
            onMouseDown={handleResizeStart}
          />
        )}
      </AgentWindowContainer>
    </>
  );
}

// ============================================================================
// Agent Window Hook for easy integration
// ============================================================================

export function useAgentWindow(
  agentId: string,
  agentType: AgentType,
  title: string,
) {
  const [isOpen, setIsOpen] = useState(false);

  const openWindow = useCallback(() => {
    setIsOpen(true);
  }, []);

  const closeWindow = useCallback(() => {
    setIsOpen(false);
  }, []);

  const toggleWindow = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  // Auto-register agent when hook is used
  useEffect(() => {
    AgentCoordinator.registerAgent(agentId, agentType, title);

    return () => {
      // Don't unregister here, let component handle it
    };
  }, [agentId, agentType, title]);

  return {
    isOpen,
    openWindow,
    closeWindow,
    toggleWindow,
  };
}
