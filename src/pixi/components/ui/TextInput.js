// src/pixi/components/ui/TextInput.js

import * as PIXI from 'pixi.js';
import { gsap } from 'gsap';

/**
 * TextInput - PixiJS text input field
 * Note: This is a simplified version. For production, consider using HTML input overlays
 */
class TextInput extends PIXI.Container {
  constructor(options = {}) {
    super();
    
    this.options = {
      placeholder: 'Enter text...',
      width: 200,
      height: 40,
      fontSize: 16,
      backgroundColor: 0x333333,
      borderColor: 0x666666,
      focusBorderColor: 0x4a9eff,
      textColor: 0xFFFFFF,
      placeholderColor: 0x888888,
      cornerRadius: 5,
      padding: 10,
      maxLength: 20,
      ...options
    };
    
    this.background = null;
    this.textDisplay = null;
    this.cursor = null;
    this.isFocused = false;
    this.text = '';
    this.enabled = true;
    
    // Callback
    this.onTextChange = null;
    
    this.createInput();
    this.setupInteraction();
    this.setupKeyboardListener();
  }

  /**
   * Create input field graphics
   */
  createInput() {
    // Create background
    this.background = new PIXI.Graphics();
    this.drawBackground(false);
    this.addChild(this.background);
    
    // Create text display
    const textStyle = new PIXI.TextStyle({
      fontFamily: 'Arial, sans-serif',
      fontSize: this.options.fontSize,
      fill: this.options.placeholderColor,
      align: 'left'
    });
    
    this.textDisplay = new PIXI.Text(this.options.placeholder, textStyle);
    this.textDisplay.x = this.options.padding;
    this.textDisplay.y = (this.options.height - this.textDisplay.height) / 2;
    this.addChild(this.textDisplay);
    
    // Create cursor
    this.cursor = new PIXI.Graphics();
    this.cursor.lineStyle(2, this.options.textColor);
    this.cursor.moveTo(0, 5);
    this.cursor.lineTo(0, this.options.height - 10);
    this.cursor.visible = false;
    this.addChild(this.cursor);
  }

  /**
   * Draw background with focus state
   */
  drawBackground(focused) {
    this.background.clear();
    
    const borderColor = focused ? this.options.focusBorderColor : this.options.borderColor;
    this.background.lineStyle(2, borderColor);
    this.background.beginFill(this.options.backgroundColor);
    this.background.drawRoundedRect(
      0, 0,
      this.options.width,
      this.options.height,
      this.options.cornerRadius
    );
    this.background.endFill();
  }

  /**
   * Setup interaction
   */
  setupInteraction() {
    this.interactive = true;
    this.buttonMode = true;
    
    this.on('pointerdown', () => {
      this.focus();
    });
  }

  /**
   * Setup keyboard listener
   */
  setupKeyboardListener() {
    // Note: This is a simplified keyboard handler
    // In production, you might want to use HTML input overlays for better mobile support
    this.keyboardHandler = (event) => {
      if (!this.isFocused || !this.enabled) return;
      
      if (event.key === 'Backspace') {
        this.text = this.text.slice(0, -1);
        this.updateDisplay();
      } else if (event.key === 'Enter') {
        this.blur();
      } else if (event.key.length === 1 && this.text.length < this.options.maxLength) {
        // Only allow alphanumeric characters for game IDs
        if (/[A-Z0-9]/i.test(event.key)) {
          this.text += event.key.toUpperCase();
          this.updateDisplay();
        }
      }
    };
    
    document.addEventListener('keydown', this.keyboardHandler);
  }

  /**
   * Focus the input
   */
  focus() {
    if (!this.enabled) return;
    
    this.isFocused = true;
    this.drawBackground(true);
    this.cursor.visible = true;
    this.updateCursorPosition();
    
    // Start cursor blinking
    this.cursorBlink = gsap.to(this.cursor, {
      alpha: 0,
      duration: 0.5,
      yoyo: true,
      repeat: -1,
      ease: "power2.inOut"
    });
  }

  /**
   * Blur the input
   */
  blur() {
    this.isFocused = false;
    this.drawBackground(false);
    this.cursor.visible = false;
    
    if (this.cursorBlink) {
      this.cursorBlink.kill();
      this.cursor.alpha = 1;
    }
  }

  /**
   * Update text display
   */
  updateDisplay() {
    if (this.text.length === 0) {
      this.textDisplay.text = this.options.placeholder;
      this.textDisplay.style.fill = this.options.placeholderColor;
    } else {
      this.textDisplay.text = this.text;
      this.textDisplay.style.fill = this.options.textColor;
    }
    
    this.updateCursorPosition();
    
    // Call callback
    if (this.onTextChange) {
      this.onTextChange(this.text);
    }
  }

  /**
   * Update cursor position
   */
  updateCursorPosition() {
  // Use the existing textDisplay's bounds instead of measuring separately
  const textWidth = this.text.length > 0 ? this.textDisplay.getBounds().width : 0;
  this.cursor.x = this.options.padding + textWidth + 2;
  this.cursor.y = (this.options.height - this.cursor.height) / 2;
}

  /**
   * Set text value
   */
  setText(text) {
    this.text = text.slice(0, this.options.maxLength);
    this.updateDisplay();
  }

  /**
   * Get text value
   */
  getText() {
    return this.text;
  }

  /**
   * Set enabled state
   */
  setEnabled(enabled) {
    this.enabled = enabled;
    this.interactive = enabled;
    this.alpha = enabled ? 1 : 0.5;
    
    if (!enabled) {
      this.blur();
    }
  }

  /**
   * Cleanup
   */
  destroy() {
    // Remove keyboard listener
    if (this.keyboardHandler) {
      document.removeEventListener('keydown', this.keyboardHandler);
    }
    
    // Kill animations
    if (this.cursorBlink) {
      this.cursorBlink.kill();
    }
    
    super.destroy();
  }
}

export default TextInput;