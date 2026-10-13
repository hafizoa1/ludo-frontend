import * as PIXI from 'pixi.js';
import { gsap } from 'gsap';
import eventBus from '../../../utils/EventBus';
import { color, type, motion, fontFamily } from '../../design/tokens';

/**
 * DiceComponent - Clean, fast, and user-friendly dual dice
 * Focuses on quick, satisfying animations without the physics overhead
 */
class DiceComponent extends PIXI.Container {
  constructor(options = {}) {
    super();
    
    // Simple configuration
    this.size = options.size || 80;
    this.interactive = options.interactive !== false;
    this.rollDuration = options.rollDuration || 1500; // Much shorter default
    
    // Core state - simplified
    this.enabled = true;
    this.isRolling = false;
    this.currentValues = { die1: 1, die2: 1 };
    
    // Visual elements only
    this.dice1 = null;
    this.dice2 = null;
    this.rollButton = null;
    this.totalDisplay = null;
    
    // Single animation timeline
    this.rollAnimation = null;
    
    console.log('🎲 DiceComponent created (Simplified)', { 
      size: this.size, 
      interactive: this.interactive,
      rollDuration: this.rollDuration
    });
    
    this.init();
  }

  init() {
    this.createDice();
    this.createUI();
    this.setupInteraction();
    this.startIdleAnimation();
  }

  createDice() {
    const spacing = this.size * 1.2;
    const startX = this.size / 2;
    const startY = this.size / 2;
    
    this.dice1 = this.createSingleDie(startX - spacing/2, startY, 'die1');
    this.dice2 = this.createSingleDie(startX + spacing/2, startY, 'die2');
    
    this.homePositions = {
      die1: { x: startX - spacing/2, y: startY },
      die2: { x: startX + spacing/2, y: startY }
    };
  }

  createSingleDie(x, y, dieId) {
    const dieContainer = new PIXI.Container();
    dieContainer.x = x;
    dieContainer.y = y;
    dieContainer.name = dieId;
    
    // Simple shadow
    const shadow = new PIXI.Graphics();
    shadow.ellipse(this.size/2 + 2, this.size/2 + 2, this.size * 0.5, this.size * 0.5);
    shadow.fill({ color: 0x000000, alpha: 0.15 });
    dieContainer.addChild(shadow);
    
    // Hover glow effect
    const glow = new PIXI.Graphics();
    glow.circle(this.size/2, this.size/2, this.size * 0.7);
    glow.fill({ color: color.accent.gold, alpha: 0 });
    dieContainer.addChild(glow);
    dieContainer.glow = glow;
    
    // Simple clean dice face - just one flat square
    const diceBody = new PIXI.Graphics();
    diceBody.roundRect(0, 0, this.size, this.size, 8);
    diceBody.fill({ color: color.text.primary });
    diceBody.stroke({ color: color.text.secondary, width: 2 });
    
    dieContainer.addChild(diceBody);
    dieContainer.diceBody = diceBody;
    
    // Dice face for dots
    const diceFace = new PIXI.Container();
    dieContainer.addChild(diceFace);
    dieContainer.diceFace = diceFace;
    
    this.updateDiceFace(diceFace, 1);
    this.addChild(dieContainer);
    return dieContainer;
  }

  createUI() {
    // Roll button
    this.rollButton = new PIXI.Container();
    this.rollButton.interactive = true;
    this.rollButton.buttonMode = true;
    this.rollButton.alpha = 0;
    
    const buttonBg = new PIXI.Graphics();
    buttonBg.roundRect(-50, -20, 100, 40, 8);
    buttonBg.fill({ color: color.state.success, alpha: 0.9 });
    buttonBg.stroke({ color: color.text.primary, width: 2 });

    const rollText = new PIXI.Text('ROLL', {
      fontFamily,
      fontSize: type.body,
      fontWeight: 'bold',
      fill: color.text.primary,
      align: 'center'
    });
    rollText.anchor.set(0.5);
    
    this.rollButton.addChild(buttonBg, rollText);
    this.rollButton.x = this.size / 2;
    this.rollButton.y = this.size - 40;
    this.addChild(this.rollButton);
    
    // Total display
    this.totalDisplay = new PIXI.Container();
    this.totalDisplay.alpha = 0;
    
    const totalText = new PIXI.Text('Total: 2', {
      fontFamily,
      fontSize: type.heading,
      fontWeight: 'bold',
      fill: color.text.onLight,
      align: 'center'
    });
    totalText.anchor.set(0.5);
    
    this.totalDisplay.addChild(totalText);
    this.totalDisplay.totalText = totalText;
    this.totalDisplay.x = this.size / 2;
    this.totalDisplay.y = this.size + 40;
    this.addChild(this.totalDisplay);
  }

