import * as PIXI from 'pixi.js';
import BoardComponent from '../../../components/game/BoardComponent';
import PiecesContainer from '../../../components/game/PiecesContainer';
import MoveManager from '../../../components/game/MoveManager';
import PieceMoveMenu from '../../../components/game/PieceMoveMenu';

/**
 * GameBoardContainer - Encapsulates board, pieces, and move visualization
 */
class GameBoardContainer extends PIXI.Container {
  constructor(layout, stateCoordinator) {
    super();
    
    this.layout = layout;
    this.stateCoordinator = stateCoordinator;
    
    this.board = null;
    this.pieces = null;
    this.moveManager = null;
    this.pieceMoveMenu = null;
    this.movesByPiece = {};
    this.pendingCaptureMove = null;
    
    this.createComponents();
    this.setupEventListeners();
  }

  /**
   * Create child components
   */
  createComponents() {
    const boardLayout = this.layout.getBoardLayout();

    // Create board
    this.board = new BoardComponent({
      size: boardLayout.size,
      gridSize: 15
    });

    // Position the board component at the layout coordinates
    this.board.x = boardLayout.x;
    this.board.y = boardLayout.y;

    if (boardLayout.anchor) {
      this.board.anchor?.set?.(boardLayout.anchor) ||
      this.board.pivot?.set?.(boardLayout.size * boardLayout.anchor, boardLayout.size * boardLayout.anchor);
    }

    this.addChild(this.board);

    // Create pieces at same position as board
    this.pieces = new PiecesContainer({
      boardComponent: this.board,
      boardSize: boardLayout.size
    });
    this.pieces.x = boardLayout.x;
    this.pieces.y = boardLayout.y;
    this.addChild(this.pieces);

    // Create move manager
    // Pass an object with selectPiece method so MoveManager can send moves
    const gameSceneProxy = {
      selectPiece: (pieceIndex) => {
        this.stateCoordinator.selectPiece(pieceIndex);
      }
    };

    this.moveManager = new MoveManager({
      gameScene: gameSceneProxy,
      boardComponent: this.board,
      piecesContainer: this.pieces
    });
    this.addChild(this.moveManager);

    this.pieceMoveMenu = new PieceMoveMenu({
      onSelect: (move) => this.chooseMove(move)
    });
    this.addChild(this.pieceMoveMenu);

    // Update board bounds for layout manager
    this.updateBoardBounds(boardLayout);
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Handle piece movements
    this.stateCoordinator.on('pieces:moved', (data) => {
      data.movements.forEach(movement => {
        this.pieces.movePiece(movement.pieceId, movement.from, movement.to);
      });
    });

    // Handle move options - pieces glow directly, no fixed panel (see
    // docs/move-selection-redesign.md)
    this.stateCoordinator.on('moves:available', (data) => {
      this.pieces.setLegalPieces(data.legalPieceIds);
      this.movesByPiece = data.movesByPiece || {};
    });

    // A tapped piece with exactly one legal move submits it directly. One
    // with more than one (two dice values, or bring-out vs normal) opens a
    // small menu anchored to that piece instead of a global list.
    this.stateCoordinator.on('piece:selected', (data) => {
      const moves = this.movesByPiece[data.pieceId];
      if (!moves || moves.length === 0) return;

      if (moves.length === 1) {
        this.chooseMove(moves[0]);
        return;
      }

      const piece = this.pieces.getPiece(data.pieceId);
      this.pieceMoveMenu.show(moves, piece.x + this.pieces.x, piece.y + this.pieces.y);
      this.pieces.showCaptureHighlights(this.unionCapturablePieceIds(moves));
    });

    // Resolves a capturing move with more than one candidate once the
    // player taps the specific enemy piece on the board.
    this.stateCoordinator.on('capture:target:selected', (data) => {
      if (!this.pendingCaptureMove) return;
      const move = this.pendingCaptureMove;
      this.pendingCaptureMove = null;
      this.pieces.clearCaptureTargets();
      this.submitMove(move, data.pieceId);
    });

    // Handle animation state changes
    this.stateCoordinator.on('pieces:animationStateChanged', (data) => {
      this.moveManager.setAnimationState(data.isAnimating);
    });

    // Handle turn changes
    this.stateCoordinator.on('turn:changed', (data) => {
      if (!data.isMyTurn) {
        this.resetMoveSelection();
      }
    });

    // Handle game end
    this.stateCoordinator.on('game:ended', () => {
      this.resetMoveSelection();
    });
  }

  /**
   * A move with exactly one capturable target resolves it automatically
   * (the backend would anyway - see MoveExecutor.checkForCaptures); more
   * than one needs the player to tap the specific piece on the board.
   */
  chooseMove(move) {
    if (move.willCapture && move.capturablePieceIds?.length > 1) {
      this.beginCaptureTargetSelection(move);
      return;
    }
    this.submitMove(move, move.capturablePieceIds?.[0]);
  }

  beginCaptureTargetSelection(move) {
    this.pendingCaptureMove = move;
    this.pieceMoveMenu.hide();
    this.pieces.setCaptureTargets(move.capturablePieceIds);
  }

  submitMove(move, capturedPieceId) {
    this.pieceMoveMenu.hide();
    this.pieces.clearCaptureHighlights();
    this.pieces.clearLegalPieces();
    this.stateCoordinator.selectPiece(move.number, capturedPieceId);
  }

  unionCapturablePieceIds(moves) {
    const ids = new Set();
    moves.forEach((move) => (move.capturablePieceIds || []).forEach((id) => ids.add(id)));
    return Array.from(ids);
  }

  resetMoveSelection() {
    this.pieceMoveMenu.hide();
    this.pieces.clearLegalPieces();
    this.pieces.clearCaptureHighlights();
    this.pieces.clearCaptureTargets();
    this.movesByPiece = {};
    this.pendingCaptureMove = null;
  }

  /**
   * Update board bounds for layout calculations
   */
  updateBoardBounds(boardLayout) {
    const bounds = {
      left: boardLayout.x - (boardLayout.size / 10),
      right: boardLayout.x + (boardLayout.size / 2),
      top: boardLayout.y - (boardLayout.size / 2),
      bottom: boardLayout.y + (boardLayout.size / 2)
    };
    this.layout.setBoardBounds(bounds);
  }

  /**
   * Update layout
   */
  updateLayout() {
    const boardLayout = this.layout.getBoardLayout();

    // Update board position (not container position)
    if (this.board) {
      this.board.x = boardLayout.x;
      this.board.y = boardLayout.y;
    }

    if (this.pieces) {
      this.pieces.x = boardLayout.x;
      this.pieces.y = boardLayout.y;
    }

    this.updateBoardBounds(boardLayout);
  }

  /**
   * Get board component (for external access if needed)
   */
  getBoard() {
    return this.board;
  }

  /**
   * Cleanup
   */
  destroy(options) {
    if (this.board) this.board.destroy();
    if (this.pieces) this.pieces.destroy();
    if (this.moveManager) this.moveManager.destroy();
    if (this.pieceMoveMenu) this.pieceMoveMenu.destroy();
    super.destroy(options);
  }
}

export default GameBoardContainer;
