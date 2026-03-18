/**
 * AgentFloatingButton - Плавающая кнопка для вызова агентов
 * Заменяет фиксированные FAB кнопки единой системой управления
 */

import React, { useState, useRef, useEffect } from "react";
import AgentCoordinator, { AgentType } from "../services/AgentCoordinator";

type AgentOption = {
  id: string;
  type: AgentType;
  title: string;
  icon: React.ReactNode;
  description: string;
  color: string;
};

type Props = {
  className?: string;
  position?: "bottom-right" | "bottom-left" | "top-right" | "top-left";
  availableAgents?: AgentType[];
  onAgentSelect?: (agentType: AgentType) => void;
};

const agentConfigs: Record<AgentType, Omit<AgentOption, "id">> = {
  literature: {
    type: "literature",
    title: "Literature Agent",
    description: "Поиск и анализ статей",
    color: "bg-blue-500",
    icon: (
      <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C20.832 18.477 19.246 18 17.5 18c-1.746 0-3.332.477-4.5 1.253"
        />
      </svg>
    ),
  },
  writing: {
    type: "writing",
    title: "Writing Agent",
    description: "Помощь в написании текстов",
    color: "bg-green-500",
    icon: (
      <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
        />
      </svg>
    ),
  },
  analytics: {
    type: "analytics",
    title: "Analytics Agent",
    description: "Статистический анализ",
    color: "bg-purple-500",
    icon: (
      <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
        />
      </svg>
    ),
  },
  citation: {
    type: "citation",
    title: "Citation Agent",
    description: "Работа с цитированием",
    color: "bg-yellow-500",
    icon: (
      <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
        />
      </svg>
    ),
  },
  quality: {
    type: "quality",
    title: "Quality Agent",
    description: "Контроль качества",
    color: "bg-red-500",
    icon: (
      <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
  },
  general: {
    type: "general",
    title: "General Agent",
    description: "Общий помощник",
    color: "bg-gray-500",
    icon: (
      <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
  },
};

export default function AgentFloatingButton({
  className = "",
  position = "bottom-right",
  availableAgents = [
    "literature",
    "writing",
    "analytics",
    "citation",
    "quality",
  ],
  onAgentSelect,
}: Props) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeAgents, setActiveAgents] = useState<Set<string>>(new Set());
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Track active agents
  useEffect(() => {
    const updateActiveAgents = () => {
      const openWindows = AgentCoordinator.getOpenWindows();
      const activeIds = new Set(openWindows.map((w) => w.type));
      setActiveAgents(activeIds);
    };

    // Initial update
    updateActiveAgents();

    // Listen for window events
    const handleWindowEvent = () => {
      updateActiveAgents();
    };

    AgentCoordinator.on("window-opened", handleWindowEvent);
    AgentCoordinator.on("window-closed", handleWindowEvent);

    return () => {
      AgentCoordinator.off("window-opened", handleWindowEvent);
      AgentCoordinator.off("window-closed", handleWindowEvent);
    };
  }, []);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsMenuOpen(false);
      }
    };

    if (isMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
    return () => {}; // Add explicit return for TypeScript
  }, [isMenuOpen]);

  const getPositionClasses = (): string => {
    const positions = {
      "bottom-right": "bottom-6 right-6",
      "bottom-left": "bottom-6 left-6",
      "top-right": "top-6 right-6",
      "top-left": "top-6 left-6",
    } as const;
    return positions[position] || positions["bottom-right"];
  };

  const getMenuPositionClasses = (): string => {
    const positions = {
      "bottom-right": "bottom-full right-0 mb-2",
      "bottom-left": "bottom-full left-0 mb-2",
      "top-right": "top-full right-0 mt-2",
      "top-left": "top-full left-0 mt-2",
    };
    return positions[position] || positions["bottom-right"];
  };

  const handleAgentSelect = (agentType: AgentType) => {
    setIsMenuOpen(false);
    onAgentSelect?.(agentType);

    // Generate unique agent ID
    const agentId = `agent-${agentType}-${Date.now()}`;
    const config = agentConfigs[agentType];

    // Register and open agent window
    AgentCoordinator.registerAgent(agentId, agentType, config.title);
    AgentCoordinator.openAgentWindow(agentId);
  };

  const toggleMenu = () => {
    setIsMenuOpen((prev) => !prev);
  };

  const activeAgentCount = Array.from(activeAgents).length;

  return (
    <div className={`fixed z-50 ${getPositionClasses()} ${className}`}>
      {/* Menu */}
      {isMenuOpen && (
        <div
          ref={menuRef}
          className={`absolute ${getMenuPositionClasses()} w-80 bg-white rounded-xl shadow-2xl border border-gray-200 py-2 overflow-hidden`}
        >
          <div className="px-4 py-2 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900 text-sm">AI Агенты</h3>
            <p className="text-xs text-gray-500">
              Выберите помощника для вашей задачи
            </p>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {availableAgents.map((agentType) => {
              const config = agentConfigs[agentType];
              const isActive = activeAgents.has(agentType);

              return (
                <button
                  key={agentType}
                  onClick={() => handleAgentSelect(agentType)}
                  className={`w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors border-l-4 ${
                    isActive
                      ? "border-green-400 bg-green-50"
                      : "border-transparent"
                  }`}
                  disabled={isActive}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-lg ${config.color} text-white flex items-center justify-center flex-shrink-0`}
                    >
                      {config.icon}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-gray-900 text-sm truncate">
                          {config.title}
                        </h4>
                        {isActive && (
                          <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">
                            Активен
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 truncate">
                        {config.description}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Stats */}
          {activeAgentCount > 0 && (
            <div className="px-4 py-2 border-t border-gray-200 bg-gray-50">
              <p className="text-xs text-gray-600">
                Активных агентов:{" "}
                <span className="font-medium">{activeAgentCount}</span>
              </p>
            </div>
          )}
        </div>
      )}

      {/* Main Button */}
      <button
        ref={buttonRef}
        onClick={toggleMenu}
        className={`relative w-14 h-14 rounded-full shadow-lg transition-all duration-200 flex items-center justify-center ${
          isMenuOpen
            ? "bg-gray-600 hover:bg-gray-700 rotate-45"
            : "bg-blue-600 hover:bg-blue-700 hover:scale-110"
        }`}
        title="AI Агенты"
      >
        {/* Icon */}
        <div className="text-white">
          {isMenuOpen ? (
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 6v6m0 0v6m0-6h6m-6 0H6"
              />
            </svg>
          ) : (
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
          )}
        </div>

        {/* Active Agent Indicator */}
        {activeAgentCount > 0 && !isMenuOpen && (
          <div className="absolute -top-2 -right-2 w-6 h-6 bg-green-500 text-white rounded-full text-xs font-bold flex items-center justify-center border-2 border-white">
            {activeAgentCount}
          </div>
        )}

        {/* Pulse animation when agents are active */}
        {activeAgentCount > 0 && !isMenuOpen && (
          <div className="absolute inset-0 rounded-full bg-green-400 animate-ping opacity-75" />
        )}
      </button>
    </div>
  );
}

// Export agent configs for use in other components
export { agentConfigs };
export type { AgentOption };