  setupInteraction() {
    if (!this.interactive) return;
    
    this.interactive = true;
    this.buttonMode = true;
    
    // Hover effects
    this.on('pointerover', () => {
      if (this.enabled && !this.isRolling) {
        this.showHoverEffect();
      }
    });
    
    this.on('pointerout', () => {
      if (this.enabled && !this.isRolling) {
        this.hideHoverEffect();
      }
    });
    
    // Click to roll
    this.on('pointerdown', () => {
      if (this.enabled && !this.isRolling) {
        this.handleRollClick();
      }
    });
  }

  showHoverEffect() {
    gsap.to([this.dice1.glow, this.dice2.glow], {
      alpha: 0.3,
      duration: 0.2
    });
    
    gsap.to([this.dice1.scale, this.dice2.scale], {
      x: 1.05,
      y: 1.05,
      duration: 0.2,
      ease: "power2.out"
    });
    
    gsap.to(this.rollButton, { alpha: 1, duration: 0.2 });
  }

  hideHoverEffect() {
    gsap.to([this.dice1.glow, this.dice2.glow], {
      alpha: 0,
      duration: 0.2
    });
    
    gsap.to([this.dice1.scale, this.dice2.scale], {
      x: 1,
      y: 1,
      duration: 0.2,
      ease: "power2.out"
    });
    
    gsap.to(this.rollButton, { alpha: 0, duration: 0.2 });
  }

  handleRollClick() {
    console.log('🎲 Dice roll requested');

    // A quick press-down cue for the tap itself - previously nothing
    // acknowledged the click before the much bigger roll timeline took
    // over, unlike every other interactive element (Button.js's own
    // press state).
    gsap.to([this.dice1.scale, this.dice2.scale], {
      x: 0.95,
      y: 0.95,
      duration: motion.settle.duration,
      ease: motion.settle.ease,
      yoyo: true,
      repeat: 1
    });

    eventBus.emit('game.dice.roll.request');
    this.startRollingAnimation();
  }

  /**
   * Fast, satisfying roll animation - no physics overhead. Every phase's
   * timing derives from this.rollDuration now - it used to be hardcoded
   * absolute offsets (0.3s / 1.2s / 1.3s) that happened to roughly add up
   * to the *default* rollDuration (1500ms) but didn't actually scale with
   * it, so the constructor's own rollDuration option never really worked.
   */
  startRollingAnimation() {
    if (this.isRolling) return;

    this.isRolling = true;
    this.enabled = false;

    // Hide UI during roll
    gsap.to([this.rollButton, this.totalDisplay], { alpha: 0, duration: 0.2 });

    const totalDuration = this.rollDuration / 1000; // seconds
    const anticipationDuration = 0.15; // stays short regardless of total length
    const settleDuration = 0.1;
    const rotationStart = anticipationDuration * 2;
    const rotationDuration = Math.max(0.3, totalDuration - rotationStart - settleDuration * 2);
    const bounceUpStart = rotationStart + rotationDuration;
    const bounceDownStart = bounceUpStart + settleDuration;

    // Create satisfying roll sequence
    this.rollAnimation = gsap.timeline({
      onComplete: () => {
        this.finishRoll();
      }
    });

    // Phase 1: Anticipation bounce
    this.rollAnimation.to([this.dice1, this.dice2], {
      y: "-=15",
      duration: anticipationDuration,
      ease: "power2.out"
    });

    this.rollAnimation.to([this.dice1, this.dice2], {
      y: "+=15",
      duration: anticipationDuration,
      ease: "power2.in"
    });

    // Phase 2: Rolling with random values, for exactly as long as the rotation below
    this.rollAnimation.call(() => {
      this.showRandomValues(rotationDuration);
    });

    // Phase 3: Settling animation
    this.rollAnimation.to([this.dice1.diceBody, this.dice2.diceBody], {
      rotation: "+=6.28", // Full rotation
      duration: rotationDuration,
      ease: "power2.out"
    }, rotationStart);

    this.rollAnimation.to([this.dice1, this.dice2], {
      y: "-=8",
      duration: settleDuration,
      ease: "power2.out"
    }, bounceUpStart);

    this.rollAnimation.to([this.dice1, this.dice2], {
      y: "+=8",
      duration: settleDuration,
      ease: motion.impact.ease
    }, bounceDownStart);
  }

