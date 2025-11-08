/**
 * Proportional Scaling Layout Configuration
 * Compatible with old interface - has both old property names and new proportional scaling
 */

// Base design dimensions (your original working layout)
const BASE_WIDTH = 1200;
const BASE_HEIGHT = 800;

export const LAYOUT_CONFIG = {
  // OLD PROPERTY NAMES (for compatibility with GameScene)
  canvas: {
    width: BASE_WIDTH,
    height: BASE_HEIGHT
  },

  // Reference dimensions (new)
  base: {
    width: BASE_WIDTH,
    height: BASE_HEIGHT,
    aspectRatio: BASE_WIDTH / BASE_HEIGHT // 1.5 (3:2)
  },

  // Breakpoints (old names kept)
  breakpoints: {
    mobile: 600,
    tablet: 1024
  },

  // Target aspect ratio for scaling calculations
  targetAspectRatio: 16 / 9, // 1.778

  // Minimum dimensions (prevent too small)
  minDimensions: {
    width: 800,
    height: 600,
    boardSize: 400
  },

  // Maximum dimensions (prevent too large on huge screens)
  maxDimensions: {
    width: 1920,
    height: 1080,
    boardSize: 800
  },

  // Original board configuration (from your working code)
  board: {
    baseSize: 600,           // Original board size
    baseX: 300,              // Original X position
    baseY: 100,              // Original Y position
    gridSize: 15,
    
    // As percentages of base dimensions for scaling
    sizePercent: 600 / BASE_WIDTH,        // 50% of width
    xPercent: 300 / BASE_WIDTH,           // 25% from left
    yPercent: 100 / BASE_HEIGHT           // 12.5% from top
  },

  // Original dice configuration
  dice: {
    baseSize: 80,
    baseX: 950,
    baseY: 200,
    
    // As percentages for scaling
    xPercent: 950 / BASE_WIDTH,           // 79.2% from left
    yPercent: 200 / BASE_HEIGHT,          // 25% from top
    sizePercent: 80 / BASE_WIDTH          // Size relative to width
  },

  // Original player panel configuration
  playerPanels: {
    baseWidth: 200,
    baseHeight: 150,
    
    // Original positions
    basePositions: [
      { x: 50, y: 100 },   // Red - top left
      { x: 950, y: 100 },  // Blue - top right
      { x: 950, y: 500 },  // Green - bottom right
      { x: 50, y: 500 }    // Yellow - bottom left
    ],
    
    // As percentages for scaling
    positions: [
      { xPercent: 50 / BASE_WIDTH, yPercent: 100 / BASE_HEIGHT },    // Red
      { xPercent: 950 / BASE_WIDTH, yPercent: 100 / BASE_HEIGHT },   // Blue
      { xPercent: 950 / BASE_WIDTH, yPercent: 500 / BASE_HEIGHT },   // Green
      { xPercent: 50 / BASE_WIDTH, yPercent: 500 / BASE_HEIGHT }     // Yellow
    ],
    
    widthPercent: 200 / BASE_WIDTH,       // 16.7% of width
    heightPercent: 150 / BASE_HEIGHT      // 18.75% of height
  },

  // UI elements
  ui: {
    title: {
      baseFontSize: 32,
      baseX: 600,  // Center of 1200 - 600
      baseY: 30,
      
      xPercent: 0.5,                    // Always centered
      yPercent: 30 / BASE_HEIGHT,
      fontSizePercent: 32 / BASE_HEIGHT // Font scales with height
    },
    
    turnIndicator: {
      baseFontSize: 18,
      baseX: 600,  // Center
      baseY: 750,
      
      xPercent: 0.5,                    // Always centered
      yPercent: 750 / BASE_HEIGHT,
      fontSizePercent: 18 / BASE_HEIGHT
    }
  },

  // Colors (unchanged)
  colors: {
    background: 0x1a237e,
    players: {
      red: 0xff4444,
      blue: 0x4444ff,
      green: 0x44ff44,
      yellow: 0xffff44
    }
  }
};

/**
 * Calculate scale factor based on viewport
 * This determines how much to scale everything
 */
export function calculateScaleFactor(viewportWidth, viewportHeight) {
  // Calculate scale based on both width and height
  const widthScale = viewportWidth / BASE_WIDTH;
  const heightScale = viewportHeight / BASE_HEIGHT;
  
  // Use the smaller scale to ensure everything fits
  let scale = Math.min(widthScale, heightScale);
  
  // Clamp to reasonable bounds
  const minScale = LAYOUT_CONFIG.minDimensions.width / BASE_WIDTH;
  const maxScale = LAYOUT_CONFIG.maxDimensions.width / BASE_WIDTH;
  scale = Math.max(minScale, Math.min(maxScale, scale));
  
  return scale;
}

