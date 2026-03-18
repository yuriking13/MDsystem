/**
 * AgentCoordinator - Центральная система управления агентами
 * Координирует работу всех AI агентов в приложении
 */

export type AgentType =
  | "literature"
  | "writing"
  | "analytics"
  | "citation"
  | "quality"
  | "general";

export type AgentStatus = "idle" | "active" | "busy" | "error" | "disabled";

export type AgentWindowState = {
  id: string;
  type: AgentType;
  isOpen: boolean;
  isMinimized: boolean;
  position: { x: number; y: number };
  size: { width: number; height: number };
  zIndex: number;
  title: string;
};

export type AgentState = {
  id: string;
  type: AgentType;
  status: AgentStatus;
  lastActivity: Date;
  currentTask?: string;
  errorCount: number;
  performance: {
    tasksCompleted: number;
    averageResponseTime: number;
    successRate: number;
  };
  window?: AgentWindowState;
};

export type AgentMessage = {
  id: string;
  fromAgent: string;
  toAgent: string;
  type: "request" | "response" | "notification" | "error";
  payload: Record<string, unknown>;
  timestamp: Date;
};

type AgentEventType =
  | "agent-registered"
  | "agent-status-changed"
  | "window-opened"
  | "window-closed"
  | "window-moved"
  | "window-resized"
  | "task-started"
  | "task-completed"
  | "task-failed"
  | "message-sent";

type AgentEventHandler = (
  event: AgentEventType,
  data: Record<string, unknown>,
) => void;

class AgentCoordinatorClass {
  private agents: Map<string, AgentState> = new Map();
  private eventHandlers: Map<AgentEventType, AgentEventHandler[]> = new Map();
  private messageQueue: AgentMessage[] = [];
  private maxZIndex = 1000;
  private readonly WINDOW_OFFSET = 30;
  private readonly MAX_WINDOWS = 5;

  constructor() {
    this.setupGlobalErrorHandler();
    this.setupWindowManagement();
  }

  // ============================================================================
  // Agent Registration & Management
  // ============================================================================

  registerAgent(
    id: string,
    type: AgentType,
    title: string = `${type.charAt(0).toUpperCase() + type.slice(1)} Agent`,
  ): void {
    if (this.agents.has(id)) {
      console.warn(`Agent ${id} already registered`);
      return;
    }

    const agent: AgentState = {
      id,
      type,
      status: "idle",
      lastActivity: new Date(),
      errorCount: 0,
      performance: {
        tasksCompleted: 0,
        averageResponseTime: 0,
        successRate: 1.0,
      },
      window: {
        id: `window-${id}`,
        type,
        isOpen: false,
        isMinimized: false,
        position: this.calculateWindowPosition(),
        size: this.getDefaultWindowSize(type),
        zIndex: this.getNextZIndex(),
        title,
      },
    };

    this.agents.set(id, agent);
    this.emit("agent-registered", { agent });
    console.log(`✅ Agent registered: ${id} (${type})`);
  }

  unregisterAgent(id: string): void {
    const agent = this.agents.get(id);
    if (!agent) return;

    if (agent.window?.isOpen) {
      this.closeAgentWindow(id);
    }

    this.agents.delete(id);
    console.log(`❌ Agent unregistered: ${id}`);
  }

  getAgent(id: string): AgentState | undefined {
    return this.agents.get(id);
  }

  getAllAgents(): AgentState[] {
    return Array.from(this.agents.values());
  }

  getAgentsByType(type: AgentType): AgentState[] {
    return Array.from(this.agents.values()).filter(
      (agent) => agent.type === type,
    );
  }

  // ============================================================================
  // Agent Status Management
  // ============================================================================

  updateAgentStatus(id: string, status: AgentStatus, task?: string): void {
    const agent = this.agents.get(id);
    if (!agent) return;

    const oldStatus = agent.status;
    agent.status = status;
    agent.lastActivity = new Date();

    if (task) {
      agent.currentTask = task;
    } else if (status === "idle") {
      agent.currentTask = undefined;
    }

    this.emit("agent-status-changed", {
      agent,
      oldStatus,
      newStatus: status,
      task,
    });
  }