  /**
   * Flicker random faces for `duration` seconds. Was a raw setInterval -
   * a second animation mechanism alongside gsap, un-killed by destroy()'s
   * gsap.killTweensOf (nothing there targeted it). Now a real gsap tween,
   * so destroy() actually stops it.
   */
  showRandomValues(duration) {
    const changeInterval = 0.1;
    const changes = Math.max(1, Math.floor(duration / changeInterval));

    if (this.randomValuesTween) this.randomValuesTween.kill();

    this.randomValuesTween = gsap.to({}, {
      duration: 0.001,
      repeat: changes - 1,
      repeatDelay: changeInterval,
      onStart: () => this.randomizeDiceFaces(),
      onRepeat: () => this.randomizeDiceFaces()
    });
  }

  randomizeDiceFaces() {
    const random1 = Math.floor(Math.random() * 6) + 1;
    const random2 = Math.floor(Math.random() * 6) + 1;

    this.updateDiceFace(this.dice1.diceFace, random1);
    this.updateDiceFace(this.dice2.diceFace, random2);
  }

  finishRoll() {
    if (this.randomValuesTween) {
      this.randomValuesTween.kill();
      this.randomValuesTween = null;
    }

    // Show final values (use predetermined values if set)
    const finalValues = this.targetValues || {
      die1: Math.floor(Math.random() * 6) + 1,
      die2: Math.floor(Math.random() * 6) + 1
    };
    
    this.currentValues = finalValues;
    this.updateDiceFace(this.dice1.diceFace, finalValues.die1);
    this.updateDiceFace(this.dice2.diceFace, finalValues.die2);
    
    // Result animation
    gsap.fromTo([this.dice1.diceFace, this.dice2.diceFace], 
      { scale: { x: 1.3, y: 1.3 } },
      { 
        scale: { x: 1, y: 1 }, 
        duration: 0.4,
        ease: "elastic.out(1, 0.3)"
      }
    );
    
    // Show total
    this.showTotal();
    
    // Re-enable
    this.isRolling = false;
    this.enabled = true;
    this.targetValues = null;
  }

  showTotal() {
    const total = this.currentValues.die1 + this.currentValues.die2;
    this.totalDisplay.totalText.text = `Total: ${total}`;
    
    gsap.to(this.totalDisplay, { 
      alpha: 1, 
      duration: 0.5,
      delay: 0.2
    });
    
    // Special animation for double 6
    if (this.currentValues.die1 === 6 && this.currentValues.die2 === 6) {
      this.showDoubleSixAnimation();
    }
  }

  showDoubleSixAnimation() {
    gsap.to([this.dice1.glow, this.dice2.glow], {
      alpha: 0.6,
      duration: 0.3,
      yoyo: true,
      repeat: 3
    });
  }

