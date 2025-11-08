
import * as PIXI from 'pixi.js';
import { BOARD_CONFIG, gridToPixel, backendToPixel, isHomePosition, isSafePosition, getHomeColor } from '../../utils/coordinateUtils';
import gsap from 'gsap';

/**
 * BoardComponent - Beautiful 15x15 Ludo game board
 * Renders the complete board with home areas, paths, and grid
 */
class BoardComponent extends PIXI.Container {
  constructor(options = {}) {
    super();
    
    this.size = options.size || 600;
    this.gridSize = options.gridSize || 15;
    this.cellSize = this.size / this.gridSize;
    
    this.backgroundGrid = null;
    this.homeAreas = [];
    this.gamePath = null;
    this.safePositions = [];
    this.centerArea = null;

    
    console.log('🎲 BoardComponent created', { size: this.size, gridSize: this.gridSize });
    
    this.createBoard();
  }

  /**
   * Create the complete board
   */
  createBoard() {
    // Create background
    this.createBackground();
    
    // Create grid lines
    this.createGrid();
    
    // Create home areas
    this.createHomeAreas();
    
    // Create game path
    this.createGamePath();
    
    // Create safe positions
    this.createSafePositions();
    
    // Create center area
    this.createCenterArea();
    
    // Create starting arrows
    this.createStartingArrows();
    
    console.log('🎲 Board creation complete');
  }

  /**
   * Create board background
   */
  createBackground() {
    const bg = new PIXI.Graphics();
    
    // Main board background
    bg.rect(0, 0, this.size, this.size);
    bg.fill({ color: 0xffffff }); // Beige background
    
    // Border
    bg.stroke({ color: 0x8b4513, width: 4 }); // Brown border
    
    this.backgroundGrid = bg;
    this.addChild(this.backgroundGrid);
  }

  /**
   * Create grid lines
   */
  createGrid() {
    const grid = new PIXI.Graphics();
    
    // Vertical lines
    for (let i = 1; i < this.gridSize; i++) {
      const x = i * this.cellSize;
      grid.moveTo(x, 0);
      grid.lineTo(x, this.size);
    }
    
    // Horizontal lines
    for (let i = 1; i < this.gridSize; i++) {
      const y = i * this.cellSize;
      grid.moveTo(0, y);
      grid.lineTo(this.size, y);
    }
    
    grid.stroke({ color: 0xcccccc, width: 1, alpha: 0.5 });
    
    this.addChild(grid);
  }

  /**
   * Create colored home areas
   */
  createHomeAreas() {
    const colors = {
      red: 0xff6b6b,
      blue: 0x4dabf7,
      green: 0x51cf66,
      yellow: 0xffd43b
    };
    
    Object.entries(BOARD_CONFIG.HOME_AREAS).forEach(([colorName, area]) => {
  // Convert from row/col to x/y format
        const convertedArea = {
        startX: area.startCol,
        endX: area.endCol,
        startY: area.startRow,
        endY: area.endRow
        };
        const homeArea = this.createHomeArea(convertedArea, colors[colorName], colorName);
        this.homeAreas.push(homeArea);
        this.addChild(homeArea);
        });
  }

