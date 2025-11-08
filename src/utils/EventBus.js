// src/utils/EventBus.js

/**
 * EventBus - Lightweight pub/sub system for component communication
 * 
 * This replaces prop drilling and keeps components loosely coupled.
 * Services emit events, components subscribe to what they need.
 */
class EventBus {
  constructor() {
    this.listeners = {};
    this.debugMode = process.env.NODE_ENV === 'development';
  }

  /**
   * Emit an event to all subscribers
   * @param {string} event - Event name (e.g., 'dice.updated', 'pieces.moved')
   * @param {any} data - Data to send to subscribers
   */
  emit(event, data) {
    if (this.debugMode) {
      console.log(`🔔 EventBus.emit('${event}'):`, data);
    }

    if (this.listeners[event]) {
      this.listeners[event].forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`❌ EventBus error in listener for '${event}':`, error);
        }
      });
    }
  }

  /**
   * Subscribe to an event
   * @param {string} event - Event name to listen for
   * @param {function} callback - Function to call when event is emitted
   * @returns {function} Unsubscribe function
   */
  subscribe(event, callback) {
    if (typeof callback !== 'function') {
      throw new Error('EventBus.subscribe: callback must be a function');
    }

    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }

    this.listeners[event].push(callback);

    if (this.debugMode) {
      console.log(`📡 EventBus.subscribe('${event}') - ${this.listeners[event].length} total listeners`);
    }

    // Return unsubscribe function
    return () => {
      this.unsubscribe(event, callback);
    };
  }

  /**
   * Unsubscribe from an event
   * @param {string} event - Event name
   * @param {function} callback - Callback to remove
   */
  unsubscribe(event, callback) {
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
      
      if (this.debugMode) {
        console.log(`📴 EventBus.unsubscribe('${event}') - ${this.listeners[event].length} remaining listeners`);
      }

      // Clean up empty event arrays
      if (this.listeners[event].length === 0) {
        delete this.listeners[event];
      }
    }
  }

  /**
   * Remove all listeners for an event
   * @param {string} event - Event name to clear
   */
  clear(event) {
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
  clearAll() {
    this.listeners = {};
    if (this.debugMode) {
      console.log('🧹 EventBus.clearAll()');
    }
  }

  /**
   * Get list of all active event names
   * @returns {string[]} Array of event names
   */
  getActiveEvents() {
    return Object.keys(this.listeners);
  }

  /**
   * Get listener count for an event
   * @param {string} event - Event name
   * @returns {number} Number of listeners
   */
  getListenerCount(event) {
    return this.listeners[event] ? this.listeners[event].length : 0;
  }

  /**
   * Enable/disable debug logging
   * @param {boolean} enabled - Whether to enable debug mode
   */
  setDebugMode(enabled) {
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