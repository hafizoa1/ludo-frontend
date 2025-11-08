// src/pixi/components/game/PiecesContainer.js

import * as PIXI from 'pixi.js';
import { gsap } from 'gsap';
import { backendToPixel, getPieceHomePositions, generateStepByStepPath } from '../../utils/coordinateUtils';
import eventBus from '../../../utils/EventBus';

/**
 * PiecesContainer - Manages all game pieces
 * Handles piece positioning, animations, and state updates
 */
class PiecesContainer extends PIXI.Container {
  constructor(options = {}) {
    super();
    
    this.boardComponent = options.boardComponent;
    this.boardSize = options.boardSize || 600;
    
    this.pieces = new Map(); // pieceId -> Piece component
    this.playerPieces = {
      red: [],
      blue: [],
      green: [],
      yellow: []
    };
    
    console.log('🔴 PiecesContainer created');
    
    this.setupPieces();
  }

  /**
   * Setup initial pieces for all players
   */
  setupPieces() {
    const colors = ['red', 'blue', 'green', 'yellow'];
    
    colors.forEach(color => {
      this.createPlayerPieces(color);
    });
    
    console.log('🔴 All pieces created');
  }

  /**
 * Create pieces for a specific player - FIXED to use backend IDs
 */
  createPlayerPieces(color) {
    const homePositions = getPieceHomePositions(color);
  
    homePositions.forEach((pos, index) => {
      const piece = this.createPiece(color, index, pos);
      this.playerPieces[color].push(piece);
      this.pieces.set(piece.id, piece); // Uses backend-compatible ID
      this.addChild(piece);
    });
  
    console.log(`🔴 Created 4 ${color} pieces with IDs:`, 
      this.playerPieces[color].map(p => p.id));
  }

  /**
   * Create individual piece
   */
  createPiece(color, index, gridPosition) {
  const piece = new PIXI.Container();

  // Generate piece ID to match backend format (R1, G1, B1, Y1, etc.)
  const colorLetter = color.charAt(0).toUpperCase(); // R, G, B, Y
  piece.id = `${colorLetter}${index + 1}`; // R1, R2, G1, G2, etc.

  piece.color = color;
  piece.index = index;
  piece.gridPosition = { ...gridPosition };
  piece.isInHome = true;
  piece.isSelected = false;
  piece.canMove = false;

  this.createPieceVisual(piece, color);
  this.positionPiece(piece, gridPosition);
  this.setupPieceInteraction(piece);

  return piece;
}

  /**
   * Create visual appearance of piece
   */
  createPieceVisual(piece, color) {
    const colors = {
      red: 0xff4444,
      blue: 0x4444ff,
      green: 0x44ff44,
      yellow: 0xffdd44
    };

    const pieceSize = (this.boardSize / 15) * 0.6; // 60% of cell size

    // Main piece body
    const body = new PIXI.Graphics();
    body.circle(0, 0, pieceSize);
    body.fill({ color: colors[color] });
    body.stroke({ color: 0xffffff, width: 2 });

    // Inner highlight
    const highlight = new PIXI.Graphics();
    highlight.circle(-pieceSize * 0.3, -pieceSize * 0.3, pieceSize * 0.3);
    highlight.fill({ color: 0xffffff, alpha: 0.4 });

    // Shadow
    const shadow = new PIXI.Graphics();
    shadow.circle(2, 2, pieceSize);
    shadow.fill({ color: 0x000000, alpha: 0.3 });

    // Selection ring (hidden initially)
    const selectionRing = new PIXI.Graphics();
    selectionRing.circle(0, 0, pieceSize * 1.3);
    selectionRing.stroke({ color: 0xffffff, width: 3 });
    selectionRing.visible = false;
    selectionRing.name = 'selectionRing';

    // Available move indicator (hidden initially)
    const moveIndicator = new PIXI.Graphics();
    moveIndicator.circle(0, 0, pieceSize * 1.5);
    moveIndicator.fill({ color: 0x00ff00, alpha: 0.3 });
    moveIndicator.visible = false;
    moveIndicator.name = 'moveIndicator';

    // Tooltip for piece ID (hidden initially)
    const tooltip = this.createTooltip(piece.id, pieceSize);
    tooltip.visible = false;
    tooltip.name = 'tooltip';

    // Add all elements to piece
    piece.addChild(shadow);
    piece.addChild(selectionRing);
    piece.addChild(moveIndicator);
    piece.addChild(body);
    piece.addChild(highlight);
    piece.addChild(tooltip);

    // Store references
    piece.body = body;
    piece.highlight = highlight;
    piece.shadow = shadow;
    piece.selectionRing = selectionRing;
    piece.moveIndicator = moveIndicator;
    piece.tooltip = tooltip;
  }

