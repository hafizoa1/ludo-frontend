import * as PIXI from 'pixi.js';
import { gsap } from 'gsap';

/**
 * MoveManager - Handles game move interactions and visualization
 * FIXED VERSION: Eliminates duplicate handling, auto-hide timers, and event conflicts
 */
class MoveManager extends PIXI.Container {
  constructor(options = {}) {
    super();
    
    this.gameScene = options.gameScene;
    this.boardComponent = options.boardComponent;
    this.piecesContainer = options.piecesContainer;
    
    // Move state
    this.currentMoves = [];
    this.movePanel = null;
    this.highlightedPieces = new Set();
    this.isProcessingMove = false; // Prevent rapid-fire selections

    // NEW: Animation coordination
    this.isAnimating = false;
    this.pendingMoves = null;
    
    this.init();
  }

  init() {
    this.interactive = false; // FIXED: Container shouldn't be interactive
    this.alpha = 0; // Hidden by default
    console.log('MoveManager: Initialized');
  }

  /**
   * Show available moves with visual feedback
   * FIXED: Proper cleanup and single-call handling
   */
  showAvailableMoves(moves) {
    console.log('MoveManager: Received moves, animating:', this.isAnimating);
    console.log('MoveManager: Pending moves before:', this.pendingMoves);
    
    // NEW: If currently animating, queue the moves
    if (this.isAnimating) {
      console.log('MoveManager: Queuing moves during animation');
      this.pendingMoves = moves;
      console.log('MoveManager: Pending moves after:', this.pendingMoves);
      return;
    }
    
    // FIXED: Always clear existing panel first
    this.clearMovePanel();
    
    // Reset processing state
    this.isProcessingMove = false;
    
    this.currentMoves = moves;
    this.alpha = 1;
    
    // Create move selection panel (rawMessage not needed anymore)
    this.createMovePanel(moves);
    
    // Highlight pieces that can move (future enhancement)
    this.highlightMovablePieces(moves);
  }

  /**
   * Create persistent move selection panel
   * FIXED: Responsive positioning and no rawMessage dependency
   */
  createMovePanel(moves) {
    // FIXED: Ensure clean state
    this.clearMovePanel();

    this.movePanel = new PIXI.Container();

    const panelWidth = 450;
    const panelHeight = Math.max(250, moves.length * 35 + 120);

    // Store dimensions for dragging
    this.movePanel.panelWidth = panelWidth;
    this.movePanel.panelHeight = panelHeight;

    // Background with border
    const bg = new PIXI.Graphics();
    bg.roundRect(0, 0, panelWidth, panelHeight, 12);
    bg.fill({ color: 0x1a1a2e, alpha: 0.95 });
    bg.stroke({ color: 0x4CAF50, width: 3 });
    this.movePanel.addChild(bg);
    this.movePanel.bg = bg;

    // Draggable header area
    const headerBg = new PIXI.Graphics();
    headerBg.roundRect(0, 0, panelWidth, 50, 12);
    headerBg.fill({ color: 0x000000, alpha: 0.01 }); // Nearly invisible but interactive
    headerBg.interactive = true;
    headerBg.cursor = 'move';
    this.movePanel.addChild(headerBg);

    // Header text
    const header = new PIXI.Text('Choose Your Move', {
      fontFamily: 'Arial, sans-serif',
      fontSize: 20,
      fontWeight: 'bold',
      fill: '#4CAF50',
      align: 'center'
    });
    header.anchor.set(0.5, 0);
    header.x = panelWidth / 2;
    header.y = 15;
    this.movePanel.addChild(header);

    // Setup drag handlers on header
    this.setupPanelDragging(headerBg);
    
    // Move options
    moves.forEach((move, index) => {
      this.createMoveOption(move, index, panelWidth);
    });
    
    // Instructions
    const instructions = new PIXI.Text('Click a move option to make your selection', {
      fontFamily: 'Arial, sans-serif',
      fontSize: 12,
      fill: '#ffdd44',
      align: 'center',
      wordWrap: true,
      wordWrapWidth: panelWidth - 20
    });
    instructions.anchor.set(0.5, 0);
    instructions.x = panelWidth / 2;
    instructions.y = panelHeight - 40;
    this.movePanel.addChild(instructions);
    
    // FIXED: Responsive positioning
    // Get scene dimensions or use defaults
    const sceneWidth = this.gameScene?.background?.width || 1200;
    const sceneHeight = this.gameScene?.background?.height || 800;
    
    // Position panel responsively - ensure it's always visible
    this.movePanel.x = Math.max(10, Math.min(50, sceneWidth * 0.05));
    this.movePanel.y = Math.max(10, Math.min(100, sceneHeight * 0.12));
    
    // Ensure panel doesn't go off right edge
    if (this.movePanel.x + panelWidth > sceneWidth) {
      this.movePanel.x = Math.max(10, sceneWidth - panelWidth - 10);
    }
    
    // Ensure panel doesn't go off bottom edge
    if (this.movePanel.y + panelHeight > sceneHeight) {
      this.movePanel.y = Math.max(10, sceneHeight - panelHeight - 10);
    }
    
    console.log('MoveManager: Panel positioned at', this.movePanel.x, this.movePanel.y, 'in scene', sceneWidth, 'x', sceneHeight);
    
    console.log('DEBUG: Single move panel details:', {
      panelWidth,
      panelHeight,
      calculatedX: Math.max(10, Math.min(50, sceneWidth * 0.05)),
      calculatedY: Math.max(10, Math.min(100, sceneHeight * 0.12)),
      finalX: this.movePanel.x,
      finalY: this.movePanel.y,
      sceneWidth,
      sceneHeight,
      rightEdgeCheck: this.movePanel.x + panelWidth,
      bottomEdgeCheck: this.movePanel.y + panelHeight,
      moveCount: moves.length
    })


    this.addChild(this.movePanel);
    
    // Entrance animation
    this.movePanel.alpha = 0;
    this.movePanel.scale.set(0.8);
    gsap.to(this.movePanel, {
      alpha: 1,
      duration: 0.3,
      ease: "power2.out"
    });
    gsap.to(this.movePanel.scale, {
      x: 1,
      y: 1,
      duration: 0.3,
      ease: "back.out(1.7)", 
      onComplete: () => {
        console.log('DEBUG: Animation complete, panel final state:', {
          alpha: this.movePanel.alpha,
          scale: { x: this.movePanel.scale.x, y: this.movePanel.scale.y },
          visible: this.movePanel.visible,
          bounds: this.movePanel.getBounds()
        });
     }
    });
    console.log('MoveManager: Panel created with', moves.length, 'options');
  }

