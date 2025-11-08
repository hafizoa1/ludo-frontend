export const BOARD_CONFIG = {
  GRID_SIZE: 15, // 15x15 grid
  HOME_SIZE: 6, // 6x6 home areas
  PATH_WIDTH: 3, // 3-cell wide paths

  // Home areas - coordinates as (row, col) to match backend EXACTLY
  HOME_AREAS: {
    red: { startRow: 0, startCol: 0, endRow: 5, endCol: 5 }, // top-left (RED_HOME_AREA)
    green: { startRow: 0, startCol: 9, endRow: 5, endCol: 14 }, // top-right (GREEN_HOME_AREA)
    blue: { startRow: 9, startCol: 0, endRow: 14, endCol: 5 }, // bottom-left (BLUE_HOME_AREA)
    yellow: { startRow: 9, startCol: 9, endRow: 14, endCol: 14 }, // bottom-right (YELLOW_HOME_AREA)
  },

  // Initial piece positions - matching backend initialHomeYardCoords exactly
  INITIAL_PIECE_POSITIONS: {
    red: [
      { row: 2, col: 2 }, // R1
      { row: 2, col: 3 }, // R2
      { row: 3, col: 2 }, // R3
      { row: 3, col: 3 }, // R4
    ],
    green: [
      { row: 2, col: 11 }, // G1
      { row: 2, col: 12 }, // G2
      { row: 3, col: 11 }, // G3
      { row: 3, col: 12 }, // G4
    ],
    yellow: [
      { row: 11, col: 11 }, // Y1
      { row: 11, col: 12 }, // Y2
      { row: 12, col: 11 }, // Y3
      { row: 12, col: 12 }, // Y4
    ],
    blue: [
      { row: 11, col: 2 }, // B1
      { row: 11, col: 3 }, // B2
      { row: 12, col: 2 }, // B3
      { row: 12, col: 3 }, // B4
    ],
  },

  // Entry points where pieces join main track - matching setupColoredEntryPoints()
  ENTRY_POINTS: {
    red: { row: 6, col: 1 },    // RED_TRACK entry
    green: { row: 1, col: 8 },  // GREEN_TRACK entry
    yellow: { row: 8, col: 13 }, // YELLOW_TRACK entry
    blue: { row: 13, col: 6 },  // BLUE_TRACK entry
  },

  // Safe home columns (final approach) - matching setupSafeHomeColumns()
  SAFE_COLUMNS: {
    red: { row: 7, startCol: 1, endCol: 5 },    // RED_SAFE
    green: { col: 7, startRow: 1, endRow: 5 },  // GREEN_SAFE
    yellow: { row: 7, startCol: 9, endCol: 13 }, // YELLOW_SAFE
    blue: { col: 7, startRow: 9, endRow: 13 },  // BLUE_SAFE
  },

  // Center finish area - matching setupCenterArea()
  CENTER_AREA: {
    startRow: 6,
    startCol: 6,
    endRow: 8,
    endCol: 8,
  },
};

/**
 * Convert backend coordinates (row, col) to pixel coordinates
 * @param {number} row - Backend row coordinate (0-14)
 * @param {number} col - Backend col coordinate (0-14)
 * @param {number} boardSize - Total board size in pixels
 * @returns {Object} {x, y} pixel coordinates
 */
export function backendToPixel(row, col, boardSize = 600) {
  const cellSize = boardSize / BOARD_CONFIG.GRID_SIZE;
  return {
    x: col * cellSize + cellSize / 2,
    y: row * cellSize + cellSize / 2,
  };
}

/**
 * Convert pixel coordinates to backend coordinates (row, col)
 * @param {number} pixelX - Pixel X coordinate
 * @param {number} pixelY - Pixel Y coordinate
 * @param {number} boardSize - Total board size in pixels
 * @returns {Object} {row, col} backend coordinates
 */
