// src/utils/constants.js

/**
 * Game Constants
 */

// Colors matching your backend
export const GAME_COLORS = {
  RED: 0xFF4444,
  BLUE: 0x4444FF,
  GREEN: 0x44FF44,
  YELLOW: 0xFFFF44
};

// UI Colors
export const UI_COLORS = {
  primary: 0x4a9eff,
  secondary: 0x2a4a6a,
  success: 0x4CAF50,
  warning: 0xffdd44,
  error: 0xff4444,
  background: 0x1a1a2e,
  panel: 0x2a2a4a,
  text: 0xFFFFFF,
  textSecondary: 0xcccccc
};

// Animation timings
export const ANIMATIONS = {
  fast: 0.2,
  normal: 0.5,
  slow: 1.0,
  buttonHover: 0.2,
  sceneTransition: 0.7,
  loading: 1.0
};

// Grid system (for Phase 2)
export const GRID = {
  size: 15,
  cellSize: 40,
  boardWidth: 600,
  boardHeight: 600
};

// Mobile breakpoint
export const MOBILE_BREAKPOINT = 768;

export const isMobile = () => window.innerWidth < MOBILE_BREAKPOINT;