  /**
   * Setup drag functionality for move panel
   */
  setupPanelDragging(headerElement) {
    let dragData = null;

    headerElement.on('pointerdown', (event) => {
      // Start dragging
      dragData = {
        startX: this.movePanel.x,
        startY: this.movePanel.y,
        pointerStartX: event.global.x,
        pointerStartY: event.global.y
      };

      // Visual feedback - slightly transparent
      if (this.movePanel.bg) {
        this.movePanel.bg.alpha = 0.85;
      }

      event.stopPropagation();
    });

    headerElement.on('pointermove', (event) => {
      if (dragData) {
        // Calculate new position
        const dx = event.global.x - dragData.pointerStartX;
        const dy = event.global.y - dragData.pointerStartY;

        let newX = dragData.startX + dx;
        let newY = dragData.startY + dy;

        // Get scene dimensions
        const sceneWidth = this.gameScene?.background?.width || 1200;
        const sceneHeight = this.gameScene?.background?.height || 800;

        // Clamp to screen bounds
        const minX = 0;
        const maxX = sceneWidth - this.movePanel.panelWidth;
        const minY = 0;
        const maxY = sceneHeight - this.movePanel.panelHeight;

        newX = Math.max(minX, Math.min(maxX, newX));
        newY = Math.max(minY, Math.min(maxY, newY));

        this.movePanel.x = newX;
        this.movePanel.y = newY;
      }
    });

    const endDrag = () => {
      if (dragData) {
        dragData = null;

        // Restore visual feedback
        if (this.movePanel.bg) {
          this.movePanel.bg.alpha = 0.95;
        }
      }
    };

    headerElement.on('pointerup', endDrag);
    headerElement.on('pointerupoutside', endDrag);
  }

  setAnimationState(animating) {
    console.log('MoveManager: Animation state changed to:', animating);
    this.isAnimating = animating;
    
    // If animation just finished, check for pending moves
    if (!animating) {
      this.onAnimationComplete();
    }
  }

