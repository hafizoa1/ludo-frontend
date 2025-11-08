import { 
  LAYOUT_CONFIG,
  calculateScaleFactor,
  getScaledBoardLayout,
  getScaledDiceLayout,
  getScaledPlayerPanelsLayout,
  getScaledUILayout,
  getScaleDebugInfo
} from '../config/layout.config';

/**
 * LayoutManager - Proportional Scaling with Original Interface
 * Same method names as before, but now uses proportional scaling internally
 */
class LayoutManager {
  constructor(viewport) {
    // Use the passed viewport dimensions (base design dimensions)
    // PixiApp handles the actual window scaling at the stage level
    this.viewport = {
      width: viewport.width || 1200,
      height: viewport.height || 800
    };
    this.scaleFactor = 1;
    this.boardBounds = null;

    this.updateScaleFactor();

    console.log('📐 LayoutManager initialized:', getScaleDebugInfo(this.viewport.width, this.viewport.height));
  }

  /**
   * Update viewport dimensions and recalculate scale
   */
  updateViewport(width, height) {
    this.viewport = { width, height };
    this.updateScaleFactor();
    
    console.log('📐 LayoutManager viewport updated:', getScaleDebugInfo(width, height));
  }

  /**
   * Calculate and store current scale factor
   */
  updateScaleFactor() {
    this.scaleFactor = calculateScaleFactor(this.viewport.width, this.viewport.height);
  }

  /**
   * Get current scale factor
   */
  getScaleFactor() {
    return this.scaleFactor;
  }

  /**
   * Get board layout configuration (scaled)
   * SAME METHOD NAME as before
   */
  getBoardLayout() {
    const layout = getScaledBoardLayout(this.viewport.width, this.viewport.height);
    
    // Calculate and store board bounds for other components
    this.boardBounds = {
      left: layout.x,
      right: layout.x + layout.size,
      top: layout.y,
      bottom: layout.y + layout.size,
      centerX: layout.x + (layout.size / 2),
      centerY: layout.y + (layout.size / 2)
    };
    
    return {
      size: layout.size,
      x: layout.x,
      y: layout.y,
      gridSize: LAYOUT_CONFIG.board.gridSize
    };
  }

  /**
   * Get dice layout configuration (scaled)
   * SAME METHOD NAME as before
   */
  getDiceLayout() {
    return getScaledDiceLayout(this.viewport.width, this.viewport.height);
  }

  /**
   * Get player panels layout configuration (scaled)
   * SAME METHOD NAME as before
   */
  getPlayerPanelsLayout() {
    return getScaledPlayerPanelsLayout(this.viewport.width, this.viewport.height);
  }

  /**
   * Get UI elements layout (scaled)
   * SAME METHOD NAME as before
   */
  getUILayout() {
    return getScaledUILayout(this.viewport.width, this.viewport.height);
  }

  /**
   * Get board bounds (useful for relative positioning)
   */
  getBoardBounds() {
    if (!this.boardBounds) {
      this.getBoardLayout(); // Calculate if not already done
    }
    return this.boardBounds;
  }

  /**
   * Set board bounds (called by components after board is positioned)
   */
  setBoardBounds(bounds) {
    this.boardBounds = bounds;
  }

  /**
   * Get canvas/background dimensions
   */
  getCanvasDimensions() {
    return {
      width: this.viewport.width,
      height: this.viewport.height
    };
  }

  /**
   * SAME METHOD NAMES as old version - for compatibility
   */
  
  /**
   * Check if layout is mobile
   * OLD METHOD NAME kept for compatibility
   */
  isMobile() {
    return this.viewport.width < 600; // Same as old breakpoint
  }

  /**
   * Check if layout is tablet
   * OLD METHOD NAME kept for compatibility
   */
  isTablet() {
    return this.viewport.width >= 600 && this.viewport.width < 1024;
  }

  /**
   * Check if layout is desktop (NEW - adds what was missing)
   */
  isDesktop() {
    return this.viewport.width >= 1024;
  }

  /**
   * Get debug information
   */
  getDebugInfo() {
    return {
      ...getScaleDebugInfo(this.viewport.width, this.viewport.height),
      boardBounds: this.boardBounds
    };
  }

  /**
   * Log current layout state (for debugging)
   */
  logLayoutState() {
    const debug = this.getDebugInfo();
    console.log('📐 Layout State:', {
      viewport: debug.viewport,
      scale: debug.scale,
      boardSize: `${LAYOUT_CONFIG.board.baseSize}px → ${debug.scaledSize}px`,
      change: debug.percentageChange
    });
  }
}

export default LayoutManager;