  /**
   * Create individual home area
   */
  createHomeArea(area, color, colorName) {
    const container = new PIXI.Container();
    container.name = `home_${colorName}`;
    
    const width = (area.endX - area.startX + 1) * this.cellSize;
    const height = (area.endY - area.startY + 1) * this.cellSize;
    const x = area.startX * this.cellSize;
    const y = area.startY * this.cellSize;
    
    // Home area background
    const bg = new PIXI.Graphics();
    bg.rect(x, y, width, height);
    bg.fill({ color: color, alpha: 0.7 });
    bg.stroke({ color: color, width: 3 });
    container.addChild(bg);
    
    // Home area pattern (triangles in corners)
    const pattern = new PIXI.Graphics();
    const triangleSize = this.cellSize * 0.3;
    
    // Top-left triangle
    pattern.poly([
      x + triangleSize, y,
      x, y,
      x, y + triangleSize
    ]);
    pattern.fill({ color: color, alpha: 0.9 });
    
    // Top-right triangle
    pattern.poly([
      x + width - triangleSize, y,
      x + width, y,
      x + width, y + triangleSize
    ]);
    pattern.fill({ color: color, alpha: 0.9 });
    
    // Bottom-left triangle
    pattern.poly([
      x, y + height - triangleSize,
      x, y + height,
      x + triangleSize, y + height
    ]);
    pattern.fill({ color: color, alpha: 0.9 });
    
    // Bottom-right triangle
    pattern.poly([
      x + width, y + height - triangleSize,
      x + width - triangleSize, y + height,
      x + width, y + height
    ]);
    pattern.fill({ color: color, alpha: 0.9 });
    
    container.addChild(pattern);
    
    // Add piece starting positions (circles)
    const piecePositions = [
      { x: area.startX + 1, y: area.startY + 1 },
      { x: area.endX - 1, y: area.startY + 1 },
      { x: area.startX + 1, y: area.endY - 1 },
      { x: area.endX - 1, y: area.endY - 1 }
    ];
    
    piecePositions.forEach((pos, index) => {
      const circle = new PIXI.Graphics();
      const pixelPos = gridToPixel(pos.x, pos.y, this.size);
      
      circle.circle(pixelPos.x, pixelPos.y, this.cellSize * 0.25);
      circle.fill({ color: 0xffffff, alpha: 0.8 });
      circle.stroke({ color: color, width: 2 });
      
      container.addChild(circle);
    });
    
    // Add home label
    const label = new PIXI.Text(colorName.toUpperCase(), {
      fontFamily: 'Arial, sans-serif',
      fontSize: Math.floor(this.cellSize * 0.4),
      fontWeight: 'bold',
      fill: 0xffffff,
      align: 'center'
    });
    label.anchor.set(0.5);
    label.x = x + width / 2;
    label.y = y + height / 2;
    container.addChild(label);
    
    return container;
  }

  /**
 * Create game path
 */
createGamePath() {
    const path = new PIXI.Graphics();
    
    // Define the colored path segments directly within the method
    const coloredPathSegments = {
        red: [
            { x: 1, y: 7 }, { x: 2, y: 7 }, { x: 3, y: 7 }, { x: 4, y: 7 }, { x: 5, y: 7 }
        ],
        green: [
            { x: 7, y: 1 }, { x: 7, y: 2 }, { x: 7, y: 3 }, { x: 7, y: 4 }, { x: 7, y: 5 }
        ],
        yellow: [
            { x: 9, y: 7 }, { x: 10, y: 7 }, { x: 11, y: 7 }, { x: 12, y: 7 }, { x: 13, y: 7 }
        ],
        blue: [
            { x: 7, y: 9 }, { x: 7, y: 10 }, { x: 7, y: 11 }, { x: 7, y: 12 }, { x: 7, y: 13 }
        ],
        redEntry: { x: 1, y: 6 },
        greenEntry: { x: 8, y: 1 },
        yellowEntry: { x: 13, y: 8 },
        blueEntry: { x: 6, y: 13 }
    };

    // Helper function to get the color for a given cell
    const getSegmentColor = (x, y) => {
        const colors = {
            red: 0xff6b6b,
            blue: 0x4dabf7,
            green: 0x51cf66,
            yellow: 0xffd43b
        };

        if (coloredPathSegments.red.some(p => p.x === x && p.y === y)) return colors.red;
        if (coloredPathSegments.green.some(p => p.x === x && p.y === y)) return colors.green;
        if (coloredPathSegments.yellow.some(p => p.x === x && p.y === y)) return colors.yellow;
        if (coloredPathSegments.blue.some(p => p.x === x && p.y === y)) return colors.blue;

        if (coloredPathSegments.redEntry.x === x && coloredPathSegments.redEntry.y === y) return colors.red;
        if (coloredPathSegments.greenEntry.x === x && coloredPathSegments.greenEntry.y === y) return colors.green;
        if (coloredPathSegments.yellowEntry.x === x && coloredPathSegments.yellowEntry.y === y) return colors.yellow;
        if (coloredPathSegments.blueEntry.x === x && coloredPathSegments.blueEntry.y === y) return colors.blue;

        return null;
    };

    const pathCells = this.getGamePathCells();

    pathCells.forEach((cell) => {
        const pathColor = getSegmentColor(cell.x, cell.y);
        
        path.rect(
            cell.x * this.cellSize,
            cell.y * this.cellSize,
            this.cellSize,
            this.cellSize
        );
        path.fill({ color: pathColor !== null ? pathColor : 0xffe4b5, alpha: 0.8 });
        path.stroke({ color: 0xcccccc, width: 1 });
    });

    this.gamePath = path;
    this.addChild(path);
  }

