// src/services/GameService.ts

import webSocketService from './WebSocketService';
import eventBus from '../utils/EventBus';
import {
  GameResponse,
  GameState,
  MoveOptionState,
  MovesByPiece,
  PieceState,
  UiMoveOption
} from '../types/wire';

interface PieceMovement {
  pieceId: string;
  color: string;
  from: PieceState['position'];
  to: PieceState['position'];
}

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
  currentState: GameState | null;
  isConnected: boolean;
  currentGameId: string | null;

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

  initializeWebSocketListeners(): void {
    eventBus.subscribe('websocket.connected', (data: { sessionId: string }) => {
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

    eventBus.subscribe('websocket.error', (data: unknown) => {
      console.error('🎮 GameService: WebSocket error', data);
      eventBus.emit('game.error', data);
    });

    eventBus.subscribe('websocket.personal.response', (response: GameResponse) => {
      this.handlePersonalResponse(response);
    });

    eventBus.subscribe('game.event', (event: GameResponse) => {
      this.handleGameEvent(event);
    });

    eventBus.subscribe('game.dice', (event: GameResponse) => {
      this.handleDiceEvent(event);
    });

    eventBus.subscribe('game.created', (data: { gameId: string; response: GameResponse }) => {
      this.currentGameId = data.gameId;
      console.log('🎮 GameService: Game created:', data.gameId);
      eventBus.emit('lobby.game.created', data);
    });

    eventBus.subscribe('game.joined', (data: { gameId: string; response: GameResponse }) => {
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
  handlePersonalResponse(response: GameResponse): void {
    console.log('🎮 GameService: Personal response:', response.type);

    if (response.success && response.data) {
      this.updateGameState(response.data);
    }

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
        // Structured options come from the backend via GameState.availableMoves
        // (see Game.currentOptions / MoveOptionState on the server) - the index
        // there is exactly what /app/game.choice expects back.
        if (response.data?.availableMoves?.length) {
          const moveOptions = this.mapAvailableMoves(response.data.availableMoves);

          console.log('🎮 GameService: Delaying move options for animation');
          setTimeout(() => {
            console.log('🎮 GameService: Emitting move options after delay');
            const movesByPiece = this.groupMovesByPiece(moveOptions);
            eventBus.emit('moves.available', {
              moves: moveOptions,
              movesByPiece,
              legalPieceIds: Object.keys(movesByPiece),
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
  handleGameEvent(event: GameResponse): void {
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
  handleDiceEvent(event: GameResponse): void {
    console.log('🎮 GameService: Dice event:', event.type);

    if (event.success && event.message) {
      // Parse the concatenated dice roll string
      const die1 = parseInt(event.message.charAt(0), 10);
      const die2 = parseInt(event.message.charAt(1), 10);

      eventBus.emit('dice.updated', {
        new: {
          die1: die1,
          die2: die2
        }
      });
    }
  }

  // =========================================================================
  // STATE MANAGEMENT
  // =========================================================================

  /**
   * Update shared game state and emit granular change events
   */
  updateGameState(newState: GameState): void {
    const oldState = this.currentState;
    this.currentState = newState;

    console.log('🎮 GameService: Shared state updated', {
      currentPlayer: newState.currentPlayerName,
      dice: newState.dice,
      gameStatus: newState.gameStatus
    });

    this.emitStateChangeEvents(oldState, newState);

    eventBus.emit('game.state.updated', {
      oldState,
      newState,
      timestamp: Date.now()
    });
  }

  /**
   * Emit specific events for different types of state changes
   */
  emitStateChangeEvents(oldState: GameState | null, newState: GameState): void {
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
  calculatePieceMovements(oldPieces: PieceState[], newPieces: PieceState[]): PieceMovement[] {
    const movements: PieceMovement[] = [];

    newPieces.forEach(newPiece => {
      const oldPiece = oldPieces.find(p => p.id === newPiece.id);

      if (oldPiece &&
          (oldPiece.position.row !== newPiece.position.row ||
           oldPiece.position.col !== newPiece.position.col)) {
        movements.push({
          pieceId: newPiece.id,
          color: newPiece.color,
          from: oldPiece.position,
          to: newPiece.position
        });
      }
    });

    return movements;
  }

  // =========================================================================
  // MOVE OPTIONS MAPPING
  // =========================================================================

  /**
   * Map the backend's structured MoveOptionState list onto the shape the UI
   * already consumes (MoveManager needs `number` + `description`; the rest
   * is carried through for future use, e.g. piece highlighting).
   */
  mapAvailableMoves(availableMoves: MoveOptionState[]): UiMoveOption[] {
    return availableMoves.map((option) => ({
      number: option.index,
      description: option.description,
      pieceId: option.pieceId,
      diceValue: option.diceValue,
      moveType: option.moveType,
      targetPosition: option.targetPosition,
      willCapture: option.willCapture,
      capturablePieceIds: option.capturablePieceIds || []
    }));
  }

  /**
   * Groups moves by pieceId - which pieces have a legal move (Object.keys)
   * and each piece's own choices, for the board-first redesign.
   */
  groupMovesByPiece(moves: UiMoveOption[]): MovesByPiece {
    const movesByPiece: MovesByPiece = {};
    for (const move of moves) {
      if (!movesByPiece[move.pieceId]) {
        movesByPiece[move.pieceId] = [];
      }
      movesByPiece[move.pieceId].push(move);
    }
    return movesByPiece;
  }

  // =========================================================================
  // PUBLIC ACTION METHODS
  // =========================================================================

  async connect(): Promise<boolean> {
    try {
      await webSocketService.connect();
      return true;
    } catch (error) {
      console.error('🎮 GameService: Connection failed', error);
      eventBus.emit('game.error', { error: 'Connection failed' });
      return false;
    }
  }

  createGame(): void {
    if (!this.isConnected) {
      console.error('🎮 GameService: Cannot create game - not connected');
      eventBus.emit('game.error', { error: 'Not connected to server' });
      return;
    }

    console.log('🎮 GameService: Creating game...');
    webSocketService.createGame();
  }

  joinGame(gameId: string): void {
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

  rollDice(): void {
    if (!this.isConnected || !this.currentGameId) {
      console.error('🎮 GameService: Cannot roll dice - not in game');
      eventBus.emit('game.error', { error: 'Not in an active game' });
      return;
    }

    console.log('🎮 GameService: Rolling dice...');
    webSocketService.rollDice();
  }

  selectPiece(pieceIndex: number, capturedPieceId?: string): void {
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
    webSocketService.makeChoice(pieceIndex, capturedPieceId);
  }

  requestGameState(): void {
    if (!this.isConnected || !this.currentGameId) {
      console.error('🎮 GameService: Cannot request state - not in game');
      return;
    }

    console.log('🎮 GameService: Requesting game state...');
    webSocketService.getGameState();
  }

  disconnect(): void {
    console.log('🎮 GameService: Disconnecting...');
    webSocketService.disconnect();
    this.currentState = null;
    this.currentGameId = null;
    this.isConnected = false;
  }

  // =========================================================================
  // GETTERS
  // =========================================================================

  getCurrentState(): GameState | null {
    return this.currentState;
  }

  getCurrentGameId(): string | null {
    return this.currentGameId;
  }

  getConnectionStatus(): { isConnected: boolean; gameId: string | null } {
    return {
      isConnected: this.isConnected,
      gameId: this.currentGameId
    };
  }

  isMyTurn(): boolean {
    if (!this.currentState) {
      return false;
    }

    const mySessionId = webSocketService.getSessionId();
    return this.currentState.currentPlayerId === mySessionId;
  }

  getAvailableMoves(): MoveOptionState[] {
    return this.currentState?.availableMoves || [];
  }

  isGameOver(): boolean {
    return this.currentState?.gameOver || false;
  }
}

// Create singleton instance
const gameService = new GameService();

export default gameService;
