import * as PIXI from 'pixi.js';
import eventBus from '../../../../utils/EventBus';
import gameService from '../../../../services/GameService';

/**
 * StateCoordinator - Central hub for state management and event coordination
 * Subscribes to all GameService events and emits clean, processed events to components
 */
class StateCoordinator extends PIXI.Container {
  constructor() {
    super();
    this.eventUnsubscribers = [];
    this.activeAnimations = 0;
    this.setupEventListeners();
  }

  /**
   * Setup all event listeners
   */
  setupEventListeners() {
    // Dice events
    this.subscribe('game.dice.roll.request', () => {
      gameService.rollDice();
    });

    this.subscribe('dice.updated', (data) => {
      this.emit('dice:updated', data);
    });

    // Turn events
    this.subscribe('turn.changed', (data) => {
      this.emit('turn:changed', {
        isMyTurn: data.isMyTurn,
        playerName: data.playerName,
        newPlayer: data.newPlayer
      });
    });

    this.subscribe('game.message', (data) => {
      if (data.message?.includes('turn') && data.message?.includes('roll')) {
        this.emit('turn:myTurnMessage', data.message);
      }
      this.emit('ui:message', { message: data.message, duration: 3000 });
    });

    // Piece movement events
    this.subscribe('piece.animation.start', (data) => {
      this.activeAnimations++;
      if (this.activeAnimations === 1) {
        this.emit('pieces:animationStateChanged', { isAnimating: true });
      }
    });

    this.subscribe('piece.animation.complete', (data) => {
      this.activeAnimations--;
      if (this.activeAnimations === 0) {
        this.emit('pieces:animationStateChanged', { isAnimating: false });
      }
    });

    this.subscribe('pieces.moved', (data) => {
      this.emit('pieces:moved', { movements: data.movements });
    });

    // Move options
    this.subscribe('moves.available', (data) => {
      this.emit('moves:available', { moves: data.moves });
    });

    // Game state events
    this.subscribe('game.state.updated', (data) => {
      this.emit('state:updated', { newState: data.newState });
    });

    this.subscribe('game.ended', (data) => {
      this.emit('game:ended', { winner: data.winner });
    });

    // Error and connection events
    this.subscribe('game.error', (data) => {
      this.emit('error:game', { error: data.error });
    });

    this.subscribe('game.connection.lost', () => {
      this.emit('connection:lost');
    });

    this.subscribe('game.connection.established', () => {
      this.emit('connection:restored');
    });
  }

  /**
   * Subscribe to eventBus and track unsubscriber
   */
  subscribe(event, handler) {
    const unsubscribe = eventBus.subscribe(event, handler);
    this.eventUnsubscribers.push(unsubscribe);
  }

  /**
   * Request current game state
   */
  requestGameState() {
    gameService.requestGameState();
  }

  /**
   * Check if it's my turn
   */
  isMyTurn() {
    return gameService.isMyTurn();
  }

  /**
   * Get current game state
   */
  getCurrentState() {
    return gameService.getCurrentState();
  }

  /**
   * Select a piece
   */
  selectPiece(pieceIndex) {
    gameService.selectPiece(pieceIndex);
  }

  /**
   * Cleanup
   */
  destroy(options) {
    this.eventUnsubscribers.forEach(unsubscribe => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    });
    this.eventUnsubscribers = [];
    super.destroy(options);
  }
}

export default StateCoordinator;
