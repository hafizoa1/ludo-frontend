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
class Panel extends PIXI.Graphics {
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

    this.createPanel();
  }

  /**
   * Create the panel graphics
   */
  createPanel() {
    this.clear();

    this.roundRect(0, 0, this.options.width, this.options.height, this.options.cornerRadius);
    this.fill({ color: this.options.backgroundColor, alpha: this.options.alpha });

    if (this.options.borderWidth > 0) {
      this.stroke({ color: this.options.borderColor, width: this.options.borderWidth });
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