  onAnimationComplete() {
    console.log('MoveManager: Animation complete, pending moves:', this.pendingMoves);
    console.log('MoveManager: Animation complete, checking pending moves');
    
    if (this.pendingMoves) {
      console.log('MoveManager: Showing pending moves:', this.pendingMoves.length);
      this.showAvailableMoves(this.pendingMoves);
      this.pendingMoves = null;
    }
    
    // Reset processing state
    this.isProcessingMove = false;
  }

  /**
   * Create individual move option button
   * FIXED: Better event handling and debouncing
   */
  createMoveOption(move, index, panelWidth) {

    console.log('createMoveOption called', index, move);

    console.log('DEBUG: Creating move option:', {
    moveNumber: move.number,
    index: index,
    description: move.description,
    yPos: 55 + (index * 35)
    });

    const optionContainer = new PIXI.Container();
    const yPos = 55 + (index * 35);
    
    // Button background
    const buttonBg = new PIXI.Graphics();
    buttonBg.roundRect(10, yPos, panelWidth - 20, 30, 6);
    buttonBg.fill({ color: 0x333366, alpha: 0.8 });
    buttonBg.stroke({ color: 0x666699, width: 1 });
    
    // FIXED: Proper event handling with debouncing
    buttonBg.interactive = true;
    buttonBg.cursor = 'pointer';
    
    // Store original styles for proper restoration
    const originalFill = { color: 0x333366, alpha: 0.8 };
    const originalStroke = { color: 0x666699, width: 1 };
    const hoverFill = { color: 0x4CAF50, alpha: 0.8 };
    const hoverStroke = { color: 0x66BB6A, width: 2 };
    
    buttonBg.on('pointerover', () => {
      if (!this.isProcessingMove) {
        buttonBg.clear();
        buttonBg.roundRect(10, yPos, panelWidth - 20, 30, 6);
        buttonBg.fill(hoverFill);
        buttonBg.stroke(hoverStroke);
      }
    });
    
    buttonBg.on('pointerout', () => {
      if (!this.isProcessingMove) {
        buttonBg.clear();
        buttonBg.roundRect(10, yPos, panelWidth - 20, 30, 6);
        buttonBg.fill(originalFill);
        buttonBg.stroke(originalStroke);
      }
    });
    
    // FIXED: Single click handler with proper debouncing
    buttonBg.on('pointerdown', (event) => {
      console.log('pointerdown fired for index', index, 'move:', move);
      event.stopPropagation(); // Prevent event bubbling
      
      if (!this.isProcessingMove) {
        console.log('MoveManager: Button clicked for move:', move.number);
        this.selectMove(move);
      } else {
        console.log('MoveManager: Move already processing, ignoring click');
      }
    });
    
    // Move text
    const moveText = new PIXI.Text(`${move.number}. ${move.description}`, {
      fontFamily: 'Arial, sans-serif',
      fontSize: 14,
      fill: '#ffffff',
      wordWrap: true,
      wordWrapWidth: panelWidth - 40
    });
    moveText.x = 20;
    moveText.y = yPos + 8;

    console.log('Move Text: ', moveText)
    
    optionContainer.addChild(buttonBg);
    optionContainer.addChild(moveText);
    this.movePanel.addChild(optionContainer);
  }

  /**
   * Handle move selection
   * FIXED: No auto-hide timer, proper state management
   */
  selectMove(move) {
    if (this.isProcessingMove) {
      console.log('MoveManager: Move already processing, ignoring selection');
      return;
    }
    
    this.isProcessingMove = true;
    console.log('MoveManager: Processing move selection:', move);
    
    // NEW: Hide menu immediately and set animation state
    this.hideMoves();
    this.isAnimating = true; // Expect animation to start
    
    // Visual feedback
    this.showMoveConfirmation(move);
    
    // Send choice to backend
    if (this.gameScene && this.gameScene.selectPiece) {
      console.log('MoveManager: Sending move to GameService:', move.number);
      this.gameScene.selectPiece(move.number);
    } else {
      console.error('MoveManager: Cannot send move - GameScene not available');
      this.isProcessingMove = false;
      this.isAnimating = false; // Reset on error
    }
  }

