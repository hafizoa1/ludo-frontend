// src/utils/EventBus.ts
//
// Lightweight pub/sub system for component communication - replaces prop
// drilling and keeps components loosely coupled. Services emit events,
// components subscribe to what they need. Event names/payloads are
// checked against EventMap (src/types/events.ts).

import { EventMap } from '../types/events';

type EventName = keyof EventMap;
type Handler<K extends EventName> = (data: EventMap[K]) => void;

class EventBus {
  // Untyped internally - a mapped type keyed by a generic K can't be
  // assigned back into cleanly (a known TS limitation, not a bug in this
  // code). The public emit/subscribe signatures below are what actually
  // need checking at call sites; this storage is a private implementation
  // detail.
  private listeners: Record<string, Handler<EventName>[]> = {};
  private debugMode: boolean;

  constructor() {
    this.debugMode = process.env.NODE_ENV === 'development';
  }

  /**
   * Emit an event to all subscribers
   */
  emit<K extends EventName>(event: K, data?: EventMap[K]): void {
    if (this.debugMode) {
      console.log(`🔔 EventBus.emit('${event}'):`, data);
    }

    const handlers = this.listeners[event];
    if (handlers) {
      handlers.forEach((callback) => {
        try {
          callback(data as EventMap[K]);
        } catch (error) {
          console.error(`❌ EventBus error in listener for '${event}':`, error);
        }
      });
    }
  }

  /**
   * Subscribe to an event. Returns an unsubscribe function.
   */
  subscribe<K extends EventName>(event: K, callback: Handler<K>): () => void {
    if (typeof callback !== 'function') {
      throw new Error('EventBus.subscribe: callback must be a function');
    }

    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }

    (this.listeners[event] as Handler<K>[]).push(callback);

    if (this.debugMode) {
      console.log(`📡 EventBus.subscribe('${event}') - ${this.listeners[event]!.length} total listeners`);
    }

    return () => {
      this.unsubscribe(event, callback);
    };
  }

  /**
   * Unsubscribe from an event
   */
  unsubscribe<K extends EventName>(event: K, callback: Handler<K>): void {
    const handlers = this.listeners[event] as Handler<K>[] | undefined;
    if (handlers) {
      const remaining = handlers.filter((cb) => cb !== callback);
      this.listeners[event] = remaining as Handler<EventName>[];

      if (this.debugMode) {
        console.log(`📴 EventBus.unsubscribe('${event}') - ${this.listeners[event]!.length} remaining listeners`);
      }

      if (this.listeners[event]!.length === 0) {
        delete this.listeners[event];
      }
    }
  }

  /**
   * Remove all listeners for an event
   */
  clear(event: EventName): void {
    if (this.listeners[event]) {
      delete this.listeners[event];
      if (this.debugMode) {
        console.log(`🧹 EventBus.clear('${event}')`);
      }
    }
  }

  /**
   * Remove all listeners for all events
   */
  clearAll(): void {
    this.listeners = {};
    if (this.debugMode) {
      console.log('🧹 EventBus.clearAll()');
    }
  }

  /**
   * Get list of all active event names
   */
  getActiveEvents(): EventName[] {
    return Object.keys(this.listeners) as EventName[];
  }

  /**
   * Get listener count for an event
   */
  getListenerCount(event: EventName): number {
    return this.listeners[event] ? this.listeners[event]!.length : 0;
  }

  /**
   * Enable/disable debug logging
   */
  setDebugMode(enabled: boolean): void {
    this.debugMode = enabled;
  }
}

// Create a singleton instance
const eventBus = new EventBus();

// Freeze the instance to prevent accidental modification
Object.freeze(eventBus);

export default eventBus;

// Named exports for convenience
export { EventBus };