export function pixelToBackend(pixelX, pixelY, boardSize = 600) {
  const cellSize = boardSize / BOARD_CONFIG.GRID_SIZE;
  return {
    row: Math.floor(pixelY / cellSize),
    col: Math.floor(pixelX / cellSize),
  };
}

/**
 * Legacy function for compatibility - converts grid (x,y) to pixels
 * @param {number} gridX - Grid X coordinate (col)
 * @param {number} gridY - Grid Y coordinate (row)
 * @param {number} boardSize - Board size in pixels
 * @returns {Object} {x, y} pixel coordinates
 */
export function gridToPixelLegacy(gridX, gridY, boardSize = 600) {
  // Grid coordinates are (x, y) but backend uses (row, col)
  // So gridX = col, gridY = row
  return backendToPixel(gridY, gridX, boardSize);
}

// For backward compatibility, alias the function
export const gridToPixel = gridToPixelLegacy;

/**
 * Generate path for smooth piece movement animation
 * @param {Object} from - {row, col} starting position (backend format)
 * @param {Object} to - {row, col} ending position (backend format)
 * @param {number} boardSize - Board size in pixels
 * @returns {Array} Array of {x, y} pixel coordinates for animation path
 */
export function generateMovementPath(from, to, boardSize = 600) {
  const startPixel = backendToPixel(from.row, from.col, boardSize);
  const endPixel = backendToPixel(to.row, to.col, boardSize);
  const path = [startPixel];
  const steps = 10;
  for (let i = 1; i <= steps; i++) {
    const progress = i / steps;
    const x = startPixel.x + (endPixel.x - startPixel.x) * progress;
    const y = startPixel.y + (endPixel.y - startPixel.y) * progress;
    path.push({ x, y });
  }
  return path;
}

/**
 * Get piece home positions for a given color (backend format)
 * @param {string} color - Player color
 * @returns {Array} Array of {row, col} positions matching backend exactly
 */
export function getPieceHomePositions(color) {
  return BOARD_CONFIG.INITIAL_PIECE_POSITIONS[color] || [];
}

/**
 * Check if a grid position is a home area
 * @param {number} x - Grid X coordinate (col)
 * @param {number} y - Grid Y coordinate (row)
 * @param {string} color - Player color
 * @returns {boolean} True if position is in the specified color's home
 */
export function isHomePosition(x, y, color) {
  const home = BOARD_CONFIG.HOME_AREAS[color];
  if (!home) return false;
  return (
    x >= home.startCol && x <= home.endCol && y >= home.startRow && y <= home.endRow
  );
}

/**
 * Check if a grid position is a safe position
 * @param {number} x - Grid X coordinate (col)
 * @param {number} y - Grid Y coordinate (row)
 * @returns {boolean} True if position is safe
 */
