import * as PIXI from 'pixi.js';
import { gsap } from 'gsap';

// Managers
import LayoutManager from './managers/LayoutManager';
import StateCoordinator from './managers/StateCoordinator';
import ConnectionHandler from './managers/ConnectionHandler';

// Components
import GameBoardContainer from './components/GameBoardContainer';
import GameControlsContainer from './components/GameControlsContainer';
import PlayerAreaContainer from './components/PlayerAreaContainer';
import GameUIContainer from './components/GameUIContainer';

import { LAYOUT_CONFIG } from './config/layout.config';

/**
 * GameScene - Refactored main game scene
 * Now focused solely on orchestration, with all logic delegated to specialized components
 */
class GameScene extends PIXI.Container {
  constructor() {
    super();
    
    // Initialize managers
    // Use base design dimensions since PixiApp handles stage scaling
    this.layoutManager = new LayoutManager({
      width: 1200,
      height: 800
    });
    
    this.stateCoordinator = new StateCoordinator();
    this.connectionHandler = new ConnectionHandler(this.stateCoordinator);
    
    // Component containers
    this.gameUI = null;
    this.boardContainer = null;
    this.controlsContainer = null;
    this.playerArea = null;
    
    console.log('🎲 GameScene created with refactored architecture');
    
    this.setupScene();
  }

  /**
   * Setup the scene - now just assembles components
   */
  setupScene() {
    try {
      // Create UI layer (background, title, messages)
      this.gameUI = new GameUIContainer(this.layoutManager, this.stateCoordinator);
      this.addChild(this.gameUI);
      
      // Create game board (board + pieces + move visualization)
      this.boardContainer = new GameBoardContainer(this.layoutManager, this.stateCoordinator);
      this.addChild(this.boardContainer);
      
      // Create player area (all player panels)
      this.playerArea = new PlayerAreaContainer(this.layoutManager, this.stateCoordinator);
      this.addChild(this.playerArea);
      
      // Create controls (dice + turn indicator)
      this.controlsContainer = new GameControlsContainer(
        this.layoutManager, 
        this.stateCoordinator,
        this.connectionHandler
      );
      this.addChild(this.controlsContainer);
      
      console.log('✅ GameScene setup complete');
    } catch (error) {
      console.error('❌ GameScene setup failed:', error);
      throw error;
    }
  }

  /**
   * Scene entrance animation
   */
  async onShow() {
    console.log('🎲 GameScene: Showing with animation');
    
    // Request current game state
    this.stateCoordinator.requestGameState();
    
    // Animate entrance
    this.gameUI.background.alpha = 0;
    gsap.to(this.gameUI.background, { alpha: 1, duration: 0.5 });
    
    this.boardContainer.scale.set(0);
    gsap.to(this.boardContainer.scale, { x: 1, y: 1, duration: 0.8, ease: "back.out(1.7)" });
    
    this.playerArea.alpha = 0;
    gsap.to(this.playerArea, { alpha: 1, duration: 0.6, delay: 0.2 });
    
    this.controlsContainer.alpha = 0;
    gsap.to(this.controlsContainer, { alpha: 1, duration: 0.6, delay: 0.4 });
  }

  /**
   * Scene exit animation
   */
  async onHide() {
    console.log('🎲 GameScene: Hiding with animation');
    
    await new Promise(resolve => {
      gsap.to(this, {
        alpha: 0,
        duration: 0.5,
        onComplete: resolve
      });
    });
    
    this.alpha = 1; // Reset for next time
  }

  /**
   * Handle window resize
   */
  onResize(width, height, scale) {
    // PixiApp handles stage scaling, so we keep using base dimensions
    // this.layoutManager.updateViewport(width, height);

    // No need to update layouts - PixiApp stage scaling handles responsiveness
    // Components use fixed 1200x800 coordinate space
  }

  /**
   * Get current game status (for debugging/testing)
   */
  getGameStatus() {
    return {
      isMyTurn: this.stateCoordinator.isMyTurn(),
      gameState: this.stateCoordinator.getCurrentState(),
      connectionStatus: this.connectionHandler.getStatus(),
      layoutMode: this.layoutManager.isSmallScreen() ? 'small' : 
            this.layoutManager.isLargeScreen() ? 'large' : 'normal'
    };
  }

  /**
   * Manual piece selection (for testing)
   */
  selectPiece(pieceIndex) {
    console.log('🎯 GameScene: Selecting piece:', pieceIndex);
    this.stateCoordinator.selectPiece(pieceIndex);
  }

  /**
   * Cleanup
   */
  destroy(options) {
    console.log('GameScene: Destroying...');
    
    // Cleanup managers
    if (this.connectionHandler) this.connectionHandler.destroy();
    if (this.stateCoordinator) this.stateCoordinator.destroy();
    
    // Kill animations
    gsap.killTweensOf([this, this.boardContainer, this.gameUI]);
    
    // Destroy components (they handle their own cleanup)
    if (this.gameUI) this.gameUI.destroy();
    if (this.boardContainer) this.boardContainer.destroy();
    if (this.playerArea) this.playerArea.destroy();
    if (this.controlsContainer) this.controlsContainer.destroy();
    
    super.destroy(options);
  }
}

export default GameScene;
