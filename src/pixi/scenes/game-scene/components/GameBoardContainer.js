import * as PIXI from 'pixi.js';
import BoardComponent from '../../../components/game/BoardComponent';
import PiecesContainer from '../../../components/game/PiecesContainer';
import MoveManager from '../../../components/game/MoveManager';

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

    // Handle move options
    this.stateCoordinator.on('moves:available', (data) => {
      this.moveManager.resetProcessingState();
      this.moveManager.showAvailableMoves(data.moves);
    });

    // Handle animation state changes
    this.stateCoordinator.on('pieces:animationStateChanged', (data) => {
      this.moveManager.setAnimationState(data.isAnimating);
    });

    // Handle turn changes
    this.stateCoordinator.on('turn:changed', (data) => {
      if (!data.isMyTurn) {
        this.moveManager.hideMoves();
      }
    });

    // Handle game end
    this.stateCoordinator.on('game:ended', () => {
      this.moveManager.hideMoves();
    });
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
    super.destroy(options);
  }
}

export default GameBoardContainer;
