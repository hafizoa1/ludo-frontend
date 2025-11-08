import gameService from "../../../../services/GameService";

/**
 * ConnectionHandler - Manages connection state, timeouts, and recovery
 */
class ConnectionHandler {
  constructor(stateCoordinator) {
    this.stateCoordinator = stateCoordinator;
    this.isOffline = false;
    this.diceTimeout = null;
    this.connectionTimeout = null;
    
    this.setupListeners();
  }

  /**
   * Setup connection-related listeners
   */
  setupListeners() {
    this.stateCoordinator.on('connection:lost', () => {
      this.handleConnectionLost();
    });

    this.stateCoordinator.on('connection:restored', () => {
      this.handleConnectionRestored();
    });

    this.stateCoordinator.on('error:game', (data) => {
      this.handleError(data.error);
    });
  }

  /**
   * Start dice roll timeout
   */
  startDiceTimeout(onTimeout) {
    this.clearDiceTimeout();
    
    this.diceTimeout = setTimeout(() => {
      console.warn('⚠️ Dice roll timeout');
      if (onTimeout) onTimeout();
      this.attemptRecovery();
    }, 8000);
  }

  /**
   * Clear dice timeout
   */
  clearDiceTimeout() {
    if (this.diceTimeout) {
      clearTimeout(this.diceTimeout);
      this.diceTimeout = null;
    }
  }

  /**
   * Handle connection lost
   */
  handleConnectionLost() {
    this.isOffline = true;
    this.stateCoordinator.emit('ui:connectionStatus', { 
      connected: false,
      message: '🔌 Connection Lost - Reconnecting...'
    });
  }

  /**
   * Handle connection restored
   */
  handleConnectionRestored() {
    if (!this.isOffline) return;
    
    this.isOffline = false;
    this.stateCoordinator.requestGameState();
    this.stateCoordinator.emit('ui:connectionStatus', { 
      connected: true,
      message: '✅ Connection restored!'
    });
  }

  /**
   * Handle errors
   */
  handleError(error) {
    this.clearDiceTimeout();
    
    if (error.includes('timeout') || error.includes('connection')) {
      this.handleConnectionLost();
    } else {
      this.stateCoordinator.emit('ui:message', {
        message: `❌ Error: ${error}`,
        duration: 5000
      });
    }
  }

  /**
   * Attempt recovery
   */
  attemptRecovery() {
    console.log('🔄 Attempting recovery...');
    
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
    }
    
    this.connectionTimeout = setTimeout(() => {
      this.stateCoordinator.requestGameState();
      
      this.connectionTimeout = setTimeout(() => {
        if (this.isOffline || !gameService.getConnectionStatus().isConnected) {
          this.stateCoordinator.emit('ui:message', {
            message: '🛠️ Connection issues persist. Try refreshing the page.',
            duration: 10000
          });
        }
      }, 5000);
    }, 2000);
  }

  /**
   * Get connection status
   */
  getStatus() {
    return {
      isOffline: this.isOffline,
      hasPendingDiceRoll: this.diceTimeout !== null
    };
  }

  /**
   * Cleanup
   */
  destroy() {
    this.clearDiceTimeout();
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
    }
  }
}

export default ConnectionHandler;