  /**
 * Get all game path cells
 */
  getGamePathCells() {
    const path = [];
    
    // The entire path includes the perimeter and the home columns.
    // The order doesn't matter for rendering, but it should contain all desired squares.
    
    // Red safe column
    for (let col = 1; col <= 5; col++) {
        path.push({ x: col, y: 7 });
    }
    // Green safe column
    for (let row = 1; row <= 5; row++) {
        path.push({ x: 7, y: row });
    }
    // Yellow safe column
    for (let col = 9; col <= 13; col++) {
        path.push({ x: col, y: 7 });
    }
    // Blue safe column
    for (let row = 9; row <= 13; row++) {
        path.push({ x: 7, y: row });
    }
    
    // Add the entry points for each color
    path.push({ x: 1, y: 6 });   // Red entry point
    path.push({ x: 8, y: 1 });   // Green entry point
    path.push({ x: 13, y: 8 });  // Yellow entry point
    path.push({ x: 6, y: 13 });  // Blue entry point
    
    // Add the rest of the perimeter track
    // (This is the simplified part you'll need to complete later)
    
    return path;
  }
  /**
   * Add directional arrow to path
   */
  addPathArrow(graphics, fromCell, toCell) {
    const fromPixel = gridToPixel(fromCell.x, fromCell.y, this.size);
    const toPixel = gridToPixel(toCell.x, toCell.y, this.size);
    
    // Calculate arrow direction
    const dx = toPixel.x - fromPixel.x;
    const dy = toPixel.y - fromPixel.y;
    const angle = Math.atan2(dy, dx);
    
    // Draw small arrow
    const arrowSize = this.cellSize * 0.2;
    const arrowX = fromPixel.x;
    const arrowY = fromPixel.y;
    
    graphics.poly([
      arrowX + Math.cos(angle) * arrowSize,
      arrowY + Math.sin(angle) * arrowSize,
      arrowX + Math.cos(angle - 0.5) * arrowSize * 0.7,
      arrowY + Math.sin(angle - 0.5) * arrowSize * 0.7,
      arrowX + Math.cos(angle + 0.5) * arrowSize * 0.7,
      arrowY + Math.sin(angle + 0.5) * arrowSize * 0.7
    ]);
    graphics.fill({ color: 0x8b4513, alpha: 0.7 });
  }

  /**
   * Create safe positions
   */
  createSafePositions() {
  const safePositions = new PIXI.Container();
  
  // Entry points for each color
  Object.values(BOARD_CONFIG.ENTRY_POINTS).forEach(pos => {
    // Convert row/col to x/y pixel position
    const pixelPos = backendToPixel(pos.row, pos.col, this.size);
    
    const safeMarker = new PIXI.Graphics();
    safeMarker.circle(pixelPos.x, pixelPos.y, this.cellSize * 0.4);
    safeMarker.fill({ color: 0xffd700, alpha: 0.6 });
    safeMarker.stroke({ color: 0xffaa00, width: 3 });
    
    // Add star symbol
    this.addStarSymbol(safeMarker, pixelPos.x, pixelPos.y, this.cellSize * 0.2);
    
    safePositions.addChild(safeMarker);
  });
  
  this.safePositions = safePositions;
  this.addChild(safePositions);
  }

