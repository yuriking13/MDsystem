/**
 * AgentDashboard - Дашбоард мониторинга всех агентов системы
 * Показывает статистику, производительность и управление агентами
 */

import React, { useState, useEffect } from "react";
import AgentCoordinator, {
  AgentState,
  AgentType,
  AgentStatus,
} from "../services/AgentCoordinator";

type Props = {
  className?: string;
  compact?: boolean;
};

type SystemStats = {
  totalAgents: number;
  activeAgents: number;
  idleAgents: number;
  errorAgents: number;
  openWindows: number;
  messageQueueSize: number;
  averageResponseTime: number;
  overallSuccessRate: number;
};

export default function AgentDashboard({
  className = "",
  compact = false,
}: Props) {
  const [agents, setAgents] = useState<AgentState[]>([]);
  const [stats, setStats] = useState<SystemStats>({
    totalAgents: 0,
    activeAgents: 0,
    idleAgents: 0,
    errorAgents: 0,
    openWindows: 0,
    messageQueueSize: 0,
    averageResponseTime: 0,
    overallSuccessRate: 1.0,
  });
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);

  // Update dashboard data
  const updateData = () => {
    setAgents(AgentCoordinator.getAllAgents());
    setStats(AgentCoordinator.getSystemStats());
  };

  useEffect(() => {
    updateData();

    // Set up event listeners
    const handleAgentEvent = () => {
      updateData();
    };

    AgentCoordinator.on("agent-registered", handleAgentEvent);
    AgentCoordinator.on("agent-status-changed", handleAgentEvent);
    AgentCoordinator.on("window-opened", handleAgentEvent);
    AgentCoordinator.on("window-closed", handleAgentEvent);
    AgentCoordinator.on("task-completed", handleAgentEvent);
    AgentCoordinator.on("task-failed", handleAgentEvent);

    // Periodic updates
    const interval = setInterval(updateData, 5000);

    return () => {
      clearInterval(interval);
      AgentCoordinator.off("agent-registered", handleAgentEvent);
      AgentCoordinator.off("agent-status-changed", handleAgentEvent);
      AgentCoordinator.off("window-opened", handleAgentEvent);
      AgentCoordinator.off("window-closed", handleAgentEvent);
      AgentCoordinator.off("task-completed", handleAgentEvent);
      AgentCoordinator.off("task-failed", handleAgentEvent);
    };
  }, []);

  const getStatusColor = (status: AgentStatus): string => {
    const colors = {
      idle: "text-gray-500 bg-gray-100",
      active: "text-blue-700 bg-blue-100",
      busy: "text-orange-700 bg-orange-100",
      error: "text-red-700 bg-red-100",
      disabled: "text-gray-400 bg-gray-50",
    };
    return colors[status];
  };

  const getTypeIcon = (type: AgentType): React.ReactNode => {
    const icons = {
      literature: (
        <svg
          className="w-4 h-4"
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
      writing: (
        <svg
          className="w-4 h-4"
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
      analytics: (
        <svg
          className="w-4 h-4"
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
      citation: (
        <svg
          className="w-4 h-4"
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
      quality: (
        <svg
          className="w-4 h-4"
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
      general: (
        <svg
          className="w-4 h-4"
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
    };
    return icons[type];
  };

  const handleAgentAction = (
    agentId: string,
    action: "open" | "close" | "restart",
  ) => {
    switch (action) {
      case "open":
        AgentCoordinator.openAgentWindow(agentId);
        break;
      case "close":
        AgentCoordinator.closeAgentWindow(agentId);
        break;
      case "restart":
        AgentCoordinator.updateAgentStatus(agentId, "idle");
        break;
    }
  };

  const formatTime = (timestamp: Date): string => {
    const diff = Date.now() - timestamp.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(minutes / 60);

    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m`;
    return "Just now";
  };

  if (compact) {
    return (
      <div
        className={`bg-white rounded-lg border border-gray-200 p-4 ${className}`}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-900 text-sm">Agent Status</h3>
          <button
            onClick={() => AgentCoordinator.debugLog()}
            className="text-xs text-gray-500 hover:text-gray-700"
          >
            Debug
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-gray-500">Active:</span>
            <span className="ml-1 font-medium text-blue-600">
              {stats.activeAgents}
            </span>
          </div>
          <div>
            <span className="text-gray-500">Total:</span>
            <span className="ml-1 font-medium">{stats.totalAgents}</span>
          </div>
          <div>
            <span className="text-gray-500">Windows:</span>
            <span className="ml-1 font-medium text-green-600">
              {stats.openWindows}
            </span>
          </div>
          <div>
            <span className="text-gray-500">Success:</span>
            <span className="ml-1 font-medium text-purple-600">
              {(stats.overallSuccessRate * 100).toFixed(0)}%
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg border border-gray-200 ${className}`}>
      {/* Header */}
      <div className="border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            Agent Dashboard
          </h2>
          <div className="flex items-center gap-2">
            <div className="text-sm text-gray-500">
              Last update: {new Date().toLocaleTimeString()}
            </div>
            <button
              onClick={updateData}
              className="p-1 text-gray-400 hover:text-gray-600"
              title="Refresh"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 border-b border-gray-200">
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">
            {stats.activeAgents}
          </div>
          <div className="text-sm text-gray-500">Active Agents</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">
            {stats.openWindows}
          </div>
          <div className="text-sm text-gray-500">Open Windows</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-purple-600">
            {stats.averageResponseTime > 0
              ? `${stats.averageResponseTime.toFixed(0)}ms`
              : "—"}
          </div>
          <div className="text-sm text-gray-500">Avg Response</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-orange-600">
            {(stats.overallSuccessRate * 100).toFixed(1)}%
          </div>
          <div className="text-sm text-gray-500">Success Rate</div>
        </div>
      </div>

      {/* Agents List */}
      <div className="p-4">
        <h3 className="font-medium text-gray-900 mb-3">
          Active Agents ({agents.length})
        </h3>

        {agents.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <svg
              className="w-12 h-12 mx-auto mb-3 opacity-50"
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
            <p>No agents registered</p>
            <p className="text-sm">
              Agents will appear here when they are activated
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {agents.map((agent) => (
              <div
                key={agent.id}
                className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                  selectedAgent === agent.id
                    ? "border-blue-300 bg-blue-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
                onClick={() =>
                  setSelectedAgent(selectedAgent === agent.id ? null : agent.id)
                }
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="text-gray-600">
                      {getTypeIcon(agent.type)}
                    </div>
                    <div>
                      <div className="font-medium text-sm text-gray-900">
                        {agent.id}
                      </div>
                      <div className="text-xs text-gray-500">
                        {agent.type} • Last active:{" "}
                        {formatTime(agent.lastActivity)}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(agent.status)}`}
                    >
                      {agent.status}
                    </span>

                    {agent.window?.isOpen && (
                      <div
                        className="w-2 h-2 bg-green-400 rounded-full"
                        title="Window open"
                      />
                    )}
                  </div>
                </div>

                {agent.currentTask && (
                  <div className="mt-2 text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                    Task: {agent.currentTask}
                  </div>
                )}

                {selectedAgent === agent.id && (
                  <div className="mt-3 border-t border-gray-200 pt-3">
                    <div className="grid grid-cols-3 gap-4 text-xs text-gray-600 mb-3">
                      <div>
                        <div className="font-medium">Tasks</div>
                        <div>{agent.performance.tasksCompleted}</div>
                      </div>
                      <div>
                        <div className="font-medium">Errors</div>
                        <div>{agent.errorCount}</div>
                      </div>
                      <div>
                        <div className="font-medium">Success Rate</div>
                        <div>
                          {(agent.performance.successRate * 100).toFixed(1)}%
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAgentAction(agent.id, "open");
                        }}
                        className="px-2 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600"
                        disabled={agent.window?.isOpen}
                      >
                        Open Window
                      </button>

                      {agent.window?.isOpen && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAgentAction(agent.id, "close");
                          }}
                          className="px-2 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600"
                        >
                          Close Window
                        </button>
                      )}

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAgentAction(agent.id, "restart");
                        }}
                        className="px-2 py-1 bg-gray-500 text-white text-xs rounded hover:bg-gray-600"
                      >
                        Reset
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
