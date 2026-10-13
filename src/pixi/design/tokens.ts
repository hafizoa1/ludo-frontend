// src/pixi/design/tokens.ts
//
// Single source of truth for color, spacing, radius, type, and motion
// across the PixiJS UI. Every literal color/size/easing in a component
// should trace back here instead of being invented per call site - see
// docs/move-selection-redesign.md's sibling re-jig plan for why.

// Shared literal, referenced by multiple semantic groups below so they
// stay in sync without implying a relationship that isn't there.
const GOLD = 0xffd700;

export const color = {
  accent: {
    gold: GOLD
  },

  player: {
    red: 0xff4444,
    blue: 0x4444ff,
    green: 0x44ff44,
    yellow: 0xffdd44
  },

  bg: {
    // The whole game canvas's background (layout.config.js) - genuinely
    // distinct from `base` below, not a duplicate; don't merge them.
    scene: 0x1a237e,
    // The move-menu/capture-panel background (MoveManager, PieceMoveMenu).
    base: 0x1a1a2e,
    panel: 0x2a2a4a,
    panelElevated: 0x33335a
  },

  border: {
    subtle: 0x4a4a6a,
    accent: 0x4CAF50
  },

  text: {
    primary: 0xffffff,
    secondary: 0xcccccc,
    warning: 0xffdd44,
    danger: 0xff4444,
    success: 0x4CAF50,
    // Dark text for the rare light-background contexts (the dice face,
    // PlayerPanel's stats strip) - duplicated identically across both
    // before this, now one token.
    onLight: 0x333333
  },

  // Semantic action colors - every Button variant and ad hoc colored
  // element (status dots, capture-target rings, etc.) should pull from
  // these rather than inventing a new hex per call site.
  state: {
    success: 0x4CAF50,
    successHover: 0x45a049,
    successPressed: 0x3d8b40,
    danger: 0xff4444,
    dangerHover: 0xcc3333,
    dangerPressed: 0x992222,
    info: 0x2196F3,
    infoHover: 0x1976D2,
    infoPressed: 0x145a99,
    neutral: 0x555555,
    neutralHover: 0x666666,
    neutralPressed: 0x444444,
    // Connection-trouble orange - distinct from text.warning's yellow,
    // duplicated identically across CreateGamePanel/JoinGamePanel.
    connectionWarning: 0xff8844,
    // The "you can move this piece" glow (PiecesContainer.moveIndicator).
    moveGlow: 0x00ff00
  },

  // A piece's own home/path/finished indicator color (PlayerPanel).
  pieceStatus: {
    home: 0x999999,
    path: GOLD,
    finished: 0x00ff00
  },

  // A player's overall status text color (PlayerPanel.updateStatus).
  playerStatus: {
    waiting: 0x999999,
    playing: 0x00aa00,
    rolling: 0xff8800,
    moving: 0x0088ff,
    finished: 0x00ff00,
    disconnected: 0xff0000
  },

  // Deliberate per-context lobby panel tints (create/join/waiting) - kept
  // as named tokens rather than collapsed, since the tinting is likely
  // intentional wayfinding (which screen am I on).
  context: {
    create: { bg: 0x2a2a4a, border: 0x4a4a6a },
    join: { bg: 0x2a4a2a, border: 0x4a6a4a },
    waiting: { bg: 0x3a2a4a, border: 0x6a4a7a }
  }
} as const;

// 8pt grid. Index by multiple: space[2] === 16.
export const space = [0, 8, 16, 24, 32, 40, 48, 64] as const;

// Collapses the 20/12/10/8/6 free-for-all into three named steps.
export const radius = { sm: 8, md: 12, lg: 20 } as const;

// Named sizes most of the app's scattered 12-48 range rationalizes into.
export const type = {
  caption: 12,
  body: 14,
  label: 16,
  heading: 20,
  title: 28,
  display: 32,
  // The one deliberately-oversized moment in the app (the win screen) -
  // kept distinct rather than forced down into `display`, since that
  // would be a real visual downgrade for the game's biggest celebration.
  hero: 48
} as const;

// Named by motion INTENT, not by component, so every gsap call picks one
// of these instead of inventing its own duration/ease pair.
export const motion = {
  pop: { duration: 0.2, ease: 'back.out(1.7)' },
  settle: { duration: 0.2, ease: 'power2.out' },
  glide: { duration: 0.5, ease: 'power2.inOut' },
  impact: { duration: 0.15, ease: 'elastic.out(1.5, 0.3)' },
  idle: { duration: 2.0, ease: 'sine.inOut' }
} as const;

export const fontFamily = 'Arial, sans-serif';
