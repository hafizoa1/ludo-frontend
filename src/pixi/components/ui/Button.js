// src/pixi/components/ui/Button.js

import * as PIXI from 'pixi.js';
import { gsap } from 'gsap';
import { color, radius, type, motion, fontFamily } from '../../design/tokens';

// Named presets - a caller picks one instead of passing three colors
// individually. Explicit options still override a preset's values.
const VARIANTS = {
  primary: { backgroundColor: color.state.info, hoverColor: color.state.infoHover, pressedColor: color.state.infoPressed },
  success: { backgroundColor: color.state.success, hoverColor: color.state.successHover, pressedColor: color.state.successPressed },
  danger: { backgroundColor: color.state.danger, hoverColor: color.state.dangerHover, pressedColor: color.state.dangerPressed },
  neutral: { backgroundColor: color.state.neutral, hoverColor: color.state.neutralHover, pressedColor: color.state.neutralPressed }
};

/**
 * Button - Reusable animated button component
 */
class Button extends PIXI.Container {
  constructor(options = {}) {
    super();

    const preset = VARIANTS[options.variant] || VARIANTS.primary;

    // Default options
    this.options = {
      text: 'Button',
      width: 150,
      height: 50,
      backgroundColor: preset.backgroundColor,
      hoverColor: preset.hoverColor,
      pressedColor: preset.pressedColor,
      disabledColor: color.state.neutralHover,
      textColor: color.text.primary,
      fontSize: type.body,
      fontWeight: 'bold',
      cornerRadius: radius.sm,
      borderWidth: 0,
      borderColor: 0x000000,
      enabled: true,
      ...options
    };

    this.background = null;
    this.label = null;
    this.isPressed = false;
    this.isHovered = false;
    this.enabled = this.options.enabled;

    // Callback function
    this.onButtonClick = null;

    this.createButton();
    this.setupInteraction();
  }

  /**
   * Create button graphics
   */
  createButton() {
    // Create background
    this.background = new PIXI.Graphics();
    this.drawBackground(this.options.backgroundColor);
    this.addChild(this.background);

    // Create text label
    const textStyle = new PIXI.TextStyle({
      fontFamily,
      fontSize: this.options.fontSize,
      fontWeight: this.options.fontWeight,
      fill: this.options.textColor,
      align: 'center'
    });

    this.label = new PIXI.Text(this.options.text, textStyle);
    this.label.anchor.set(0.5);
    this.label.x = this.options.width / 2;
    this.label.y = this.options.height / 2;
    this.addChild(this.label);
  }

  /**
   * Draw button background
   */
  drawBackground(bgColor) {
    this.background.clear();

    this.background.roundRect(0, 0, this.options.width, this.options.height, this.options.cornerRadius);
    this.background.fill({ color: bgColor });

    if (this.options.borderWidth > 0) {
      this.background.stroke({ color: this.options.borderColor, width: this.options.borderWidth });
    }
  }

  /**
   * Setup button interaction
   */
  setupInteraction() {
    this.interactive = true;
    this.buttonMode = true;
    this.cursor = 'pointer';

    // Mouse/touch events
    this.on('pointerdown', this.onPointerDown.bind(this));
    this.on('pointerup', this.onPointerUp.bind(this));
    this.on('pointerupoutside', this.onPointerUp.bind(this));
    this.on('pointerover', this.onPointerOver.bind(this));
    this.on('pointerout', this.onPointerOut.bind(this));
  }

  /**
   * Handle pointer down
   */
  onPointerDown() {
    if (!this.enabled) return;

    this.isPressed = true;
    this.drawBackground(this.options.pressedColor);

    // Press animation
    gsap.to(this.scale, {
      x: 0.95,
      y: 0.95,
      duration: 0.1,
      ease: motion.settle.ease
    });
  }

  /**
   * Handle pointer up
   */
  onPointerUp() {
    if (!this.enabled) return;

    if (this.isPressed) {
      this.isPressed = false;

      // Determine color based on hover state
      const targetColor = this.isHovered ? this.options.hoverColor : this.options.backgroundColor;
      this.drawBackground(targetColor);

      // Release animation
      gsap.to(this.scale, {
        x: 1,
        y: 1,
        duration: 0.15,
        ease: motion.pop.ease
      });

      // Call callback
      if (this.onButtonClick) {
        this.onButtonClick();
      }
    }
  }

  /**
   * Handle pointer over (hover)
   */
  onPointerOver() {
    if (!this.enabled) return;

    this.isHovered = true;

    if (!this.isPressed) {
      this.drawBackground(this.options.hoverColor);

      // Hover animation
      gsap.to(this.scale, {
        x: 1.05,
        y: 1.05,
        duration: motion.settle.duration,
        ease: motion.settle.ease
      });
    }
  }

  /**
   * Handle pointer out
   */
  onPointerOut() {
    if (!this.enabled) return;

    this.isHovered = false;

    if (!this.isPressed) {
      this.drawBackground(this.options.backgroundColor);

      // Return to normal scale
      gsap.to(this.scale, {
        x: 1,
        y: 1,
        duration: motion.settle.duration,
        ease: motion.settle.ease
      });
    }
  }

  /**
   * Set button text
   */
  setText(text) {
    this.label.text = text;
    this.options.text = text;
  }

  /**
   * Set enabled state
   */
  setEnabled(enabled) {
    this.enabled = enabled;
    this.interactive = enabled;
    this.buttonMode = enabled;
    this.cursor = enabled ? 'pointer' : 'default';

    const targetColor = enabled ? this.options.backgroundColor : this.options.disabledColor;
    this.drawBackground(targetColor);
    this.alpha = enabled ? 1 : 0.7;
  }

  /**
   * Cleanup
   */
  destroy() {
    gsap.killTweensOf([this, this.scale]);
    super.destroy();
  }
}

export default Button;
