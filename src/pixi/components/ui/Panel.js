// src/pixi/components/ui/Panel.js

import * as PIXI from 'pixi.js';

/**
 * Panel - Reusable background panel with styling options
 */
class Panel extends PIXI.Graphics {
  constructor(options = {}) {
    super();
    
    // Default options
    this.options = {
      width: 200,
      height: 150,
      backgroundColor: 0x2a2a2a,
      borderColor: 0x4a4a4a,
      borderWidth: 2,
      cornerRadius: 10,
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
    
    // Set border style if needed
    if (this.options.borderWidth > 0) {
      this.lineStyle(this.options.borderWidth, this.options.borderColor, 1);
    }
    
    // Draw background
    this.beginFill(this.options.backgroundColor, this.options.alpha);
    this.drawRoundedRect(
      0, 0,
      this.options.width,
      this.options.height,
      this.options.cornerRadius
    );
    this.endFill();
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