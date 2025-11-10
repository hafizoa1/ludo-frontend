// src/services/WebSocketService.js

import SockJS from 'sockjs-client';
import { Client } from '@stomp/stompjs';
import eventBus from '../utils/EventBus';
import PlayerIdentity from '../utils/PlayerIdentity';

/**
 * WebSocketService - Pure STOMP communication layer
 * 
 * Responsibilities:
 * - Manage STOMP connection lifecycle
 * - Subscribe to server channels (broadcast + personal)
 * - Parse incoming messages
 * - Emit raw events to EventBus
 * 
 * Does NOT:
 * - Store game state
 * - Calculate diffs
 * - Parse move options (GameService does this)
 */
class WebSocketService {
  constructor() {
    this.stompClient = null;
    this.connected = false;
    this.connecting = false;
    this.sessionId = null;
    this.currentGameId = null;
    this.subscriptions = new Map();
    
    // Generate session ID
    this.sessionId = 'user-' + Math.floor(Math.random() * 10000);
    console.log('🔧 WebSocketService created with sessionId:', this.sessionId);
  }

  // =========================================================================
  // CONNECTION MANAGEMENT
  // =========================================================================

  connect() {
    if (this.connected || this.connecting) {
      console.log('⚠️ Already connected or connecting');
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      console.log('🔗 Connecting to STOMP...');
      console.log('🌐 WebSocket URL:', process.env.REACT_APP_WS_URL);
      console.log('🏷️ Environment:', process.env.REACT_APP_ENV);
      this.connecting = true;

      this.stompClient = new Client({
        webSocketFactory: () => new SockJS(process.env.REACT_APP_WS_URL),
        connectHeaders: {
          login: this.sessionId
        },
        debug: (str) => {
          console.log('🔍 STOMP Debug:', str);
        },
        
        onConnect: (frame) => {
          console.log('✅ Connected to STOMP!');
          console.log('Session ID:', frame.headers['user-name'] || this.sessionId);
          
          this.connected = true;
          this.connecting = false;
          
          this.subscribeToPersonalQueue();
          eventBus.emit('websocket.connected', { sessionId: this.sessionId });
          
          resolve();
        },
        
        onStompError: (frame) => {
          console.error('❌ STOMP Error:', frame);
          this.connected = false;
          this.connecting = false;
          
          eventBus.emit('websocket.error', { error: frame });
          reject(frame);
        },

        onWebSocketError: (error) => {
          console.error('❌ WebSocket Error:', error);
          this.connected = false;
          this.connecting = false;
          
          eventBus.emit('websocket.error', { error });
          reject(error);
        }
      });

      this.stompClient.activate();
    });
  }

  disconnect() {
    if (this.stompClient && this.connected) {
      console.log('👋 Disconnecting from STOMP...');
      
      this.subscriptions.forEach((subscription) => {
        subscription.unsubscribe();
      });
      this.subscriptions.clear();
      
      this.stompClient.deactivate();
      this.connected = false;
      this.currentGameId = null;
      
      eventBus.emit('websocket.disconnected');
    }
  }

  // =========================================================================
  // SUBSCRIPTION MANAGEMENT
  // =========================================================================

  /**
   * Subscribe to personal response queue
   * Receives: GAME_CREATED, JOINED_GAME, YOUR_TURN, MOVE_OPTIONS, INPUT_REQUIRED, INVALID_CHOICE
   */
  subscribeToPersonalQueue() {
    const subscription = this.stompClient.subscribe('/user/queue/response', (message) => {
      const response = JSON.parse(message.body);
      //console.log('📨 Personal Response:', response.type, '-', response.message);
      
      this.handlePersonalResponse(response);
    });

    this.subscriptions.set('personal.queue', subscription);
    //console.log('✅ Subscribed to personal queue');
  }

  /**
   * Subscribe to game broadcast events
   * Receives: GAME_STARTED, GAME_STATE_UPDATE, GAME_MESSAGE
   */
  subscribeToGameEvents(gameId) {
    console.log('🔔 Subscribing to game events for:', gameId);

    const eventsSubscription = this.stompClient.subscribe(`/topic/game/${gameId}/events`, (message) => {
      const event = JSON.parse(message.body);
      console.log('🎮 Broadcast Event:', event.type, '-', event.message);
      
      this.handleBroadcastEvent(event);
    });

    this.subscriptions.set(`game.${gameId}.events`, eventsSubscription);
    console.log('✅ Subscribed to broadcast events for:', gameId);
  }

  // =========================================================================
  // MESSAGE HANDLERS
  // =========================================================================

  /**
   * Handle personal queue messages (sent to specific player)
   */
  handlePersonalResponse(response) {
    console.log('🔍 Processing personal response:', response.type);

    switch (response.type) {
      case 'GAME_CREATED':
        this.handleGameCreated(response);
        break;

      case 'JOINED_GAME':
        this.handleJoinedGame(response);
        break;

      case 'YOUR_TURN':
        console.log('🎯 My turn!');
        // Add a small delay for smoother turn transitions
        setTimeout(() => {
          eventBus.emit('turn.changed', {
            isMyTurn: true,
            message: response.message,
            timestamp: Date.now()
          });
        }, 500); // 500ms delay for better UX
        break;

      case 'INPUT_REQUIRED':
        eventBus.emit('game.input.required', response);
        break;

      case 'MOVE_OPTIONS':
        console.log('🎯 Move options received');
        // Forward to GameService for existing processing
        eventBus.emit('websocket.personal.response', response);
        break;

      case 'CAPTURE_OPTIONS':
        console.log('💥 Capture options received');
        // Treat capture options the same as move options - reuse existing move panel
        eventBus.emit('websocket.personal.response', { ...response, type: 'MOVE_OPTIONS' });
        break;

      case 'INVALID_CHOICE':
        eventBus.emit('game.error', {
          message: response.message || 'Invalid choice',
          type: 'INVALID_CHOICE'
        });
        break;

      case 'CHOICE_RECEIVED':
        console.log('✅ Choice acknowledged by server');
        // No action needed - just acknowledgment
        break;

      default:
        console.log('❓ Unhandled personal response:', response.type);
        eventBus.emit('websocket.personal.response', response);
    }
  }

  /**
   * Handle broadcast messages (sent to all players in game)
   */
  handleBroadcastEvent(event) {
    console.log('🎮 Processing broadcast event:', event.type);
    
    switch (event.type) {
      case 'GAME_STARTED':
        console.log('🎮 Game has started!');
        eventBus.emit('game.started', {
          message: event.message,
          gameState: event.data
        });
        
        // Also emit state update for GameService to process
        if (event.data) {
          eventBus.emit('game.state.updated', {
            newState: event.data,
            oldState: null,
            message: event.message
          });
        }
        break;
        
      case 'GAME_STATE_UPDATE':
        console.log('🔄 Game state updated');
        eventBus.emit('game.event', event);
        break;
        
      case 'GAME_MESSAGE':
        console.log('📢 Game message:', event.message);
        eventBus.emit('game.message', event);
        break;
      case 'DICE_ROLLED':
        eventBus.emit('game.dice', event);
        break; 
      default:
        console.log('❓ Unhandled broadcast event:', event.type);
        eventBus.emit('game.event', event);
    }
  }

  /**
   * Handle game creation
   */
  handleGameCreated(response) {
    const gameId = this.extractGameId(response.message);
    if (gameId) {
      this.currentGameId = gameId;
      console.log('🎮 Game created, auto-subscribing to:', gameId);
      this.subscribeToGameEvents(gameId);
      eventBus.emit('game.created', { gameId, response });
    } else {
      console.error('❌ Could not extract gameId from:', response.message);
    }
  }

  /**
   * Handle joining game
   */
  handleJoinedGame(response) {
    if (this.currentGameId) {
      console.log('🎮 Joined game, subscribing to:', this.currentGameId);
      this.subscribeToGameEvents(this.currentGameId);
      eventBus.emit('game.joined', { gameId: this.currentGameId, response });
    } else {
      console.error('❌ Joined game but no currentGameId set');
    }
  }

  /**
   * Extract game ID from message string
   */
  extractGameId(message) {
    const match = message.match(/Game (\w+) created/);
    return match ? match[1] : null;
  }

  // =========================================================================
  // OUTGOING MESSAGES
  // =========================================================================

  send(destination, payload = {}) {
    if (!this.connected) {
      console.error('❌ Cannot send message - not connected');
      eventBus.emit('websocket.error', { error: 'Not connected' });
      return;
    }

    console.log(`📤 Sending to ${destination}:`, payload);
    this.stompClient.publish({
      destination: destination,
      body: JSON.stringify(payload)
    });
  }

  createGame() {
    const playerId = PlayerIdentity.getPlayerId();
    this.send('/app/game.create', { playerId });
  }

  joinGame(gameId) {
    this.currentGameId = gameId;
    const playerId = PlayerIdentity.getPlayerId();
    this.send('/app/game.join', { gameId, playerId });
  }

  rollDice() {
    this.send('/app/game.roll');
  }

  sendChoice(choice) {
    this.send('/app/game.choice', { choice });
  }

  makeChoice(choice) {
    this.send('/app/game.choice', { choice });
  }

  getGameState() {
    this.send('/app/game.state');
  }

  leaveGame() {
    this.send('/app/game.leave');
  }

  // =========================================================================
  // GETTERS
  // =========================================================================

  isConnected() {
    return this.connected;
  }

  getCurrentGameId() {
    return this.currentGameId;
  }

  getSessionId() {
    return this.sessionId;
  }
}

const webSocketService = new WebSocketService();
export default webSocketService;