  /**
   * Add star symbol for safe positions
   */
  addStarSymbol(container, x, y, size) {
    const star = new PIXI.Graphics();
    
    // Simple 5-pointed star
    const points = [];
    for (let i = 0; i < 10; i++) {
      const angle = (i * Math.PI) / 5;
      const radius = (i % 2 === 0) ? size : size * 0.5;
      points.push(x + Math.cos(angle) * radius);
      points.push(y + Math.sin(angle) * radius);
    }
    
    star.poly(points);
    star.fill({ color: 0xffff00, alpha: 0.8 });
    
    container.addChild(star);
  }

  /**
   * Create center area
   */
  createCenterArea() {
    const center = new PIXI.Container();
    
    // Center triangle for each color
    const centerSize = this.cellSize * 3;
    const centerX = 6 * this.cellSize;
    const centerY = 6 * this.cellSize;
    
    // Create triangular center area
    const centerBg = new PIXI.Graphics();
    centerBg.rect(centerX, centerY, centerSize, centerSize);
    centerBg.fill({ color: 0xffffff, alpha: 0.9 });
    centerBg.stroke({ color: 0x333333, width: 3 });
    
    // Add colored triangles pointing to each home
    const triangleSize = this.cellSize * 0.8;
    const colors = [0xff6b6b, 0x4dabf7, 0x51cf66, 0xffd43b]; // red, blue, green, yellow

    // Left triangle (Red)
    const redTriangle = new PIXI.Graphics();
    redTriangle.poly([
      centerX, centerY + centerSize / 2,
      centerX + triangleSize, centerY + centerSize / 2 - triangleSize / 2,
      centerX + triangleSize, centerY + centerSize / 2 + triangleSize / 2
    ]);
    redTriangle.fill({ color: colors[0] });

    // Bottom triangle (Blue)
    const blueTriangle = new PIXI.Graphics();
    blueTriangle.poly([
      centerX + centerSize / 2, centerY + centerSize,
      centerX + centerSize / 2 - triangleSize / 2, centerY + centerSize - triangleSize,
      centerX + centerSize / 2 + triangleSize / 2, centerY + centerSize - triangleSize
    ]);
    blueTriangle.fill({ color: colors[1] });
    
    // Top triangle (Green)
    const greenTriangle = new PIXI.Graphics();
    greenTriangle.poly([
      centerX + centerSize / 2, centerY,
      centerX + centerSize / 2 - triangleSize / 2, centerY + triangleSize,
      centerX + centerSize / 2 + triangleSize / 2, centerY + triangleSize
    ]);
    greenTriangle.fill({ color: colors[2] });
    
    // Right triangle (Yellow)
    const yellowTriangle = new PIXI.Graphics();
    yellowTriangle.poly([
      centerX + centerSize, centerY + centerSize / 2,
      centerX + centerSize - triangleSize, centerY + centerSize / 2 - triangleSize / 2,
      centerX + centerSize - triangleSize, centerY + centerSize / 2 + triangleSize / 2
    ]);
    yellowTriangle.fill({ color: colors[3] });
    
    center.addChild(centerBg);
    center.addChild(redTriangle);
    center.addChild(blueTriangle);
    center.addChild(greenTriangle);
    center.addChild(yellowTriangle);
    
    // Add center logo
    const logo = new PIXI.Text('🎲', {
      fontFamily: 'Arial, sans-serif',
      fontSize: this.cellSize * 0.8,
      align: 'center'
    });
    logo.anchor.set(0.5);
    logo.x = centerX + centerSize / 2;
    logo.y = centerY + centerSize / 2;
    center.addChild(logo);
    
    this.centerArea = center;
    this.addChild(center);
  }

