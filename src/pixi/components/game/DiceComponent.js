import * as PIXI from 'pixi.js';
import { gsap } from 'gsap';
import eventBus from '../../../utils/EventBus';

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
    glow.fill({ color: 0xffd700, alpha: 0 });
    dieContainer.addChild(glow);
    dieContainer.glow = glow;
    
    // Simple clean dice face - just one flat square
    const diceBody = new PIXI.Graphics();
    diceBody.roundRect(0, 0, this.size, this.size, 8);
    diceBody.fill({ color: 0xffffff });
    diceBody.stroke({ color: 0xcccccc, width: 2 });
    
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
    buttonBg.fill({ color: 0x4CAF50, alpha: 0.9 });
    buttonBg.stroke({ color: 0xffffff, width: 2 });
    
    const rollText = new PIXI.Text('ROLL', {
      fontFamily: 'Arial, sans-serif',
      fontSize: 14,
      fontWeight: 'bold',
      fill: '#ffffff',
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
      fontFamily: 'Arial, sans-serif',
      fontSize: 18,
      fontWeight: 'bold',
      fill: '#333333',
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
    eventBus.emit('game.dice.roll.request');
    this.startRollingAnimation();
  }

  /**
   * Fast, satisfying roll animation - no physics overhead
   */
  startRollingAnimation() {
    if (this.isRolling) return;
    
    this.isRolling = true;
    this.enabled = false;
    
    // Hide UI during roll
    gsap.to([this.rollButton, this.totalDisplay], { alpha: 0, duration: 0.2 });
    
    // Create satisfying roll sequence
    this.rollAnimation = gsap.timeline({
      onComplete: () => {
        this.finishRoll();
      }
    });
    
    // Phase 1: Anticipation bounce (0.3s)
    this.rollAnimation.to([this.dice1, this.dice2], {
      y: "-=15",
      duration: 0.15,
      ease: "power2.out"
    });
    
    this.rollAnimation.to([this.dice1, this.dice2], {
      y: "+=15",
      duration: 0.15,
      ease: "power2.in"
    });
    
    // Phase 2: Rolling with random values (1s)
    this.rollAnimation.call(() => {
      this.showRandomValues();
    });
    
    // Phase 3: Settling animation (0.2s)
    this.rollAnimation.to([this.dice1.diceBody, this.dice2.diceBody], {
      rotation: "+=6.28", // Full rotation
      duration: 1,
      ease: "power2.out"
    }, 0.3);
    
    this.rollAnimation.to([this.dice1, this.dice2], {
      y: "-=8",
      duration: 0.1,
      ease: "power2.out"
    }, 1.2);
    
    this.rollAnimation.to([this.dice1, this.dice2], {
      y: "+=8",
      duration: 0.1,
      ease: "bounce.out"
    }, 1.3);
  }

  showRandomValues() {
    let changeCount = 0;
    const maxChanges = 8;
    
    const randomInterval = setInterval(() => {
      if (!this.isRolling || changeCount >= maxChanges) {
        clearInterval(randomInterval);
        return;
      }
      
      const random1 = Math.floor(Math.random() * 6) + 1;
      const random2 = Math.floor(Math.random() * 6) + 1;
      
      this.updateDiceFace(this.dice1.diceFace, random1);
      this.updateDiceFace(this.dice2.diceFace, random2);
      
      changeCount++;
    }, 100);
  }

  finishRoll() {
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
      dot.fill({ color: 0x333333 });
      
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
    
    gsap.killTweensOf([this, this.dice1, this.dice2]);
    super.destroy();
  }
}

export default DiceComponent;