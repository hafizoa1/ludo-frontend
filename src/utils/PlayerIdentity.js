// src/utils/PlayerIdentity.js

/**
 * PlayerIdentity - Manages persistent player identification
 *
 * Purpose: Generate and store unique player IDs that persist across
 * browser refreshes, enabling reconnection to games.
 *
 * Testing Mode (localhost):
 * - Uses sessionStorage (unique per tab)
 * - Allows multiple tabs to test different players on same device
 *
 * Production Mode:
 * - Uses localStorage (persistent per device/browser)
 * - Player keeps same ID even after browser close
 */

const PLAYER_ID_KEY = 'ludo_player_id';

class PlayerIdentity {
  constructor() {
    this.playerId = null;
    this.isTestingMode = window.location.hostname === 'localhost';
    this.initialize();
  }

  /**
   * Initialize player ID from storage or generate new one
   */
  initialize() {
    const storage = this.isTestingMode ? sessionStorage : localStorage;

    this.playerId = storage.getItem(PLAYER_ID_KEY);

    if (!this.playerId) {
      this.playerId = this.generatePlayerId();
      storage.setItem(PLAYER_ID_KEY, this.playerId);
      console.log('🆔 Generated new player ID:', this.playerId);
    } else {
      console.log('🆔 Loaded existing player ID:', this.playerId);
    }

    console.log('🧪 Testing mode:', this.isTestingMode ? 'ON (sessionStorage)' : 'OFF (localStorage)');
  }

  /**
   * Generate a unique player ID
   */
  generatePlayerId() {
    return 'player-' + this.generateUUID();
  }

  /**
   * Generate UUID v4
   */
  generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : ((r & 0x3) | 0x8);
      return v.toString(16);
    });
  }

  /**
   * Get the current player ID
   */
  getPlayerId() {
    return this.playerId;
  }

  /**
   * Clear player ID (for testing/logout)
   */
  clearPlayerId() {
    const storage = this.isTestingMode ? sessionStorage : localStorage;
    storage.removeItem(PLAYER_ID_KEY);
    this.playerId = null;
    console.log('🗑️ Cleared player ID');
  }

  /**
   * Check if in testing mode
   */
  isLocalTesting() {
    return this.isTestingMode;
  }
}

// Create and export singleton instance
const playerIdentity = new PlayerIdentity();
export default playerIdentity;
