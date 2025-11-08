// src/services/GameService.js

import webSocketService from './WebSocketService';
import eventBus from '../utils/EventBus';

/**
 * GameService - Game state manager and diff calculator
 * 
 * Responsibilities:
 * - Store current game state (single source of truth)
 * - Calculate diffs between state changes
 * - Emit granular events (pieces.moved, dice.updated, etc.)
 * - Parse move options with animation delay
 * - Provide action methods for UI components
 */
class GameService {
  constructor() {
    this.currentState = null;
    this.isConnected = false;
    this.currentGameId = null;
    
    this.initializeWebSocketListeners();
    
    console.log('🎮 GameService initialized');
  }

  // =========================================================================
  // EVENT LISTENER SETUP
  // =========================================================================

  initializeWebSocketListeners() {
    // Connection events
    eventBus.subscribe('websocket.connected', (data) => {
      this.isConnected = true;
      console.log('🎮 GameService: WebSocket connected');
      eventBus.emit('game.connection.established', data);
    });

    eventBus.subscribe('websocket.disconnected', () => {
      this.isConnected = false;
      this.currentState = null;
      this.currentGameId = null;
      console.log('🎮 GameService: WebSocket disconnected');
      eventBus.emit('game.connection.lost');
    });

    eventBus.subscribe('websocket.error', (data) => {
      console.error('🎮 GameService: WebSocket error', data);
      eventBus.emit('game.error', data);
    });

    // Personal response events
    eventBus.subscribe('websocket.personal.response', (response) => {
      this.handlePersonalResponse(response);
    });

    // Game events
    eventBus.subscribe('game.event', (event) => {
      this.handleGameEvent(event);
    });

    eventBus.subscribe('game.dice', (event) => {
      this.handleDiceEvent(event);
    });

    eventBus.subscribe('game.move', (event) => {
      this.handleMoveEvent(event);
    });

    eventBus.subscribe('game.players', (event) => {
      this.handlePlayerEvent(event);
    });

    // Game lifecycle events
    eventBus.subscribe('game.created', (data) => {
      this.currentGameId = data.gameId;
      console.log('🎮 GameService: Game created:', data.gameId);
      eventBus.emit('lobby.game.created', data);
    });

    eventBus.subscribe('game.joined', (data) => {
      this.currentGameId = data.gameId;
      console.log('🎮 GameService: Joined game:', data.gameId);
      eventBus.emit('lobby.game.joined', data);
    });
  }

  // =========================================================================
  // MESSAGE HANDLERS
  // =========================================================================

  /**
   * Handle personal response messages
   */
  handlePersonalResponse(response) {
    console.log('🎮 GameService: Personal response:', response.type);

    if (response.success && response.data) {
      this.updateGameState(response.data);
    }

    // Emit specific events based on response type
    switch (response.type) {
      case 'GAME_CREATED':
        eventBus.emit('lobby.response.game.created', response);
        break;
      case 'JOINED_GAME':
        eventBus.emit('lobby.response.game.joined', response);
        break;
      case 'GAME_MESSAGE':
        eventBus.emit('game.message', response);
        break;
      case 'MOVE_OPTIONS':
        // Parse move options with delay for animations
        if (this.isMoveOptionsMessage(response.message)) {
          const moveOptions = this.parseMoveOptions(response.message);
          
          console.log('🎮 GameService: Delaying move options for animation');
          setTimeout(() => {
            console.log('🎮 GameService: Emitting move options after delay');
            eventBus.emit('moves.available', {
              moves: moveOptions,
              rawMessage: response.message,
              timestamp: Date.now()
            });
          }, 1000); // Wait 1 second for animations to complete
        } else {
          eventBus.emit('game.input.required', response);
        }
        break;
      default:
        eventBus.emit('game.response', response);
    }
  }

  /**
   * Handle game event messages
   */
  handleGameEvent(event) {
    console.log('🎮 GameService: Game event:', event.type);

    if (event.success && event.data) {
      this.updateGameState(event.data);
    }

    switch (event.type) {

      case 'GAME_MESSAGE':
        eventBus.emit('game.message', event);
        break;
      default:
        eventBus.emit('game.generic.event', event);
    }
  }

