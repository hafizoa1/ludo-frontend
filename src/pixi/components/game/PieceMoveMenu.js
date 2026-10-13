// src/pixi/components/game/PieceMoveMenu.js

import * as PIXI from 'pixi.js';
import { gsap } from 'gsap';
import { color, radius, type, motion, fontFamily } from '../../design/tokens';

/**
 * Small contextual menu anchored to a specific piece, shown only when
 * that piece has more than one legal move. Replaces the old fixed
 * MoveManager panel for this case - see docs/move-selection-redesign.md.
 */
class PieceMoveMenu extends PIXI.Container {
  constructor(options = {}) {
    super();

    this.onSelect = options.onSelect;
    this.visible = false;
  }

  show(moves, anchorX, anchorY) {
    this.clear();

    const optionHeight = 34;
    const width = 170;
    const height = moves.length * optionHeight + 12;

    const bg = new PIXI.Graphics();
    bg.roundRect(0, 0, width, height, radius.sm);
    bg.fill({ color: color.bg.base, alpha: 0.95 });
    bg.stroke({ color: color.border.accent, width: 2 });
    this.addChild(bg);

    moves.forEach((move, index) => {
      const y = 6 + index * optionHeight;

      // willCapture rows use a deliberately muted red (not color.state.danger's
      // full saturation - too aggressive for a row full of regular move options)
      // with matching hover/press shades, same idea as Button.js's variants.
      const palette = move.willCapture
        ? { base: 0x8B2E2E, hover: 0xA33636, press: 0x6E2424 }
        : { base: color.bg.panelElevated, hover: 0x3F3F70, press: 0x282850 };

      const optionBg = new PIXI.Graphics();
      const redraw = (fillColor, alpha) => {
        optionBg.clear();
        optionBg.roundRect(6, y, width - 12, optionHeight - 4, radius.sm - 2);
        optionBg.fill({ color: fillColor, alpha });
      };
      redraw(palette.base, 0.9);

      optionBg.interactive = true;
      optionBg.cursor = 'pointer';
      optionBg.on('pointerover', () => redraw(palette.hover, 1));
      optionBg.on('pointerout', () => redraw(palette.base, 0.9));
      optionBg.on('pointerdown', (event) => {
        event.stopPropagation();
        redraw(palette.press, 1);
        this.onSelect?.(move);
      });
      this.addChild(optionBg);

      const label = this.describeMove(move);
      const text = new PIXI.Text(label, {
        fontFamily,
        fontSize: type.caption,
        fill: color.text.primary
      });
      text.x = 14;
      text.y = y + 8;
      this.addChild(text);
    });

    this.x = anchorX + 20;
    this.y = anchorY - height - 20;

    this.visible = true;
    this.alpha = 0;
    this.scale.set(0.85);
    gsap.to(this, { alpha: 1, duration: motion.pop.duration });
    gsap.to(this.scale, { x: 1, y: 1, duration: motion.pop.duration, ease: motion.pop.ease });
  }

  describeMove(move) {
    if (move.willCapture) return `Capture - die ${move.diceValue}`;
    if (move.moveType === 'BRING_OUT') return `Bring out - die ${move.diceValue}`;
    return `Move ${move.diceValue}`;
  }

  hide() {
    if (!this.visible) return;
    gsap.killTweensOf(this);
    gsap.killTweensOf(this.scale);
    this.visible = false;
    this.clear();
  }

  clear() {
    this.removeChildren().forEach((child) => child.destroy({ children: true }));
  }

  destroy(options) {
    gsap.killTweensOf(this);
    gsap.killTweensOf(this.scale);
    super.destroy(options);
  }
}

export default PieceMoveMenu;
