import * as PIXI from 'pixi.js';
import { gsap } from 'gsap';
import { LAYOUT_CONFIG } from '../config/layout.config';
import eventBus from '../../../../utils/EventBus';
import { color, type, fontFamily } from '../../../design/tokens';

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
      fontFamily,
      fontSize: uiLayout.title.fontSize,
      fontWeight: 'bold',
      fill: color.text.primary,
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

    // Handle a game forced to end (AFK timeout, disconnect, opponent leaving)
    this.stateCoordinator.on('game:ended:forced', (data) => {
      this.showForcedEndScreen(data.message);
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
      fontFamily,
      fontSize: type.label,
      fill: color.text.primary,
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
      fontFamily,
      fontSize: type.hero,
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
   * Show a forced-end screen (AFK timeout, disconnect, or opponent leaving).
   * Separate from showGameOverScreen because these come as a plain message
   * string, not a winning color - there's nothing to look up in
   * getPlayerColor(), and no GameState ever arrives to drive the normal
   * game:ended path (see StateCoordinator's game.ended.forced relay).
   */
  showForcedEndScreen(message) {
    const canvasDims = this.layout.getCanvasDimensions();

    const overlay = new PIXI.Graphics();
    overlay.rect(0, 0, canvasDims.width, canvasDims.height);
    overlay.fill({ color: 0x000000, alpha: 0.8 });

    const messageText = new PIXI.Text(message, {
      fontFamily,
      fontSize: type.display,
      fontWeight: 'bold',
      fill: color.text.primary,
      align: 'center',
      wordWrap: true,
      wordWrapWidth: canvasDims.width * 0.8
    });
    messageText.anchor.set(0.5);
    messageText.x = canvasDims.width / 2;
    messageText.y = canvasDims.height / 2 - 40;
    overlay.addChild(messageText);

    const buttonBg = new PIXI.Graphics();
    buttonBg.roundRect(-100, -25, 200, 50, 8);
    buttonBg.fill({ color: color.state.success });
    buttonBg.x = canvasDims.width / 2;
    buttonBg.y = canvasDims.height / 2 + 60;
    buttonBg.interactive = true;
    buttonBg.cursor = 'pointer';

    const buttonText = new PIXI.Text('Back to Menu', {
      fontFamily,
      fontSize: type.heading,
      fontWeight: 'bold',
      fill: color.text.primary,
      align: 'center'
    });
    buttonText.anchor.set(0.5);
    buttonBg.addChild(buttonText);

    buttonBg.on('pointerdown', () => {
      // The backend already tore down the room/sessions before sending the
      // message that led here (see GameManager.endGame) - there's nothing
      // left to tell the server, this is purely local scene navigation.
      // PixiApp and LobbyScene both already listen for this to switch back.
      eventBus.emit('game.left');
    });

    overlay.addChild(buttonBg);
    this.addChild(overlay);

    // Animate
    gsap.fromTo(messageText,
      { alpha: 0, y: messageText.y - 20 },
      { alpha: 1, y: messageText.y, duration: 0.5, ease: "power2.out" }
    );
    gsap.fromTo(buttonBg,
      { alpha: 0 },
      { alpha: 1, duration: 0.5, delay: 0.3 }
    );
  }

  /**
   * Get player color
   */
  getPlayerColor(player) {
    // Was its own local map with yellow: '#ffff44' - a shade off from the
    // board's actual piece yellow (color.player.yellow, 0xffdd44). The
    // win screen now matches the piece that actually won.
    return color.player[player] || color.text.primary;
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