  reportTaskCompleted(
    id: string,
    responseTimeMs: number,
    success: boolean = true,
  ): void {
    const agent = this.agents.get(id);
    if (!agent) return;

    agent.performance.tasksCompleted++;

    // Update average response time
    const total =
      agent.performance.averageResponseTime *
      (agent.performance.tasksCompleted - 1);
    agent.performance.averageResponseTime =
      (total + responseTimeMs) / agent.performance.tasksCompleted;

    // Update success rate
    const totalTasks = agent.performance.tasksCompleted;
    const currentSuccesses = agent.performance.successRate * (totalTasks - 1);
    agent.performance.successRate =
      (currentSuccesses + (success ? 1 : 0)) / totalTasks;

    if (!success) {
      agent.errorCount++;
      this.emit("task-failed", { agent, responseTimeMs });
    } else {
      this.emit("task-completed", { agent, responseTimeMs });
    }

    this.updateAgentStatus(id, "idle");
  }

  // ============================================================================
  // Window Management
  // ============================================================================

  openAgentWindow(id: string): AgentWindowState | null {
    const agent = this.agents.get(id);
    if (!agent || !agent.window) return null;

    // Check window limit
    const openWindows = this.getOpenWindows();
    if (openWindows.length >= this.MAX_WINDOWS) {
      console.warn(`Maximum windows (${this.MAX_WINDOWS}) reached`);
      // Close oldest window
      const oldest = openWindows.sort((a, b) => a.zIndex - b.zIndex)[0];
      this.closeAgentWindow(this.getAgentByWindowId(oldest.id)?.id || "");
    }

    agent.window.isOpen = true;
    agent.window.isMinimized = false;
    agent.window.zIndex = this.getNextZIndex();

    this.emit("window-opened", { window: agent.window });
    return agent.window;
  }

  closeAgentWindow(id: string): void {
    const agent = this.agents.get(id);
    if (!agent || !agent.window) return;

    agent.window.isOpen = false;
    agent.window.isMinimized = false;

    this.emit("window-closed", { window: agent.window });
  }

  minimizeAgentWindow(id: string): void {
    const agent = this.agents.get(id);
    if (!agent || !agent.window) return;

    agent.window.isMinimized = !agent.window.isMinimized;
  }

  moveAgentWindow(id: string, position: { x: number; y: number }): void {
    const agent = this.agents.get(id);
    if (!agent || !agent.window) return;

    // Constrain position to viewport
    const constrained = this.constrainPosition(position, agent.window.size);
    agent.window.position = constrained;

    this.emit("window-moved", { window: agent.window });
  }

  resizeAgentWindow(id: string, size: { width: number; height: number }): void {
    const agent = this.agents.get(id);
    if (!agent || !agent.window) return;

    // Minimum size constraints
    const minSize = { width: 320, height: 240 };
    agent.window.size = {
      width: Math.max(size.width, minSize.width),
      height: Math.max(size.height, minSize.height),
    };

    this.emit("window-resized", { window: agent.window });
  }

  bringWindowToFront(id: string): void {
    const agent = this.agents.get(id);
    if (!agent || !agent.window) return;

    agent.window.zIndex = this.getNextZIndex();
  }

  getOpenWindows(): AgentWindowState[] {
    return Array.from(this.agents.values())
      .map((agent) => agent.window)
      .filter((window) => window?.isOpen) as AgentWindowState[];
  }

  // ============================================================================
  // Inter-Agent Communication
  // ============================================================================

  sendMessage(
    fromAgent: string,
    toAgent: string,
    type: AgentMessage["type"],
    payload: Record<string, unknown>,
  ): void {
    const message: AgentMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      fromAgent,
      toAgent,
      type,
      payload,
      timestamp: new Date(),
    };

    this.messageQueue.push(message);
    this.emit("message-sent", { message });