  /**
   * Handle dice events
   */
  handleDiceEvent(event) {
  console.log('🎮 GameService: Dice event:', event.type);
  
  if (event.success && event.message) {
    // Parse the concatenated dice roll string
    const die1 = parseInt(event.message.charAt(0), 10);
    const die2 = parseInt(event.message.charAt(1), 10);

    // Emit dice updated event with parsed values
    eventBus.emit('dice.updated', { 
      new: { 
        die1: die1, 
        die2: die2 
      } 
    });
  }
  }

  /**
   * Handle move events
   */
  handleMoveEvent(event) {
    console.log('🎮 GameService: Move event:', event.type);
    
    if (event.success && event.data) {
      this.updateGameState(event.data);
    }
    
    eventBus.emit('game.move.executed', event);
  }

  /**
   * Handle player events
   */
  handlePlayerEvent(event) {
    console.log('🎮 GameService: Player event:', event.type);
    eventBus.emit('game.player.update', event);
  }

  // =========================================================================
  // STATE MANAGEMENT
  // =========================================================================

  /**
   * Update shared game state and emit granular change events
   */
  updateGameState(newState) {
    const oldState = this.currentState;
    this.currentState = newState;

    console.log('🎮 GameService: Shared state updated', {
      currentPlayer: newState.currentPlayerName,
      dice: newState.dice,
      gameStatus: newState.gameStatus
    });

    // Emit granular state change events
    this.emitStateChangeEvents(oldState, newState);

    // Emit general state update
    eventBus.emit('game.state.updated', {
      oldState,
      newState,
      timestamp: Date.now()
    });
  }

  /**
   * Emit specific events for different types of state changes
   */
  emitStateChangeEvents(oldState, newState) {
    // Dice changes
    if (!oldState || 
        oldState.dice.die1 !== newState.dice.die1 || 
        oldState.dice.die2 !== newState.dice.die2) {
      eventBus.emit('dice.updated', {
        old: oldState?.dice,
        new: newState.dice,
        timestamp: Date.now()
      });
    }

    // Piece movements
    if (oldState && oldState.pieces) {
      const movements = this.calculatePieceMovements(oldState.pieces, newState.pieces);
      if (movements.length > 0) {
        eventBus.emit('pieces.moved', {
          movements,
          timestamp: Date.now()
        });
      }
    }

    // Turn changes
    if (!oldState || oldState.currentPlayerId !== newState.currentPlayerId) {
      eventBus.emit('turn.changed', {
        oldPlayer: oldState?.currentPlayerId,
        newPlayer: newState.currentPlayerId,
        playerName: newState.currentPlayerName,
        timestamp: Date.now()
      });
    }

    // Game over
    if (newState.gameOver && (!oldState || !oldState.gameOver)) {
      eventBus.emit('game.ended', {
        winner: newState.winner,
        gameStatus: newState.gameStatus,
        timestamp: Date.now()
      });
    }
  }

  /**
   * Calculate which pieces moved between states
   */
  calculatePieceMovements(oldPieces, newPieces) {
    const movements = [];

    newPieces.forEach(newPiece => {
      const oldPiece = oldPieces.find(p => p.id === newPiece.id);
      
      if (oldPiece && 
          (oldPiece.position.row !== newPiece.position.row || 
           oldPiece.position.col !== newPiece.position.col)) {
        movements.push({
          pieceId: newPiece.id,
          color: newPiece.color,
          from: oldPiece.position,
          to: newPiece.position,
          fromState: {
            atHome: oldPiece.atHome,
            inSafeZone: oldPiece.inSafeZone,
            finished: oldPiece.finished
          },
          toState: {
            atHome: newPiece.atHome,
            inSafeZone: newPiece.inSafeZone,
            finished: newPiece.finished
          }
        });
      }
    });

    return movements;
  }

  // =========================================================================
  // MOVE OPTIONS PARSING
  // =========================================================================

  /**
   * Check if message contains move options
   */
  isMoveOptionsMessage(message) {
    if (!message) return false;
    
    return message.includes('Available moves:') ||
           message.includes('Enter game option') ||
           message.includes('Choose which piece') ||
           (message.includes('1.') && message.includes('Move'));
  }