  /**
   * Show move confirmation feedback
   * FIXED: Better visual feedback
   */
  showMoveConfirmation(move) {
    if (!this.movePanel) return;
    
    const confirmation = new PIXI.Text(`✓ Selected: ${move.description}`, {
      fontFamily: 'Arial, sans-serif',
      fontSize: 16,
      fontWeight: 'bold',
      fill: '#4CAF50',
      align: 'center'
    });
    confirmation.anchor.set(0.5);
    confirmation.x = this.movePanel.width / 2;
    confirmation.y = this.movePanel.height - 70;
    
    this.movePanel.addChild(confirmation);
    
    // Animate confirmation
    confirmation.alpha = 0;
    confirmation.y += 10;
    gsap.to(confirmation, {
      alpha: 1,
      y: confirmation.y - 10,
      duration: 0.3,
      ease: "power2.out"
    });
    
    // Show processing indicator
    const processing = new PIXI.Text('Processing...', {
      fontFamily: 'Arial, sans-serif',
      fontSize: 12,
      fill: '#ffdd44',
      align: 'center'
    });
    processing.anchor.set(0.5);
    processing.x = this.movePanel.width / 2;
    processing.y = this.movePanel.height - 50;
    processing.alpha = 0;
    
    this.movePanel.addChild(processing);
    
    gsap.to(processing, {
      alpha: 1,
      duration: 0.3,
      delay: 0.5
    });
  }

  /**
   * Disable all buttons to prevent double-clicks
   */
  disableAllButtons() {
    if (!this.movePanel) return;
    
    this.movePanel.children.forEach(child => {
      if (child.children) {
        child.children.forEach(grandchild => {
          if (grandchild.interactive) {
            grandchild.interactive = false;
            grandchild.alpha = 0.5;
          }
        });
      }
    });
  }

  /**
   * Highlight pieces that can move (future enhancement)
   */
  highlightMovablePieces(moves) {
    // TODO: Parse move descriptions to identify piece IDs
    // TODO: Add glow effects to movable pieces on board
    console.log('MoveManager: Would highlight pieces for moves:', moves.length);
  }

  /**
   * Hide all move displays
   * FIXED: Manual control only - no auto-hide
   */
  hideMoves() {
    console.log('MoveManager: Hiding moves panel');
    
    if (this.movePanel) {
      gsap.to(this.movePanel, {
        alpha: 0,
        scale: { x: 0.8, y: 0.8 },
        duration: 0.3,
        ease: "power2.in",
        onComplete: () => {
          this.clearMovePanel();
        }
      });
    } else {
      this.aplha = 0; 
    }
    
    this.clearHighlights();
    this.isProcessingMove = false; // Reset processing state
  }

  /**
   * Clear move panel
   * FIXED: Safe cleanup to prevent _position null errors
   */
  clearMovePanel() {
    if (this.movePanel) {
        console.log('MoveManager: Clearing move panel');

        // Kill any running animations on this specific object instance and its children
        gsap.killTweensOf(this.movePanel);
        gsap.killTweensOf(this.movePanel.scale);
        
        // Kill animations on all children to be safe
        this.movePanel.children.forEach(child => {
            gsap.killTweensOf(child);
            if (child.children) {
                child.children.forEach(grandchild => {
                    gsap.killTweensOf(grandchild);
                });
            }
        });
        
        // Remove from container first
        if (this.movePanel.parent) {
            this.movePanel.parent.removeChild(this.movePanel);
        }

        // Destroy the object and its children immediately
        this.movePanel.destroy({ children: true });
        
        // IMPORTANT: Set the reference to null AFTER destroying the object
        this.movePanel = null;
    }
  }

  /**
   * Clear piece highlights
   */
  clearHighlights() {
    this.highlightedPieces.clear();
    // TODO: Remove glow effects from pieces
  }

  /**
   * Reset processing state (called when new moves arrive)
   */
  resetProcessingState() {
    console.log('MoveManager: Resetting processing state');
    this.isProcessingMove = false;
  }

  /**
   * Check if currently processing a move
   */
  isProcessing() {
    return this.isProcessingMove;
  }

  /**
   * Cleanup
   * FIXED: Comprehensive cleanup
   */
  destroy() {
    console.log('MoveManager: Destroying');
    
    // Kill all animations
    gsap.killTweensOf(this);
    
    // Clear all components
    this.clearMovePanel();
    this.clearHighlights();
    
    // Reset state
    this.currentMoves = [];
    this.pendingMoves = null; // NEW: Clear pending moves
    this.isProcessingMove = false;
    this.isAnimating = false;
    
    super.destroy();
  }
}

export default MoveManager;