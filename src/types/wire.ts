// src/types/wire.ts
//
// Mirrors the backend's game/state DTOs exactly (com.ludo.ludo_server.game.state.*)
// - field names and shapes here must match those Java classes field-for-field,
// not the frontend's own internal naming.

export type PieceColor = 'RED' | 'BLUE' | 'GREEN' | 'YELLOW';
export type PlayerColorName = 'Red' | 'Blue' | 'Green' | 'Yellow';
export type MoveType = 'BRING_OUT' | 'NORMAL' | 'COMBINED' | 'ENTER_HOME' | 'FINISH' | 'CAPTURE';
export type GameStatus = 'IN_PROGRESS' | 'FINISHED';

export interface Position {
  row: number;
  col: number;
}

export interface DiceState {
  die1: number;
  die2: number;
  isDoubleSix: boolean;
}

export interface PlayerState {
  playerId: string;
  playerName: string;
  colors: PlayerColorName[];
  isHuman: boolean;
  homePiecesCount: number;
  activePiecesCount: number;
  finishedPiecesCount: number;
  hasWon: boolean;
}

export interface PieceState {
  id: string;
  color: PieceColor;
  number: number;
  position: Position;
  pathPosition: number;
  isAtHome: boolean;
  isFinished: boolean;
}

/**
 * A single offered choice (a move, or - when moveType is CAPTURE - a
 * capture target). `index` is the 1-based value to send back via
 * /app/game.choice's `choice` field to pick this option.
 */
export interface MoveOptionState {
  index: number;
  pieceId: string;
  diceValue: number;
  moveType: MoveType;
  targetPosition: Position;
  description: string;
  willCapture: boolean;
  capturablePieceIds: string[];
}

export interface GameState {
  dice: DiceState;
  currentPlayerName: string;
  currentPlayerId: string;
  players: PlayerState[];
  pieces: PieceState[];
  availableMoves: MoveOptionState[];
  gameOver: boolean;
  winner: string | null;
  gameStatus: GameStatus;
}

/**
 * GameService.mapAvailableMoves' output shape - what the UI actually
 * consumes (MoveManager/PieceMoveMenu need `number` + `description`;
 * the rest carried through for piece highlighting and capture handling).
 */
export interface UiMoveOption {
  number: number;
  description: string;
  pieceId: string;
  diceValue: number;
  moveType: MoveType;
  targetPosition: Position;
  willCapture: boolean;
  capturablePieceIds: string[];
}

export type MovesByPiece = Record<string, UiMoveOption[]>;

// Mirrors com.ludo.ludo_server.game.websocket.controller.ResponseType
export type ResponseType =
  | 'GAME_STARTED'
  | 'GAME_CREATED'
  | 'GAME_NOT_FOUND'
  | 'GAME_FULL'
  | 'JOINED_GAME'
  | 'NO_GAME'
  | 'LEFT_GAME'
  | 'GAME_NOT_READY'
  | 'GAME_STATE'
  | 'CHOICE_RECEIVED'
  | 'NOT_YOUR_TURN'
  | 'DICE_ROLL_RECEIVED'
  | 'GAME_STATE_UPDATE'
  | 'PENDING_CHOICE'
  | 'INVALID_CHOICE'
  | 'INPUT_REQUIRED'
  | 'GAME_MESSAGE'
  | 'MOVE_OPTIONS'
  | 'CAPTURE_OPTIONS'
  | 'NO_PENDING_CHOICE'
  | 'INVALID_GAME'
  | 'DICE_ROLLED'
  | 'DICE_ROLL_ERROR'
  | 'YOUR_TURN'
  | 'ROLL_ERROR'
  | 'PLAYER_JOINED'
  | 'GAME_ENDED_TIMEOUT'
  | 'GAME_ENDED'
  | 'LOBBY_EXPIRED'
  | 'SERVER_ERROR';

/**
 * Mirrors com.ludo.ludo_server.game.websocket.controller.GameResponse.
 * `message` is populated on success, `error` on failure - the two are
 * mutually exclusive, which is exactly the distinction a past bug this
 * session (reading the wrong field) would have been caught by typing.
 */
export interface GameResponse {
  success: boolean;
  type: ResponseType;
  message?: string;
  data?: GameState | null;
  error?: string;
}