  /**
   * Create starting arrows
   */
  /**
 * Create starting arrows - CORRECTED VERSION
 * Uses ENTRY_POINTS instead of non-existent STARTING_POSITIONS
 */
  createStartingArrows() {
    const arrows = new PIXI.Container();
  
  // FIXED: Use ENTRY_POINTS with proper row/col access
    Object.entries(BOARD_CONFIG.ENTRY_POINTS).forEach(([color, pos]) => {
    // Convert backend row/col to pixel coordinates
    const pixelPos = backendToPixel(pos.row, pos.col, this.size);
    
    // Create arrow pointing from home to starting position
    const arrow = new PIXI.Graphics();
    const arrowSize = this.cellSize * 0.3;
    
    // Direction depends on color and entry point location
    let angle = 0;
    switch (color) {
      case 'red': angle = 0; break;           // Right (entry at row 6, col 1)
      case 'green': angle = Math.PI / 2; break;  // Down (entry at row 1, col 8)
      case 'yellow': angle = Math.PI; break;     // Left (entry at row 8, col 13)
      case 'blue': angle = -Math.PI / 2; break; // Up (entry at row 13, col 6)
    }
    
    // Draw arrow
    arrow.poly([
      pixelPos.x + Math.cos(angle) * arrowSize,
      pixelPos.y + Math.sin(angle) * arrowSize,
      pixelPos.x + Math.cos(angle - 0.5) * arrowSize * 0.7,
      pixelPos.y + Math.sin(angle - 0.5) * arrowSize * 0.7,
      pixelPos.x + Math.cos(angle + 0.5) * arrowSize * 0.7,
      pixelPos.y + Math.sin(angle + 0.5) * arrowSize * 0.7
    ]);
    arrow.fill({ color: 0x333333, alpha: 0.8 });
    
    arrows.addChild(arrow);
  });
  
  this.addChild(arrows);
  }

  /**
   * Highlight a specific cell
   */
  highlightCell(gridX, gridY, color = 0xffff00, alpha = 0.5) {
    const highlight = new PIXI.Graphics();
    highlight.rect(
      gridX * this.cellSize,
      gridY * this.cellSize,
      this.cellSize,
      this.cellSize
    );
    highlight.fill({ color, alpha });
    highlight.name = 'highlight';
    
    this.addChild(highlight);
    return highlight;
  }

  /**
   * Clear all highlights
   */
  clearHighlights() {
    const highlights = this.children.filter(child => child.name === 'highlight');
    highlights.forEach(highlight => {
      this.removeChild(highlight);
      highlight.destroy();
    });
  }

  /**
   * Get cell at pixel coordinates
   */
  getCellAtPosition(x, y) {
    return {
      x: Math.floor(x / this.cellSize),
      y: Math.floor(y / this.cellSize)
    };
  }

  /**
   * Convert local coordinates to grid coordinates
   */
  getGridPosition(localX, localY) {
    return this.getCellAtPosition(localX, localY);
  }

  /**
   * Animate board entrance
   */
  animateEntrance() {
    // Board slides up from bottom
    this.y = 200;
    this.alpha = 0;
    
    gsap.to(this, {
      y: 0,
      alpha: 1,
      duration: 1,
      ease: "power2.out"
    });
    
    // Animate home areas one by one
    this.homeAreas.forEach((area, index) => {
      area.alpha = 0;
      area.scale.set(0);
      
      gsap.to(area, {
        alpha: 1,
        duration: 0.5,
        delay: 0.2 + index * 0.1
      });
      
      gsap.to(area.scale, {
        x: 1,
        y: 1,
        duration: 0.6,
        delay: 0.2 + index * 0.1,
        ease: "back.out(1.7)"
      });
    });
  }

  /**
   * Get board configuration for external use
   */
  getBoardConfig() {
    return {
      size: this.size,
      gridSize: this.gridSize,
      cellSize: this.cellSize
    };
  }

  /**
   * Cleanup
   */
  destroy() {
    console.log('🎲 BoardComponent: Destroying...');
    super.destroy();
  }
}

export default BoardComponent;