  /**
   * Create tooltip showing piece ID
   */
  createTooltip(pieceId, pieceSize) {
    const tooltipContainer = new PIXI.Container();

    // Tooltip background
    const tooltipBg = new PIXI.Graphics();
    const padding = 6;
    const textHeight = 16;
    const textWidth = pieceId.length * 10 + padding * 2;

    tooltipBg.roundRect(
      -textWidth / 2,
      -pieceSize - textHeight - 10,
      textWidth,
      textHeight + padding,
      4
    );
    tooltipBg.fill({ color: 0x000000, alpha: 0.8 });
    tooltipBg.stroke({ color: 0xffffff, width: 1 });

    // Tooltip text
    const tooltipText = new PIXI.Text(pieceId, {
      fontFamily: 'Arial, sans-serif',
      fontSize: 12,
      fontWeight: 'bold',
      fill: '#ffffff',
      align: 'center'
    });
    tooltipText.anchor.set(0.5);
    tooltipText.x = 0;
    tooltipText.y = -pieceSize - textHeight / 2 - 5;

    tooltipContainer.addChild(tooltipBg);
    tooltipContainer.addChild(tooltipText);

    return tooltipContainer;
  }

  /**
   * Setup piece interaction
   */
  setupPieceInteraction(piece) {
    piece.interactive = true;
    piece.buttonMode = true;

    // Hover effects
    piece.on('pointerover', () => {
      // Always show tooltip on hover
      this.showPieceTooltip(piece);

      if (piece.canMove) {
        this.showPieceHover(piece);
      }
    });

    piece.on('pointerout', () => {
      // Always hide tooltip
      this.hidePieceTooltip(piece);

      this.hidePieceHover(piece);
    });

    // Click handler
    piece.on('pointerdown', () => {
      if (piece.canMove) {
        this.handlePieceClick(piece);
      }
    });
  }

  /**
   * Show hover effect for piece
   */
  showPieceHover(piece) {
    gsap.to(piece.scale, {
      x: 1.1,
      y: 1.1,
      duration: 0.2,
      ease: "power2.out"
    });
    
    gsap.to(piece.highlight, {
      alpha: 0.6,
      duration: 0.2
    });
  }

  /**
   * Hide hover effect for piece
   */
  hidePieceHover(piece) {
    if (!piece.isSelected) {
      gsap.to(piece.scale, {
        x: 1,
        y: 1,
        duration: 0.2,
        ease: "power2.out"
      });
    }

    gsap.to(piece.highlight, {
      alpha: 0.4,
      duration: 0.2
    });
  }

  /**
   * Show tooltip for piece
   */
  showPieceTooltip(piece) {
    // Don't show tooltip for finished pieces (at position 7,7)
    if (piece.isFinished || (piece.gridPosition && piece.gridPosition.row === 7 && piece.gridPosition.col === 7)) {
      return;
    }

    if (piece.tooltip) {
      piece.tooltip.visible = true;
      piece.tooltip.alpha = 0;

      gsap.to(piece.tooltip, {
        alpha: 1,
        duration: 0.2,
        ease: "power2.out"
      });
    }
  }

