// src/types/events.ts
//
// Every event name/payload EventBus actually carries, enumerated by
// grepping every real emit call site rather than designed from scratch -
// where two call sites genuinely disagree on shape, the type says so
// (a union or all-optional fields) instead of inventing one "correct"
// shape neither site actually sends.

import { GameResponse, GameState, MovesByPiece, Position, UiMoveOption } from './wire';

interface PieceMovement {
  pieceId: string;
  color: string;
  from: Position;
  to: Position;
  returnedHome: boolean;
}

export interface EventMap {
  // WebSocket connection lifecycle
  'websocket.connected': { sessionId: string };
  'websocket.disconnected': undefined;
  'websocket.connection.lost': { event: unknown };
  'websocket.error': { error: unknown };
  'websocket.personal.response': GameResponse;

  // GameService's own re-emits of the above
  'game.connection.established': { sessionId: string };
  'game.connection.lost': undefined;
  // Two real shapes reach here: GameService relays whatever
  // 'websocket.error' sent (arbitrary), while WebSocketService's
  // INVALID_CHOICE/SERVER_ERROR cases send { error, type }.
  'game.error': { error?: string; message?: string; type?: string } | unknown;

  // Broadcast game events (GAME_STATE_UPDATE, GAME_MESSAGE, DICE_ROLLED, etc.)
  'game.event': GameResponse;
  'game.generic.event': GameResponse;
  'game.dice': GameResponse;
  'game.message': GameResponse;
  'game.input.required': GameResponse;
  'game.response': GameResponse;
  'game.left': { message?: string };
  'game.ended.forced': { message?: string };

  'game.dice.roll.request': undefined;
  'game.created': { gameId: string; response: GameResponse };
  'game.joined': { gameId: string; response: GameResponse };

  'game.piece.selected': { pieceId: string; color: string; position: Position };
  'game.capture.target.selected': { pieceId: string };

  // Lobby
  'lobby.expired': { message?: string };
  'lobby.game.created': { gameId: string; response: GameResponse };
  'lobby.game.joined': { gameId: string; response: GameResponse };
  'lobby.response.game.created': GameResponse;
  'lobby.response.game.joined': GameResponse;

  // GameService's derived, granular state-change events
  'game.state.updated': {
    oldState: GameState | null;
    newState: GameState;
    message?: string;
    timestamp?: number;
  };
  'dice.updated': {
    old?: GameState['dice'];
    new: GameState['dice'] | { die1: number; die2: number };
    timestamp?: number;
  };
  'pieces.moved': { movements: PieceMovement[]; timestamp: number };
  // Known inconsistency, not yet reconciled (see ludo-game-backlog memory):
  // the WebSocketService-sourced emit only ever sets isMyTurn, the
  // GameService-sourced one only ever sets oldPlayer/newPlayer/playerName -
  // no single emit site sends the full set a consumer might want.
  'turn.changed': {
    isMyTurn?: boolean;
    oldPlayer?: string;
    newPlayer?: string;
    playerName?: string;
    message?: string;
    timestamp?: number;
  };
  'game.ended': { winner: string | null; gameStatus: GameState['gameStatus']; timestamp: number };

  'moves.available': {
    moves: UiMoveOption[];
    movesByPiece: MovesByPiece;
    legalPieceIds: string[];
    rawMessage?: string;
    timestamp: number;
  };

  'piece.animation.start': {
    pieceId: string;
    fromPosition: Position;
    toPosition: Position;
    timestamp: number;
  };
  'piece.animation.complete': { pieceId: string; finalPosition: Position; timestamp: number };

  // PixiJS infrastructure
  'pixi.initialized': { app: unknown };
  // width/height are the design-space dimensions LayoutManager should use
  // (always 1200x800 in landscape; the real viewport in portrait, where
  // the stage isn't letterboxed) - not necessarily the renderer's actual
  // pixel size.
  'pixi.resize': {
    width: number;
    height: number;
    isPortrait: boolean;
    dpi: number;
  };
  'pixi.destroyed': undefined;
  'pixi.scene.change': { scene: string };
}

export type EventName = keyof EventMap;
