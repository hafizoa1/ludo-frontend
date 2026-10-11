import eventBus from '../utils/EventBus';
import gameService from './GameService';

/**
 * These tests cover the seam that broke silently before: the backend sends
 * structured MoveOptionState objects (see Game.currentOptions / GameState
 * .availableMoves on the server), and GameService must map that onto the
 * shape MoveManager already renders (`number` + `description`).
 *
 * No real WebSocket connection, no real dice roll - the fake response
 * payloads below are shaped exactly like what MultiplayerInputProvider
 * actually sends, so this tests the mapping logic without needing to
 * reach a capture scenario through real, random gameplay.
 */

// Minimal but structurally accurate GameState fixture (mirrors
// com.ludo.ludo_server.game.state.GameState's fields).
function fakeGameState(overrides = {}) {
  return {
    dice: { die1: 3, die2: 4, isDoubleSix: false },
    currentPlayerName: 'Player 1',
    currentPlayerId: 'player1',
    players: [],
    pieces: [],
    availableMoves: [],
    gameOver: false,
    winner: null,
    gameStatus: 'IN_PROGRESS',
    ...overrides
  };
}

describe('GameService - structured move/capture options', () => {
  let consoleLogSpy;

  beforeEach(() => {
    jest.useFakeTimers();
    // Reset shared singleton state between tests.
    gameService.currentState = null;
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    consoleLogSpy.mockRestore();
  });

  test('mapAvailableMoves converts backend MoveOptionState shape to the UI shape', () => {
    const backendOptions = [
      {
        index: 1,
        pieceId: 'R1',
        diceValue: 3,
        moveType: 'NORMAL',
        targetPosition: { row: 1, col: 8 },
        description: 'Red piece 1: Move 3 spaces (captures B1, B2) to (1, 8)',
        willCapture: true,
        capturablePieceIds: ['B1', 'B2']
      },
      {
        index: 2,
        pieceId: 'R1',
        diceValue: 6,
        moveType: 'NORMAL',
        targetPosition: { row: 4, col: 8 },
        description: 'Red piece 1: Move 6 spaces to (4, 8)',
        willCapture: false,
        capturablePieceIds: []
      }
    ];

    const mapped = gameService.mapAvailableMoves(backendOptions);

    expect(mapped).toEqual([
      {
        number: 1,
        description: 'Red piece 1: Move 3 spaces (captures B1, B2) to (1, 8)',
        pieceId: 'R1',
        diceValue: 3,
        moveType: 'NORMAL',
        targetPosition: { row: 1, col: 8 },
        willCapture: true,
        capturablePieceIds: ['B1', 'B2']
      },
      {
        number: 2,
        description: 'Red piece 1: Move 6 spaces to (4, 8)',
        pieceId: 'R1',
        diceValue: 6,
        moveType: 'NORMAL',
        targetPosition: { row: 4, col: 8 },
        willCapture: false,
        capturablePieceIds: []
      }
    ]);
  });

  test('mapAvailableMoves defaults capturablePieceIds to an empty array when the backend omits it', () => {
    const mapped = gameService.mapAvailableMoves([
      { index: 1, pieceId: 'R1', diceValue: 6, moveType: 'BRING_OUT', targetPosition: null, description: 'Bring out', willCapture: false }
    ]);

    expect(mapped[0].capturablePieceIds).toEqual([]);
  });

  test('groupMovesByPiece groups moves under each distinct pieceId', () => {
    const moves = [
      { number: 1, pieceId: 'R1', diceValue: 3 },
      { number: 2, pieceId: 'R1', diceValue: 6 },
      { number: 3, pieceId: 'R2', diceValue: 6 }
    ];

    const grouped = gameService.groupMovesByPiece(moves);

    expect(Object.keys(grouped)).toEqual(['R1', 'R2']);
    expect(grouped.R1).toHaveLength(2);
    expect(grouped.R2).toHaveLength(1);
  });

  test('MOVE_OPTIONS with structured availableMoves emits moves.available with mapped moves, plus the per-piece grouping the board-first redesign needs', () => {
    const received = [];
    const unsubscribe = eventBus.subscribe('moves.available', (data) => {
      received.push(data);
    });

    const response = {
      type: 'MOVE_OPTIONS',
      success: true,
      message: 'Available moves:\n1. Red piece 1: Move 3 spaces (captures B1, B2) to (1, 8)\n2. Red piece 1: Move 6 spaces to (4, 8)\n3. Red piece 2: Bring out of home (using 6) to (6, 1)',
      data: fakeGameState({
        availableMoves: [
          { index: 1, pieceId: 'R1', diceValue: 3, moveType: 'NORMAL', targetPosition: { row: 1, col: 8 }, description: 'Red piece 1: Move 3 spaces (captures B1, B2) to (1, 8)', willCapture: true, capturablePieceIds: ['B1', 'B2'] },
          { index: 2, pieceId: 'R1', diceValue: 6, moveType: 'NORMAL', targetPosition: { row: 4, col: 8 }, description: 'Red piece 1: Move 6 spaces to (4, 8)', willCapture: false, capturablePieceIds: [] },
          { index: 3, pieceId: 'R2', diceValue: 6, moveType: 'BRING_OUT', targetPosition: { row: 6, col: 1 }, description: 'Red piece 2: Bring out of home (using 6) to (6, 1)', willCapture: false, capturablePieceIds: [] }
        ]
      })
    };

    eventBus.emit('websocket.personal.response', response);

    // The MOVE_OPTIONS handler delays emitting by 1s for animation timing.
    expect(received).toHaveLength(0);
    jest.advanceTimersByTime(1000);

    expect(received).toHaveLength(1);
    const emitted = received[0];

    expect(emitted.moves).toHaveLength(3);
    expect(emitted.moves[0]).toMatchObject({ number: 1, pieceId: 'R1', willCapture: true, capturablePieceIds: ['B1', 'B2'] });

    // The new, additive fields - which pieces should glow, and each one's
    // own choices once tapped.
    expect(emitted.legalPieceIds).toEqual(['R1', 'R2']);
    expect(emitted.movesByPiece.R1).toHaveLength(2);
    expect(emitted.movesByPiece.R2).toHaveLength(1);
    expect(emitted.movesByPiece.R1[0].willCapture).toBe(true);

    unsubscribe();
  });

  test('MOVE_OPTIONS with no availableMoves falls back to game.input.required instead of throwing', () => {
    const movesReceived = [];
    const inputRequiredReceived = [];
    const unsubMoves = eventBus.subscribe('moves.available', (data) => movesReceived.push(data));
    const unsubInput = eventBus.subscribe('game.input.required', (data) => inputRequiredReceived.push(data));

    const response = {
      type: 'MOVE_OPTIONS',
      success: true,
      message: 'Some non-move prompt',
      data: fakeGameState({ availableMoves: [] })
    };

    eventBus.emit('websocket.personal.response', response);
    jest.advanceTimersByTime(1000);

    expect(movesReceived).toHaveLength(0);
    expect(inputRequiredReceived).toHaveLength(1);
    expect(inputRequiredReceived[0]).toBe(response);

    unsubMoves();
    unsubInput();
  });
});