  /**
   * Hide tooltip for piece
   */
  hidePieceTooltip(piece) {
    if (piece.tooltip) {
      gsap.to(piece.tooltip, {
        alpha: 0,
        duration: 0.15,
        ease: "power2.in",
        onComplete: () => {
          piece.tooltip.visible = false;
        }
      });
    }
  }

  /**
   * Handle piece click
   */
  handlePieceClick(piece) {
    console.log('🔴 Piece clicked:', piece.id);
    
    // Emit piece selection event
    eventBus.emit('game.piece.selected', {
      pieceId: piece.id,
      color: piece.color,
      position: piece.gridPosition
    });
    
    // Visual feedback
    this.selectPiece(piece);
  }

  /**
   * Position piece at backend coordinates (row, col)
   */
  positionPiece(piece, backendPosition) {
    const pixelPos = backendToPixel(backendPosition.row, backendPosition.col, this.boardSize);
    piece.x = pixelPos.x;
    piece.y = pixelPos.y;
    piece.gridPosition = { ...backendPosition };
    piece.backendPosition = { ...backendPosition };
  }

  /**
 * Update all pieces from game state - FIXED for array format
 */
  updatePieces(piecesData) {
    if (!piecesData || !Array.isArray(piecesData)) return;
  
    console.log('🔴 Updating pieces from backend array:', piecesData.length);
  
    piecesData.forEach((pieceData) => {
      const piece = this.pieces.get(pieceData.id);
      if (piece) {
        this.updatePieceFromData(piece, pieceData);
      } else {
        console.warn('🔴 Backend piece not found in container:', pieceData.id);
      }
    });
  
    console.log('🔴 Pieces updated from game state');
  }


  /**
 * Update individual piece from data - FIXED field names
 */
  updatePieceFromData(piece, data) {
    // Check if position changed (backend uses row/col)
    if (data.position && 
        (data.position.row !== piece.gridPosition.row || 
        data.position.col !== piece.gridPosition.col)) {
    
      console.log(`🔴 Position changed for ${piece.id}:`, 
        piece.gridPosition, '->', data.position);
    
      this.movePieceToPosition(piece, {
        row: data.position.row,
        col: data.position.col
      });
    }
  
    // Update state flags from backend format
    piece.isInHome = data.isAtHome || false;
    piece.isFinished = data.isFinished || false;
    piece.isInSafeZone = data.isInSafeZone || false;
  
    //this.updatePieceVisualState(piece);
  }

  /**
   * Move piece to new position with animation
   */
  movePieceToPosition(piece, newGridPosition, animate = true) {

    console.log('Moving piece to position');

    if (!animate) {
      this.positionPiece(piece, newGridPosition);
      return;
    }


  // NEW: Emit animation start event
    eventBus.emit('piece.animation.start', {
      pieceId: piece.id,
      fromPosition: piece.gridPosition,
      toPosition: newGridPosition,
      timestamp: Date.now()
    });

    // Generate step-by-step movement path using actual board cells
    const movementPath = generateStepByStepPath(
      piece.color,
      piece.gridPosition,
      newGridPosition,
      this.boardSize
    );

    // Animate along path
    this.animatePieceAlongPath(piece, movementPath, newGridPosition);
  }

