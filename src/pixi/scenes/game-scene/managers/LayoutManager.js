import {
  LAYOUT_CONFIG,
  calculateScaleFactor,
  getScaledBoardLayout,
  getScaledDiceLayout,
  getScaledPlayerPanelsLayout,
  getScaledUILayout,
  getScaleDebugInfo,
  isPortraitViewport
} from '../config/layout.config';

/**
 * LayoutManager - Proportional Scaling with Original Interface
 * Same method names as before, but now uses proportional scaling internally
 */
const DEBUG = process.env.NODE_ENV === 'development';

class LayoutManager {
  constructor(viewport) {
    // Use the passed viewport dimensions (base design dimensions)
    // PixiApp handles the actual window scaling at the stage level
    this.viewport = {
      width: viewport.width || 1200,
      height: viewport.height || 800
    };
    this.scaleFactor = 1;

    this.updateScaleFactor();

    if (DEBUG) console.log('LayoutManager initialized:', getScaleDebugInfo(this.viewport.width, this.viewport.height));
  }

  /**
   * Update viewport dimensions and recalculate scale
   */
  updateViewport(width, height) {
    this.viewport = { width, height };
    this.updateScaleFactor();

    if (DEBUG) console.log('LayoutManager viewport updated:', getScaleDebugInfo(width, height));
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
   * The actual test the layout functions branch on - orientation, not a
   * device-width guess. A narrow window is narrow whether it's a phone
   * or a resized desktop browser.
   */
  isPortrait() {
    return isPortraitViewport(this.viewport.width, this.viewport.height);
  }
}

export default LayoutManager;