/**
 * Calculate scaled dimensions for board
 */
/**
 * Calculate scaled dimensions for board
 */
export function getScaledBoardLayout(viewportWidth, viewportHeight) {
  const scale = calculateScaleFactor(viewportWidth, viewportHeight);
  
  // --- New Logic for Centering ---
  const scaledGameWidth = LAYOUT_CONFIG.base.width * scale;
  const xOffset = Math.max(0, (viewportWidth - scaledGameWidth) / 2); // Calculate margin and divide by 2
  // -------------------------------
  
  const scaledSize = LAYOUT_CONFIG.board.baseSize * scale;
  const scaledX = LAYOUT_CONFIG.board.baseX * scale;
  const scaledY = LAYOUT_CONFIG.board.baseY * scale;

  // --- DEBUG LOGGING ---
  console.group("Layout Debug");
  console.log("Viewport (Input):", { width: viewportWidth, height: viewportHeight });
  console.log("Calculated Scale:", scale.toFixed(3));
  console.log("Scaled Game Width:", scaledGameWidth.toFixed(0));
  console.log("CalculRequest (Input):", { width: viewportWidth, height: viewportHeight });
  console.log("Calculated Scale:", scale.toFixed(3));
  console.log("Scaled Game Width:", scaledGameWidth.toFixed(0));
  console.log("Calculated xOffset:", xOffset.toFixed(0));
  console.log("Final Board X (baseX * scale + xOffset):", (scaledX + xOffset).toFixed(0));
  console.groupEnd();
  // --- END DEBUG ---
  
  return {
    size: Math.min(scaledSize, LAYOUT_CONFIG.maxDimensions.boardSize),
    // APPLY OFFSET HERE
    x: scaledX + xOffset, 
    y: scaledY,
    scale: scale,
    gridSize: LAYOUT_CONFIG.board.gridSize
  };
}

/**
 * Calculate scaled dimensions for dice
 */
export function getScaledDiceLayout(viewportWidth, viewportHeight) {
  const scale = calculateScaleFactor(viewportWidth, viewportHeight);
  
  // --- New Logic for Centering ---
  const scaledGameWidth = LAYOUT_CONFIG.base.width * scale;
  const xOffset = Math.max(0, (viewportWidth - scaledGameWidth) / 2);
  // -------------------------------

  return {
    size: LAYOUT_CONFIG.dice.baseSize * scale,
    // APPLY OFFSET HERE
    x: LAYOUT_CONFIG.dice.baseX * scale + xOffset, 
    y: LAYOUT_CONFIG.dice.baseY * scale
  };
}

/**
 * Calculate scaled positions for player panels
 */
export function getScaledPlayerPanelsLayout(viewportWidth, viewportHeight) {
  const scale = calculateScaleFactor(viewportWidth, viewportHeight);
  
  // --- New Logic for Centering ---
  const scaledGameWidth = LAYOUT_CONFIG.base.width * scale;
  const xOffset = Math.max(0, (viewportWidth - scaledGameWidth) / 2);
  // -------------------------------
  
  return LAYOUT_CONFIG.playerPanels.basePositions.map(pos => ({
    // APPLY OFFSET HERE
    x: pos.x * scale + xOffset, 
    y: pos.y * scale,
    width: LAYOUT_CONFIG.playerPanels.baseWidth * scale,
    height: LAYOUT_CONFIG.playerPanels.baseHeight * scale
  }));
}

/**
 * Calculate scaled UI elements
 */
export function getScaledUILayout(viewportWidth, viewportHeight) {
  const scale = calculateScaleFactor(viewportWidth, viewportHeight);
  
  return {
    title: {
      x: viewportWidth / 2,  // Always center
      y: LAYOUT_CONFIG.ui.title.baseY * scale,
      fontSize: LAYOUT_CONFIG.ui.title.baseFontSize * scale
    },
    turnIndicator: {
      x: viewportWidth / 2,  // Always center
      y: LAYOUT_CONFIG.ui.turnIndicator.baseY * scale,
      fontSize: LAYOUT_CONFIG.ui.turnIndicator.baseFontSize * scale
    }
  };
}

/**
 * Get debug info about current scaling
 */
export function getScaleDebugInfo(viewportWidth, viewportHeight) {
  const scale = calculateScaleFactor(viewportWidth, viewportHeight);
  const boardLayout = getScaledBoardLayout(viewportWidth, viewportHeight);
  
  return {
    viewport: { width: viewportWidth, height: viewportHeight },
    scale: scale.toFixed(3),
    scaledSize: boardLayout.size,
    originalSize: LAYOUT_CONFIG.board.baseSize,
    percentageChange: ((scale - 1) * 100).toFixed(1) + '%'
  };
}