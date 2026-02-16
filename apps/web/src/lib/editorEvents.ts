/**
 * Editor Event System
 *
 * Replaces global window functions with a type-safe event emitter pattern.
 * This allows components to communicate without tight coupling.
 */

// Generic event handler type
type EventHandler<T = unknown> = (data: T) => void;

// Simple event emitter that works with any data type
class EditorEventEmitter {
  private handlers: Map<string, Set<EventHandler>> = new Map();

  /**
   * Subscribe to an event
   */
  on<T>(event: string, handler: EventHandler<T>): () => void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    const eventHandlers = this.handlers.get(event);
    if (!eventHandlers) {
      return () => undefined;
    }
    eventHandlers.add(handler as EventHandler);

    // Return unsubscribe function
    return () => {
      eventHandlers.delete(handler as EventHandler);
    };
  }

  /**
   * Emit an event to all subscribers
   */
  emit<T>(event: string, data: T): void {
    const handlers = this.handlers.get(event);
    if (handlers) {
      handlers.forEach((handler) => {
        try {
          handler(data);
        } catch {
          // Silent fail to not break other handlers
        }
      });
    }
  }

  /**
   * Check if there are any listeners for an event
   */
  hasListeners(event: string): boolean {
    return (this.handlers.get(event)?.size ?? 0) > 0;
  }

  /**
   * Remove all listeners for an event
   */
  off(event: string): void {
    this.handlers.delete(event);
  }

  /**
   * Clear all listeners
   */
  clear(): void {
    this.handlers.clear();
  }
}

// Singleton instance
export const editorEvents = new EditorEventEmitter();

// Event names as constants for type safety
export const EDITOR_EVENTS = {
  INSERT_CITATION: "insertCitation",
  INSERT_CHART: "insertChart",
  INSERT_TABLE: "insertTable",
  CREATE_TABLE: "createTable",
} as const;
