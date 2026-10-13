// src/pixi/components/ui/Panel.js

import * as PIXI from 'pixi.js';
import { color, radius } from '../../design/tokens';
import { applyElevation } from '../../design/depth';

// Named presets - a caller picks one instead of passing bg/border/radius
// individually. Explicit options still override a preset's values, so
// specificity only happens where a caller has a real reason for it.
const VARIANTS = {
  default: { backgroundColor: color.bg.panel, borderColor: color.border.subtle, cornerRadius: radius.md },
  create: { backgroundColor: color.context.create.bg, borderColor: color.context.create.border, cornerRadius: radius.lg },
  join: { backgroundColor: color.context.join.bg, borderColor: color.context.join.border, cornerRadius: radius.lg },
  waiting: { backgroundColor: color.context.waiting.bg, borderColor: color.context.waiting.border, cornerRadius: radius.lg }
};

/**
 * Panel - Reusable background panel with styling options
 */
class Panel extends PIXI.Container {
  constructor(options = {}) {
    super();

    const preset = VARIANTS[options.variant] || VARIANTS.default;

    // Default options
    this.options = {
      width: 200,
      height: 150,
      backgroundColor: preset.backgroundColor,
      borderColor: preset.borderColor,
      borderWidth: 2,
      cornerRadius: preset.cornerRadius,
      alpha: 1,
      ...options
    };

    // The drawn rect lives on a child Graphics, not on this Container
    // itself - cacheAsTexture (in createPanel(), below) turns `this` into
    // a render group whose cached texture only ever captures its
    // CHILDREN's content, never content a Graphics draws on itself. A
    // Panel that extended Graphics directly and cached itself rendered
    // as an invisible panel - the fill/stroke commands were issued, just
    // never actually captured into the cache.
    this.background = new PIXI.Graphics();
    this.addChild(this.background);

    this.createPanel();
  }

  /**
   * Create the panel graphics
   */
  createPanel() {
    this.background.clear();

    this.background.roundRect(0, 0, this.options.width, this.options.height, this.options.cornerRadius);
    this.background.fill({ color: this.options.backgroundColor, alpha: this.options.alpha });

    if (this.options.borderWidth > 0) {
      this.background.stroke({ color: this.options.borderColor, width: this.options.borderWidth });
    }

    // Flat, non-reactive shadow - callers only ever tween this panel's own
    // alpha/position/scale (never redraw its fill after this), so caching
    // right after each (re)draw stays correct with no further updates needed.
    applyElevation(this, 1);
  }

  /**
   * Update panel size
   */
  resize(width, height) {
    this.options.width = width;
    this.options.height = height;
    this.createPanel();
  }

  /**
   * Update panel colors
   */
  setColors(backgroundColor, borderColor = null) {
    this.options.backgroundColor = backgroundColor;
    if (borderColor !== null) {
      this.options.borderColor = borderColor;
    }
    this.createPanel();
  }
}

export default Panel;