    // If target agent exists, deliver immediately
    if (this.agents.has(toAgent)) {
      this.deliverMessage(message);
    }
  }

  broadcastMessage(
    fromAgent: string,
    type: AgentMessage["type"],
    payload: Record<string, unknown>,
  ): void {
    const agents = Array.from(this.agents.keys()).filter(
      (id) => id !== fromAgent,
    );
    agents.forEach((agentId) => {
      this.sendMessage(fromAgent, agentId, type, payload);
    });
  }

  private deliverMessage(message: AgentMessage): void {
    // Implement message delivery logic based on agent type
    console.log(
      `📨 Message from ${message.fromAgent} to ${message.toAgent}:`,
      message.payload,
    );
  }

  // ============================================================================
  // Resource Management
  // ============================================================================

  canAgentExecuteTask(id: string): boolean {
    const agent = this.agents.get(id);
    if (!agent) return false;

    // Check if agent is available
    if (agent.status === "busy" || agent.status === "disabled") {
      return false;
    }

    // Check error rate
    if (agent.errorCount > 10) {
      console.warn(`Agent ${id} has too many errors (${agent.errorCount})`);
      return false;
    }

    // Check system resources (simplified)
    const activeAgents = Array.from(this.agents.values()).filter(
      (a) => a.status === "active" || a.status === "busy",
    ).length;

    if (activeAgents >= 3) {
      console.warn("Too many active agents, task queued");
      return false;
    }

    return true;
  }

  // ============================================================================
  // Event System
  // ============================================================================

  on(event: AgentEventType, handler: AgentEventHandler): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)!.push(handler);
  }

  off(event: AgentEventType, handler: AgentEventHandler): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  private emit(event: AgentEventType, data: Record<string, unknown>): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach((handler) => {
        try {
          handler(event, data);
        } catch (error) {
          console.error(`Error in event handler for ${event}:`, error);
        }
      });
    }
  }

  // ============================================================================
  // Utilities
  // ============================================================================

  private calculateWindowPosition(): { x: number; y: number } {
    const openWindows = this.getOpenWindows();
    const offset = openWindows.length * this.WINDOW_OFFSET;

    return {
      x: 100 + offset,
      y: 100 + offset,
    };
  }

  private getDefaultWindowSize(type: AgentType): {
    width: number;
    height: number;
  } {
    const sizes = {
      literature: { width: 450, height: 600 },
      writing: { width: 500, height: 650 },
      analytics: { width: 600, height: 500 },
      citation: { width: 400, height: 550 },
      quality: { width: 450, height: 500 },
      general: { width: 400, height: 500 },
    };

    return sizes[type] || sizes.general;
  }

  private getNextZIndex(): number {
    return ++this.maxZIndex;
  }

  private constrainPosition(
    position: { x: number; y: number },
    size: { width: number; height: number },
  ): { x: number; y: number } {
    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight,
    };

    return {
      x: Math.max(0, Math.min(position.x, viewport.width - size.width)),
      y: Math.max(0, Math.min(position.y, viewport.height - size.height)),
    };
  }

  private getAgentByWindowId(windowId: string): AgentState | undefined {
    return Array.from(this.agents.values()).find(
      (agent) => agent.window?.id === windowId,
    );
  }

  private setupGlobalErrorHandler(): void {
    window.addEventListener("error", (error) => {
      console.error("Global error in agent system:", error);
    });

    window.addEventListener("unhandledrejection", (event) => {
      console.error(
        "Unhandled promise rejection in agent system:",
        event.reason,
      );
    });
  }

  private setupWindowManagement(): void {
    // Handle window resize
    window.addEventListener("resize", () => {
      const openWindows = this.getOpenWindows();
      openWindows.forEach((window) => {
        const agent = this.getAgentByWindowId(window.id);
        if (agent) {
          const constrainedPosition = this.constrainPosition(
            window.position,
            window.size,
          );
          this.moveAgentWindow(agent.id, constrainedPosition);
        }
      });
    });
  }

  // ============================================================================
  // Debug & Development
  // ============================================================================

  getSystemStats() {
    const agents = Array.from(this.agents.values());
    return {
      totalAgents: agents.length,
      activeAgents: agents.filter((a) => a.status === "active").length,
      idleAgents: agents.filter((a) => a.status === "idle").length,
      errorAgents: agents.filter((a) => a.status === "error").length,
      openWindows: this.getOpenWindows().length,
      messageQueueSize: this.messageQueue.length,
      averageResponseTime:
        agents.reduce(
          (sum, agent) => sum + agent.performance.averageResponseTime,
          0,
        ) / agents.length || 0,
      overallSuccessRate:
        agents.reduce((sum, agent) => sum + agent.performance.successRate, 0) /
          agents.length || 1.0,
    };
  }

  debugLog(): void {
    console.group("🤖 Agent Coordinator State");
    console.log("Stats:", this.getSystemStats());
    console.log("Agents:", Array.from(this.agents.entries()));
    console.log("Open Windows:", this.getOpenWindows());
    console.log("Message Queue:", this.messageQueue.slice(-10)); // Last 10 messages
    console.groupEnd();
  }
}

// Singleton instance
export const AgentCoordinator = new AgentCoordinatorClass();

// Global access for debugging
if (typeof window !== "undefined") {
  (
    window as typeof window & { AgentCoordinator: typeof AgentCoordinator }
  ).AgentCoordinator = AgentCoordinator;
}

export default AgentCoordinator;
