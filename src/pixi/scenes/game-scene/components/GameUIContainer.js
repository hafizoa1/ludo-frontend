import * as PIXI from 'pixi.js';
import { gsap } from 'gsap';
import { LAYOUT_CONFIG } from '../config/layout.config';

/**
 * GameUIContainer - Manages UI overlays, messages, and game over screen
 */
class GameUIContainer extends PIXI.Container {
  constructor(layout, stateCoordinator) {
    super();

    this.layout = layout;
    this.stateCoordinator = stateCoordinator;

    this.background = null;
    this.titleText = null;
    this.activeMessages = [];

    this.createBackground();
    this.createTitle();
    this.setupEventListeners();
  }

  /**
   * Create background
   */
  createBackground() {
    const canvasDims = this.layout.getCanvasDimensions();

    this.background = new PIXI.Graphics();
    this.background.rect(0, 0, canvasDims.width, canvasDims.height);
    this.background.fill({ color: LAYOUT_CONFIG.colors.background });
    this.addChild(this.background);
  }

  /**
   * Create title
   */
  createTitle() {
    const uiLayout = this.layout.getUILayout();
    
    this.titleText = new PIXI.Text('🎲 LUDO GAME', {
      fontFamily: 'Arial, sans-serif',
      fontSize: uiLayout.title.fontSize,
      fontWeight: 'bold',
      fill: '#ffffff',
      align: 'center'
    });
    this.titleText.anchor.set(0.5);
    this.titleText.x = uiLayout.title.x;
    this.titleText.y = uiLayout.title.y;
    this.addChild(this.titleText);
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Handle messages
    this.stateCoordinator.on('ui:message', (data) => {
      this.showMessage(data.message, data.duration);
    });

    // Handle game over
    this.stateCoordinator.on('game:ended', (data) => {
      this.showGameOverScreen(data.winner);
    });
  }

  /**
   * Show temporary message
   */
  showMessage(message, duration = 3000) {
    const messageContainer = new PIXI.Container();
    
    const messageBg = new PIXI.Graphics();
    messageBg.roundRect(-150, -30, 300, 60, 10);
    messageBg.fill({ color: 0x000000, alpha: 0.8 });
    
    const messageText = new PIXI.Text(message, {
      fontFamily: 'Arial, sans-serif',
      fontSize: 16,
      fill: '#ffffff',
      align: 'center',
      wordWrap: true,
      wordWrapWidth: 280
    });
    messageText.anchor.set(0.5);
    
    messageContainer.addChild(messageBg);
    messageContainer.addChild(messageText);

    const canvasDims = this.layout.getCanvasDimensions();
    messageContainer.x = canvasDims.width / 2;
    messageContainer.y = canvasDims.height / 2;
    messageContainer.alpha = 0;
    
    this.addChild(messageContainer);
    this.activeMessages.push(messageContainer);
    
    // Animate in
    gsap.to(messageContainer, { alpha: 1, duration: 0.3 });
    
    // Animate out
    if (duration > 0) {
      gsap.to(messageContainer, { 
        alpha: 0, 
        duration: 0.3, 
        delay: duration / 1000,
        onComplete: () => {
          this.removeMessage(messageContainer);
        }
      });
    }
  }

  /**
   * Remove a message
   */
  removeMessage(messageContainer) {
    gsap.killTweensOf(messageContainer);
    
    const index = this.activeMessages.indexOf(messageContainer);
    if (index > -1) {
      this.activeMessages.splice(index, 1);
    }
    
    if (messageContainer.parent === this) {
      this.removeChild(messageContainer);
    }
    
    setTimeout(() => {
      if (messageContainer && !messageContainer.destroyed) {
        messageContainer.destroy({ children: true });
      }
    }, 16);
  }

  /**
   * Show game over screen
   */
  showGameOverScreen(winner) {
    const canvasDims = this.layout.getCanvasDimensions();

    const overlay = new PIXI.Graphics();
    overlay.rect(0, 0, canvasDims.width, canvasDims.height);
    overlay.fill({ color: 0x000000, alpha: 0.8 });

    const winText = new PIXI.Text(`🎉 ${winner.toUpperCase()} WINS! 🎉`, {
      fontFamily: 'Arial, sans-serif',
      fontSize: 48,
      fontWeight: 'bold',
      fill: this.getPlayerColor(winner),
      align: 'center'
    });
    winText.anchor.set(0.5);
    winText.x = canvasDims.width / 2;
    winText.y = canvasDims.height / 2;
    
    overlay.addChild(winText);
    this.addChild(overlay);
    
    // Animate
    gsap.fromTo(winText, 
      { scale: 0, rotation: -Math.PI },
      { 
        scale: 1, 
        rotation: 0, 
        duration: 1, 
        ease: "bounce.out" 
      }
    );
  }

  /**
   * Get player color
   */
  getPlayerColor(player) {
    const colors = {
      red: '#ff4444',
      blue: '#4444ff',
      green: '#44ff44',
      yellow: '#ffff44'
    };
    return colors[player] || '#ffffff';
  }

  /**
   * Update layout
   */
  updateLayout() {
    const uiLayout = this.layout.getUILayout();
    const canvasDims = this.layout.getCanvasDimensions();

    // Update background size
    if (this.background) {
      this.background.clear();
      this.background.rect(0, 0, canvasDims.width, canvasDims.height);
      this.background.fill({ color: LAYOUT_CONFIG.colors.background });
    }

    // Update title position
    if (this.titleText) {
      this.titleText.x = uiLayout.title.x;
      this.titleText.y = uiLayout.title.y;
      this.titleText.style.fontSize = uiLayout.title.fontSize;
    }
  }

  /**
   * Cleanup
   */
  destroy(options) {
    // Clean up active messages
    this.activeMessages.forEach(message => {
      gsap.killTweensOf(message);
      if (!message.destroyed) {
        message.destroy({ children: true });
      }
    });
    this.activeMessages = [];
    
    super.destroy(options);
  }
}

export default GameUIContainer;
