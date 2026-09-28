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
        pieceId: 'red-0',
        diceValue: 3,
        moveType: 'CAPTURE',
        targetPosition: { x: 5, y: 5 },
        description: 'red-0: Capture this piece'
      },
      {
        index: 2,
        pieceId: 'red-1',
        diceValue: 3,
        moveType: 'CAPTURE',
        targetPosition: { x: 5, y: 5 },
        description: 'red-1: Capture this piece'
      }
    ];

    const mapped = gameService.mapAvailableMoves(backendOptions);

    expect(mapped).toEqual([
      {
        number: 1,
        description: 'red-0: Capture this piece',
        pieceId: 'red-0',
        diceValue: 3,
        moveType: 'CAPTURE',
        targetPosition: { x: 5, y: 5 }
      },
      {
        number: 2,
        description: 'red-1: Capture this piece',
        pieceId: 'red-1',
        diceValue: 3,
        moveType: 'CAPTURE',
        targetPosition: { x: 5, y: 5 }
      }
    ]);
  });

  test('MOVE_OPTIONS with structured availableMoves emits moves.available with mapped moves (multi-capture scenario)', () => {
    const received = [];
    const unsubscribe = eventBus.subscribe('moves.available', (data) => {
      received.push(data);
    });

    const response = {
      type: 'MOVE_OPTIONS',
      success: true,
      message: 'red-0 can capture multiple pieces:\n1. Capture red-0\n2. Capture red-1',
      data: fakeGameState({
        availableMoves: [
          { index: 1, pieceId: 'red-0', diceValue: 3, moveType: 'CAPTURE', targetPosition: null, description: 'Capture piece A' },
          { index: 2, pieceId: 'red-1', diceValue: 3, moveType: 'CAPTURE', targetPosition: null, description: 'Capture piece B' }
        ]
      })
    };

    eventBus.emit('websocket.personal.response', response);

    // The MOVE_OPTIONS handler delays emitting by 1s for animation timing.
    expect(received).toHaveLength(0);
    jest.advanceTimersByTime(1000);

    expect(received).toHaveLength(1);
    expect(received[0].moves).toEqual([
      { number: 1, description: 'Capture piece A', pieceId: 'red-0', diceValue: 3, moveType: 'CAPTURE', targetPosition: null },
      { number: 2, description: 'Capture piece B', pieceId: 'red-1', diceValue: 3, moveType: 'CAPTURE', targetPosition: null }
    ]);

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