  /**
   * Parse move options from text message
   */
  parseMoveOptions(message) {
    console.log('DEBUG: Parsing message:', message);
    const lines = message.split('\n');
    const moves = [];

    // Check if this is a simple "Enter game option (1-8)" message
    const optionsMatch = message.match(/\(Options:\s*(\d+)-(\d+)\)/);
    if (optionsMatch && lines.length === 1) {
      const start = parseInt(optionsMatch[1]);
      const end = parseInt(optionsMatch[2]);
      
      console.log(`DEBUG: Creating ${end - start + 1} generic options`);
      
      for (let i = start; i <= end; i++) {
        moves.push({
          number: i,
          description: `Game option ${i}`,
          originalLine: `${i}. Game option ${i}`
        });
      }
    } else {
      // Detailed format - parse numbered lines
      lines.forEach((line) => {
        const match = line.match(/^(\d+)\.\s*(.+)/);
        if (match) {
          moves.push({
            number: parseInt(match[1]),
            description: match[2].trim(),
            originalLine: line.trim()
          });
        }
      });
    }
    
    console.log('DEBUG: Parsed moves:', moves);
    return moves;
  }

  // =========================================================================
  // PUBLIC ACTION METHODS
  // =========================================================================

  async connect() {
    try {
      await webSocketService.connect();
      return true;
    } catch (error) {
      console.error('🎮 GameService: Connection failed', error);
      eventBus.emit('game.error', { error: 'Connection failed' });
      return false;
    }
  }

  createGame() {
    if (!this.isConnected) {
      console.error('🎮 GameService: Cannot create game - not connected');
      eventBus.emit('game.error', { error: 'Not connected to server' });
      return;
    }

    console.log('🎮 GameService: Creating game...');
    webSocketService.createGame();
  }

  joinGame(gameId) {
    if (!this.isConnected) {
      console.error('🎮 GameService: Cannot join game - not connected');
      eventBus.emit('game.error', { error: 'Not connected to server' });
      return;
    }

    if (!gameId || gameId.trim() === '') {
      console.error('🎮 GameService: Cannot join game - invalid gameId');
      eventBus.emit('game.error', { error: 'Invalid game ID' });
      return;
    }

    console.log('🎮 GameService: Joining game:', gameId);
    webSocketService.joinGame(gameId);
  }

  rollDice() {
    if (!this.isConnected || !this.currentGameId) {
      console.error('🎮 GameService: Cannot roll dice - not in game');
      eventBus.emit('game.error', { error: 'Not in an active game' });
      return;
    }

    console.log('🎮 GameService: Rolling dice...');
    webSocketService.rollDice();
  }

  selectPiece(pieceIndex) {
    if (!this.isConnected || !this.currentGameId) {
      console.error('🎮 GameService: Cannot select piece - not in game');
      eventBus.emit('game.error', { error: 'Not in an active game' });
      return;
    }

    if (typeof pieceIndex !== 'number' || pieceIndex < 0) {
      console.error('🎮 GameService: Invalid piece index:', pieceIndex);
      eventBus.emit('game.error', { error: 'Invalid piece selection' });
      return;
    }

    console.log('🎮 GameService: Selecting piece:', pieceIndex);
    webSocketService.makeChoice(pieceIndex);
  }

  requestGameState() {
    if (!this.isConnected || !this.currentGameId) {
      console.error('🎮 GameService: Cannot request state - not in game');
      return;
    }

    console.log('🎮 GameService: Requesting game state...');
    webSocketService.getGameState();
  }

  disconnect() {
    console.log('🎮 GameService: Disconnecting...');
    webSocketService.disconnect();
    this.currentState = null;
    this.currentGameId = null;
    this.isConnected = false;
  }

  // =========================================================================
  // GETTERS
  // =========================================================================

  getCurrentState() {
    return this.currentState;
  }

  getCurrentGameId() {
    return this.currentGameId;
  }

  getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      gameId: this.currentGameId
    };
  }

  isMyTurn() {
    if (!this.currentState) {
      return false;
    }
    
    const mySessionId = webSocketService.getSessionId();
    return this.currentState.currentPlayerId === mySessionId;
  }

  getAvailableMoves() {
    return this.currentState?.availableMoves || [];
  }

  isGameOver() {
    return this.currentState?.gameOver || false;
  }
}

// Create singleton instance
const gameService = new GameService();

export default gameService;