  /**
   * Animate piece along movement path with step-by-step hopping
   * Each point in the path represents one cell/step
   */
  animatePieceAlongPath(piece, path, finalGridPosition) {
    if (path.length === 0) return;

    console.log(`🔴 Animating ${piece.id} step-by-step along ${path.length} points`);

    // Disable interaction during movement
    piece.interactive = false;

    // Create movement timeline
    const timeline = gsap.timeline({
      onComplete: () => {
        piece.gridPosition = { ...finalGridPosition };
        piece.interactive = true;
        this.updatePieceVisualState(piece);

        console.log(`🔴 ${piece.id} movement complete`);

        eventBus.emit('piece.animation.complete', {
          pieceId: piece.id,
          finalPosition: finalGridPosition,
          timestamp: Date.now()
        });
      }
    });

    // Animation config
    const hopHeight = 12; // Pixels to hop up
    const hopDuration = 0.12; // Duration per hop (faster for better game feel)

    // Animate each step with a hop
    path.forEach((point, index) => {
      if (index === 0) return; // Skip starting point

      const startTime = (index - 1) * hopDuration;

      // Hop arc: up and forward, then down
      timeline.to(piece, {
        x: point.x,
        y: point.y - hopHeight,
        duration: hopDuration * 0.5,
        ease: "power1.out"
      }, startTime);

      timeline.to(piece, {
        y: point.y,
        duration: hopDuration * 0.5,
        ease: "power1.in"
      }, startTime + hopDuration * 0.5);
    });

    // Final landing bounce for satisfying feel
    const finalTime = (path.length - 1) * hopDuration;
    timeline.to(piece.scale, {
      x: 1.15,
      y: 0.85,
      duration: 0.08,
      ease: "power2.out"
    }, finalTime);

    timeline.to(piece.scale, {
      x: 1,
      y: 1,
      duration: 0.15,
      ease: "elastic.out(1.5, 0.3)"
    }, finalTime + 0.08);
  }

  /**
 * Move specific piece - FIXED logging and position format
 */
  movePiece(pieceId, fromPosition, toPosition) {
    console.log('🔴 PiecesContainer.movePiece called with:', pieceId, fromPosition, toPosition);
  
    const piece = this.pieces.get(pieceId);
    if (!piece) {
      console.warn('🔴 Piece not found:', pieceId);
      console.log('🔴 Available pieces:', Array.from(this.pieces.keys()));
      return;
    }
  
    console.log(`🔴 Found piece ${pieceId}, calling movePieceToPosition`);
  
    // Convert from GameService format to internal format
    const targetPosition = {
      row: toPosition.row,
      col: toPosition.col
    };
  
    this.movePieceToPosition(piece, targetPosition, true);
  }

  /**
   * Select piece visually
   */
  selectPiece(piece) {
    // Deselect all other pieces first
    this.deselectAllPieces();
    
    piece.isSelected = true;
    piece.selectionRing.visible = true;
    
    // Animate selection ring
    gsap.fromTo(piece.selectionRing.scale,
      { x: 0, y: 0 },
      { 
        x: 1, 
        y: 1, 
        duration: 0.3, 
        ease: "back.out(1.7)" 
      }
    );
    
    // Scale up piece
    gsap.to(piece.scale, {
      x: 1.1,
      y: 1.1,
      duration: 0.2,
      ease: "power2.out"
    });
  }

  /**
   * Update piece visual state based on current data
   */
  updatePieceVisualState(piece) {
    // Update opacity based on state
    const targetAlpha = piece.isInHome ? 0.8 : 1.0;
    gsap.to(piece, {
      alpha: targetAlpha,
      duration: 0.3
    });

    // FIXED: Keep interactive always true for tooltip to work
    // Only the click handler checks piece.canMove
    piece.interactive = true;
    piece.buttonMode = piece.canMove; // Cursor only changes when movable
  }

  /**
   * Get piece by ID
   */
  getPiece(pieceId) {
    return this.pieces.get(pieceId);
  }

  /**
   * Get all pieces for a color
   */
  getPlayerPieces(color) {
    return this.playerPieces[color] || [];
  }

  /**
   * Cleanup
   */
  destroy() {
    console.log('🔴 PiecesContainer: Destroying...');
    
    // Kill all animations
    this.pieces.forEach(piece => {
      gsap.killTweensOf([piece, piece.scale, piece.moveIndicator, piece.selectionRing]);
    });
    
    this.pieces.clear();
    this.playerPieces = { red: [], blue: [], green: [], yellow: [] };
    
    super.destroy();
  }
}

export default PiecesContainer;