export function isSafePosition(x, y) {
  // Check entry points
  for (const color in BOARD_CONFIG.ENTRY_POINTS) {
    const entry = BOARD_CONFIG.ENTRY_POINTS[color];
    if (x === entry.col && y === entry.row) {
      return true;
    }
  }
  // Check safe columns
  for (const color in BOARD_CONFIG.SAFE_COLUMNS) {
    const safe = BOARD_CONFIG.SAFE_COLUMNS[color];
    if (safe.row !== undefined) {
      if (y === safe.row && x >= safe.startCol && x <= safe.endCol) {
        return true;
      }
    } else {
      if (x === safe.col && y >= safe.startRow && y <= safe.endRow) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Get the color of a home area at given coordinates
 * @param {number} x - Grid X coordinate (col)
 * @param {number} y - Grid Y coordinate (row)
 * @returns {string|null} Color name or null if not in any home
 */
export function getHomeColor(x, y) {
  for (const color in BOARD_CONFIG.HOME_AREAS) {
    const home = BOARD_CONFIG.HOME_AREAS[color];
    if (x >= home.startCol && x <= home.endCol && y >= home.startRow && y <= home.endRow) {
      return color;
    }
  }
  return null;
}

/**
 * Calculate distance between two grid positions
 * @param {Object} pos1 - {x, y} first position
 * @param {Object} pos2 - {x, y} second position
 * @returns {number} Distance in grid units
 */
export function getGridDistance(pos1, pos2) {
  return Math.abs(pos1.x - pos2.x) + Math.abs(pos1.y - pos2.y);
}

/**
 * Get all valid positions a piece can move to from current position
 * @param {Object} currentPos - {x, y} current position
 * @param {number} diceValue - Number rolled on dice
 * @param {string} playerColor - Player's color
 * @returns {Array} Array of valid {x, y} positions
 */
export function getValidMoves(currentPos, diceValue, playerColor) {
  const validMoves = [];
  const directions = [
    { x: 0, y: -1 },
    { x: 1, y: 0 },
    { x: 0, y: 1 },
    { x: -1, y: 0 },
  ];
  directions.forEach((dir) => {
    const newX = currentPos.x + dir.x * diceValue;
    const newY = currentPos.y + dir.y * diceValue;
    if (
      newX >= 0 &&
      newX < BOARD_CONFIG.GRID_SIZE &&
      newY >= 0 &&
      newY < BOARD_CONFIG.GRID_SIZE
    ) {
      validMoves.push({ x: newX, y: newY });
    }
  });
  return validMoves;
}

/**
 * Check if two positions are the same
 * @param {Object} pos1 - {x, y} first position
 * @param {Object} pos2 - {x, y} second position
 * @returns {boolean} True if positions are equal
 */
export function positionsEqual(pos1, pos2) {
  return pos1.x === pos2.x && pos1.y === pos2.y;
}

/**
 * Validate if a grid coordinate is within bounds
 * @param {number} x - Grid X coordinate (col)
 * @param {number} y - Grid Y coordinate (row)
 * @returns {boolean} True if coordinate is valid
 */
export function isValidGridPosition(x, y) {
  return (
    x >= 0 && x < BOARD_CONFIG.GRID_SIZE && y >= 0 && y < BOARD_CONFIG.GRID_SIZE
  );
}

/**
 * Create Red player's path (matching Java backend exactly)
 * @returns {Map} Map of pathPosition -> {row, col}
 */
function createRedPath() {
  const redPath = new Map();
  let i = 0;

  // RED STARTS AT (6,1) - Red entry point
  redPath.set(i++, { row: 6, col: 1 });

  // Segment 1: Move RIGHT along row 6 (6,2) → (6,5)
  for (let col = 2; col <= 5; col++) {
    redPath.set(i++, { row: 6, col });
  }

  // Segment 2: Move UP column 6 (5,6) → (0,6)
  for (let row = 5; row >= 0; row--) {
    redPath.set(i++, { row, col: 6 });
  }

  // Segment 3: Move RIGHT along row 0 (0,7) → (0,8)
  for (let col = 7; col <= 8; col++) {
    redPath.set(i++, { row: 0, col });
  }

  // Segment 4: Move DOWN column 8 (1,8) → (5,8)
  for (let row = 1; row <= 5; row++) {
    redPath.set(i++, { row, col: 8 });
  }

  // Segment 5: Move RIGHT along row 6 (6,9) → (6,14)
  for (let col = 9; col <= 14; col++) {
    redPath.set(i++, { row: 6, col });
  }

  // Segment 6: Move DOWN column 14 (7,14) → (8,14)
  for (let row = 7; row <= 8; row++) {
    redPath.set(i++, { row, col: 14 });
  }

  // Segment 7: Move LEFT along row 8 (8,13) → (8,9)
  for (let col = 13; col >= 9; col--) {
    redPath.set(i++, { row: 8, col });
  }

  // Segment 8: Move DOWN column 8 (9,8) → (14,8)
  for (let row = 9; row <= 14; row++) {
    redPath.set(i++, { row, col: 8 });
  }

  // Segment 9: Move LEFT along row 14 (14,7) → (14,6)
  for (let col = 7; col >= 6; col--) {
    redPath.set(i++, { row: 14, col });
  }

  // Segment 10: Move UP column 6 (13,6) → (9,6)
  for (let row = 13; row >= 9; row--) {
    redPath.set(i++, { row, col: 6 });
  }

  // Segment 11: Move LEFT along row 8 (8,5) → (8,0)
  for (let col = 5; col >= 0; col--) {
    redPath.set(i++, { row: 8, col });
  }

  // RED SAFE ROW: Move RIGHT along row 7 (7,0) → (7,5)
  for (let col = 0; col <= 5; col++) {
    redPath.set(i++, { row: 7, col });
  }

  // Finish Point
  redPath.set(i, { row: 7, col: 7 });

  return redPath;
}

/**
 * Create Green player's path (matching Java backend exactly)
 * @returns {Map} Map of pathPosition -> {row, col}
 */
function createGreenPath() {
  const greenPath = new Map();
  let i = 0;

  // GREEN STARTS AT (1,8)
  greenPath.set(i++, { row: 1, col: 8 });

  // Segment 1: Move DOWN along column 8 (2,8) → (5,8)
  for (let row = 2; row <= 5; row++) {
    greenPath.set(i++, { row, col: 8 });
  }

  // Segment 2: Move RIGHT along row 6 (6,9) → (6,14)
  for (let col = 9; col <= 14; col++) {
    greenPath.set(i++, { row: 6, col });
  }

  // Segment 3: Move DOWN along column 14 (7,14) → (8,14)
  for (let row = 7; row <= 8; row++) {
    greenPath.set(i++, { row, col: 14 });
  }

  // Segment 4: Move LEFT along row 8 (8,13) → (8,9)
  for (let col = 13; col >= 9; col--) {
    greenPath.set(i++, { row: 8, col });
  }

  // Segment 5: Move DOWN along column 8 (9,8) → (14,8)
  for (let row = 9; row <= 14; row++) {
    greenPath.set(i++, { row, col: 8 });
  }

  // Segment 6: Move LEFT along row 14 (14,7) → (14,6)
  for (let col = 7; col >= 6; col--) {
    greenPath.set(i++, { row: 14, col });
  }

  // Segment 7: Move UP along column 6 (13,6) → (9,6)
  for (let row = 13; row >= 9; row--) {
    greenPath.set(i++, { row, col: 6 });
  }

  // Segment 8: Move LEFT along row 8 (8,5) → (8,0)
  for (let col = 5; col >= 0; col--) {
    greenPath.set(i++, { row: 8, col });
  }

  // Segment 9: Move UP along column 0 (7,0) → (6,0)
  for (let row = 7; row >= 6; row--) {
    greenPath.set(i++, { row, col: 0 });
  }

  // Segment 10: Move RIGHT along row 6 (6,1) → (6,5)
  for (let col = 1; col <= 5; col++) {
    greenPath.set(i++, { row: 6, col });
  }

  // Segment 11: Move UP along column 6 (5,6) → (0,6)
  for (let row = 5; row >= 0; row--) {
    greenPath.set(i++, { row, col: 6 });
  }

  // GREEN SAFE COLUMN: Move DOWN along column 7 (0,7) → (5,7)
  for (let row = 0; row <= 5; row++) {
    greenPath.set(i++, { row, col: 7 });
  }

  // Finish Point
  greenPath.set(i, { row: 7, col: 7 });

  return greenPath;
}

/**
 * Create Yellow player's path (matching Java backend exactly)
 * @returns {Map} Map of pathPosition -> {row, col}
 */
function createYellowPath() {
  const yellowPath = new Map();
  let i = 0;

  // YELLOW STARTS AT (8,13)
  yellowPath.set(i++, { row: 8, col: 13 });

  // Segment 1: Move LEFT along row 8 (8,12) → (8,9)
  for (let col = 12; col >= 9; col--) {
    yellowPath.set(i++, { row: 8, col });
  }

  // Segment 2: Move DOWN along column 8 (9,8) → (14,8)
  for (let row = 9; row <= 14; row++) {
    yellowPath.set(i++, { row, col: 8 });
  }

  // Segment 3: Move LEFT along row 14 (14,7) → (14,6)
  for (let col = 7; col >= 6; col--) {
    yellowPath.set(i++, { row: 14, col });
  }

  // Segment 4: Move UP along column 6 (13,6) → (9,6)
  for (let row = 13; row >= 9; row--) {
    yellowPath.set(i++, { row, col: 6 });
  }

  // Segment 5: Move LEFT along row 8 (8,5) → (8,0)
  for (let col = 5; col >= 0; col--) {
    yellowPath.set(i++, { row: 8, col });
  }

  // Segment 6: Move UP along column 0 (7,0) → (6,0)
  for (let row = 7; row >= 6; row--) {
    yellowPath.set(i++, { row, col: 0 });
  }

  // Segment 7: Move RIGHT along row 6 (6,1) → (6,5)
  for (let col = 1; col <= 5; col++) {
    yellowPath.set(i++, { row: 6, col });
  }

  // Segment 8: Move UP along column 6 (5,6) → (0,6)
  for (let row = 5; row >= 0; row--) {
    yellowPath.set(i++, { row, col: 6 });
  }

  // Segment 9: Move RIGHT along row 0 (0,7) → (0,8)
  for (let col = 7; col <= 8; col++) {
    yellowPath.set(i++, { row: 0, col });
  }

  // Segment 10: Move DOWN along column 8 (1,8) → (5,8)
  for (let row = 1; row <= 5; row++) {
    yellowPath.set(i++, { row, col: 8 });
  }

  // Segment 11: Move RIGHT along row 6 (6,9) → (6,14)
  for (let col = 9; col <= 14; col++) {
    yellowPath.set(i++, { row: 6, col });
  }

  // YELLOW SAFE ROW: Move LEFT along row 7 (7,14) → (7,9)
  for (let col = 14; col >= 9; col--) {
    yellowPath.set(i++, { row: 7, col });
  }

  // Finish Point
  yellowPath.set(i, { row: 7, col: 7 });

  return yellowPath;
}

/**
 * Create Blue player's path (matching Java backend exactly)
 * @returns {Map} Map of pathPosition -> {row, col}
 */
function createBluePath() {
  const bluePath = new Map();
  let i = 0;

  // BLUE STARTS AT (13,6)
  bluePath.set(i++, { row: 13, col: 6 });

  // Segment 1: Move UP along column 6 (12,6) → (9,6)
  for (let row = 12; row >= 9; row--) {
    bluePath.set(i++, { row, col: 6 });
  }

  // Segment 2: Move LEFT along row 8 (8,5) → (8,0)
  for (let col = 5; col >= 0; col--) {
    bluePath.set(i++, { row: 8, col });
  }

  // Segment 3: Move UP along column 0 (7,0) → (6,0)
  for (let row = 7; row >= 6; row--) {
    bluePath.set(i++, { row, col: 0 });
  }

  // Segment 4: Move RIGHT along row 6 (6,1) → (6,5)
  for (let col = 1; col <= 5; col++) {
    bluePath.set(i++, { row: 6, col });
  }

  // Segment 5: Move UP along column 6 (5,6) → (1,6)
  for (let row = 5; row >= 1; row--) {
    bluePath.set(i++, { row, col: 6 });
  }

  // Add missing position (0,6)
  bluePath.set(i++, { row: 0, col: 6 });

  // Segment 6: Move RIGHT along row 0 (0,7) → (0,8)
  for (let col = 7; col <= 8; col++) {
    bluePath.set(i++, { row: 0, col });
  }

  // Segment 7: Move DOWN along column 8 (1,8) → (5,8)
  for (let row = 1; row <= 5; row++) {
    bluePath.set(i++, { row, col: 8 });
  }

  // Segment 8: Move RIGHT along row 6 (6,9) → (6,14)
  for (let col = 9; col <= 14; col++) {
    bluePath.set(i++, { row: 6, col });
  }

  // Segment 9: Move DOWN along column 14 (7,14) → (8,14)
  for (let row = 7; row <= 8; row++) {
    bluePath.set(i++, { row, col: 14 });
  }

  // Segment 10: Move LEFT along row 8 (8,13) → (8,9)
  for (let col = 13; col >= 9; col--) {
    bluePath.set(i++, { row: 8, col });
  }

  // Segment 11: Move DOWN along column 8 (9,8) → (14,8)
  for (let row = 9; row <= 14; row++) {
    bluePath.set(i++, { row, col: 8 });
  }

  // BLUE SAFE COLUMN: Move UP along column 7 (14,7) → (9,7)
  for (let row = 14; row >= 9; row--) {
    bluePath.set(i++, { row, col: 7 });
  }

  // Finish Point
  bluePath.set(i, { row: 7, col: 7 });

  return bluePath;
}

// Cache the paths (created once)
const COLOR_PATHS = {
  red: createRedPath(),
  green: createGreenPath(),
  yellow: createYellowPath(),
  blue: createBluePath()
};

/**
 * Get the complete path for a color
 * @param {string} color - Player color
 * @returns {Map} Map of pathPosition -> {row, col}
 */
export function getColorPath(color) {
  return COLOR_PATHS[color];
}

/**
 * Get the game path coordinates in order (kept for compatibility)
 * @returns {Array} Array of {row, col} coordinates
 */
export function getGamePath() {
  // Return red path as default for compatibility
  return Array.from(COLOR_PATHS.red.values());
}

/**
 * Generate step-by-step movement path using actual board cells
 * @param {string} color - Player color (red, green, yellow, blue)
 * @param {Object} fromPosition - Starting position {row, col}
 * @param {Object} toPosition - Ending position {row, col}
 * @param {number} boardSize - Board size in pixels
 * @returns {Array} Array of {x, y} pixel coordinates for each step
 */
export function generateStepByStepPath(color, fromPosition, toPosition, boardSize = 600) {
  const colorPath = getColorPath(color);
  if (!colorPath) {
    console.warn(`Unknown color: ${color}, using default path`);
    return generateMovementPath(fromPosition, toPosition, boardSize);
  }

  // Find the path position for the starting location
  let startPathPos = -1;
  let endPathPos = -1;

  for (const [pathPos, coords] of colorPath.entries()) {
    if (coords.row === fromPosition.row && coords.col === fromPosition.col) {
      startPathPos = pathPos;
    }
    if (coords.row === toPosition.row && coords.col === toPosition.col) {
      endPathPos = pathPos;
    }
    if (startPathPos !== -1 && endPathPos !== -1) break;
  }

  // If we can't find positions in the path, fall back to old method
  if (startPathPos === -1 || endPathPos === -1) {
    console.warn('Positions not found in color path, using interpolated path');
    return generateMovementPath(fromPosition, toPosition, boardSize);
  }

  // Generate pixel coordinates for each step along the path
  const pixelPath = [];

  // Handle wraparound if end position is before start (shouldn't happen in normal gameplay)
  if (endPathPos < startPathPos) {
    console.warn('End position before start in path - unusual case');
    return generateMovementPath(fromPosition, toPosition, boardSize);
  }

  // Include each cell from start to end
  for (let pathPos = startPathPos; pathPos <= endPathPos; pathPos++) {
    const cellCoords = colorPath.get(pathPos);
    if (cellCoords) {
      const pixelCoords = backendToPixel(cellCoords.row, cellCoords.col, boardSize);
      pixelPath.push(pixelCoords);
    }
  }

  return pixelPath;
}

// Export the configuration and all functions
export default {
  BOARD_CONFIG,
  backendToPixel,
  pixelToBackend,
  gridToPixel,
  getGamePath,
  isHomePosition,
  isSafePosition,
  getHomeColor,
  getGridDistance,
  getValidMoves,
  generateMovementPath,
  getPieceHomePositions,
  positionsEqual,
  isValidGridPosition,
};