  updateDiceFace(diceFace, value) {
    diceFace.removeChildren();
    
    const dotSize = this.size * 0.08;
    const spacing = this.size * 0.25;
    const centerX = this.size / 2;
    const centerY = this.size / 2;
    
    const dotPatterns = {
      1: [{ x: centerX, y: centerY }],
      2: [
        { x: centerX - spacing, y: centerY - spacing },
        { x: centerX + spacing, y: centerY + spacing }
      ],
      3: [
        { x: centerX - spacing, y: centerY - spacing },
        { x: centerX, y: centerY },
        { x: centerX + spacing, y: centerY + spacing }
      ],
      4: [
        { x: centerX - spacing, y: centerY - spacing },
        { x: centerX + spacing, y: centerY - spacing },
        { x: centerX - spacing, y: centerY + spacing },
        { x: centerX + spacing, y: centerY + spacing }
      ],
      5: [
        { x: centerX - spacing, y: centerY - spacing },
        { x: centerX + spacing, y: centerY - spacing },
        { x: centerX, y: centerY },
        { x: centerX - spacing, y: centerY + spacing },
        { x: centerX + spacing, y: centerY + spacing }
      ],
      6: [
        { x: centerX - spacing, y: centerY - spacing },
        { x: centerX + spacing, y: centerY - spacing },
        { x: centerX - spacing, y: centerY },
        { x: centerX + spacing, y: centerY },
        { x: centerX - spacing, y: centerY + spacing },
        { x: centerX + spacing, y: centerY + spacing }
      ]
    };
    
    const dots = dotPatterns[value] || [];
    
    dots.forEach((dotPos, index) => {
      const dot = new PIXI.Graphics();
      dot.circle(dotPos.x, dotPos.y, dotSize);
      dot.fill({ color: color.text.onLight });
      
      // Simple staggered appearance animation
      dot.alpha = 0;
      dot.scale.set(0);
      
      gsap.to(dot, {
        alpha: 1,
        duration: 0.15,
        delay: index * 0.03
      });
      
      gsap.to(dot.scale, {
        x: 1,
        y: 1,
        duration: 0.2,
        delay: index * 0.03,
        ease: "back.out(1.7)"
      });
      
      diceFace.addChild(dot);
    });
  }

  startIdleAnimation() {
    this.idleAnimation = gsap.timeline({ repeat: -1 });
    
    this.idleAnimation.to([this.dice1, this.dice2], {
      y: "-=3",
      duration: 2,
      ease: "sine.inOut"
    });
    
    this.idleAnimation.to([this.dice1, this.dice2], {
      y: "+=3",
      duration: 2,
      ease: "sine.inOut"
    });
  }

  // Public API methods
  setEnabled(enabled) {
    this.enabled = enabled;
    this.interactive = enabled;
    this.alpha = enabled ? 1 : 0.6;
  }

  setValue(die1Value, die2Value) {
    this.currentValues = { die1: die1Value, die2: die2Value };
    this.updateDiceFace(this.dice1.diceFace, die1Value);
    this.updateDiceFace(this.dice2.diceFace, die2Value);
    this.showTotal();
  }

  // Set target values for next roll
  setTargetValues(die1Value, die2Value) {
    this.targetValues = { die1: die1Value, die2: die2Value };
  }

  getValues() {
    return this.currentValues;
  }

  getIsRolling() {
    return this.isRolling;
  }

  showYourTurn() {
    gsap.to([this.dice1.glow, this.dice2.glow], {
      alpha: 0.3,
      duration: 1,
      yoyo: true,
      repeat: -1,
      ease: "sine.inOut"
    });
  }

  hideYourTurn() {
    gsap.killTweensOf([this.dice1.glow, this.dice2.glow]);
    gsap.to([this.dice1.glow, this.dice2.glow], {
      alpha: 0,
      duration: 0.3
    });
  }

  destroy() {
    if (this.rollAnimation) {
      this.rollAnimation.kill();
    }
    if (this.idleAnimation) {
      this.idleAnimation.kill();
    }
    if (this.randomValuesTween) {
      this.randomValuesTween.kill();
    }

    gsap.killTweensOf([this, this.dice1, this.dice2]);
    super.destroy();
  }
}

export default DiceComponent;