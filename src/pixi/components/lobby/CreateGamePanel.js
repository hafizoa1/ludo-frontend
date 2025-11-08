// src/pixi/components/lobby/CreateGamePanel.js

import * as PIXI from 'pixi.js';
import { gsap } from 'gsap';
import eventBus from '../../../utils/EventBus';
import Button from '../ui/Button';
import Panel from '../ui/Panel';

/**
 * CreateGamePanel - Animated panel for creating new games
 */
class CreateGamePanel extends PIXI.Container {
  constructor() {
    super();
    
    this.panel = null;
    this.titleText = null;
    this.createButton = null;
    this.loadingSpinner = null;
    this.statusText = null;
    
    this.isCreating = false;
    
    console.log('🎮 CreateGamePanel created');
    
    this.setupPanel();
    this.setupEventListeners();
  }

  /**
   * Setup the create game panel
   */
  setupPanel() {
    // Create background panel
    this.panel = new Panel({
      width: 300,
      height: 400,
      backgroundColor: 0x2a2a4a,
      borderColor: 0x4a4a6a,
      borderWidth: 3,
      cornerRadius: 20
    });
    this.addChild(this.panel);

    // Create title
    this.createTitle();

    // Create description text
    this.createDescription();

    // Create main button
    this.createButton = new Button({
      text: 'Create New Game',
      width: 200,
      height: 60,
      backgroundColor: 0x4CAF50,
      hoverColor: 0x45a049,
      textColor: 0xFFFFFF,
      fontSize: 18,
      cornerRadius: 10
    });
    this.createButton.x = 50;
    this.createButton.y = 250;
    this.addChild(this.createButton);

    // Setup button interaction
    this.createButton.onButtonClick = () => {
      this.handleCreateGame();
    };

    // Create loading spinner (hidden initially)
    this.createLoadingSpinner();

    // Create status text
    this.createStatusText();

    // Add hover animation to panel
    this.setupPanelHover();
  }

  /**
   * Create title text
   */
  createTitle() {
    const titleStyle = new PIXI.TextStyle({
      fontFamily: 'Arial, sans-serif',
      fontSize: 28,
      fontWeight: 'bold',
      fill: '#ffffff',
      align: 'center'
    });

    this.titleText = new PIXI.Text('🆕 New Game', titleStyle);
    this.titleText.anchor.set(0.5);
    this.titleText.x = 150;
    this.titleText.y = 60;
    this.addChild(this.titleText);
  }

  /**
   * Create description text
   */
  createDescription() {
    const descStyle = new PIXI.TextStyle({
      fontFamily: 'Arial, sans-serif',
      fontSize: 16,
      fill: '#cccccc',
      align: 'center',
      wordWrap: true,
      wordWrapWidth: 260
    });

    const descText = new PIXI.Text(
      'Start a new Ludo game and invite friends to join!\n\nYou\'ll get a game code to share.',
      descStyle
    );
    descText.anchor.set(0.5);
    descText.x = 150;
    descText.y = 150;
    this.addChild(descText);
  }

  /**
   * Create loading spinner
   */
  createLoadingSpinner() {
    this.loadingSpinner = new PIXI.Graphics();
    this.loadingSpinner.lineStyle(4, 0x4CAF50, 1);
    this.loadingSpinner.arc(0, 0, 20, 0, Math.PI * 1.5);
    this.loadingSpinner.x = 150;
    this.loadingSpinner.y = 280;
    this.loadingSpinner.visible = false;
    this.addChild(this.loadingSpinner);

    // Spinning animation
    this.spinAnimation = gsap.to(this.loadingSpinner, {
      rotation: Math.PI * 2,
      duration: 1,
      repeat: -1,
      ease: "none"
    });
    this.spinAnimation.pause();
  }

  /**
   * Create status text
   */
  createStatusText() {
    const statusStyle = new PIXI.TextStyle({
      fontFamily: 'Arial, sans-serif',
      fontSize: 14,
      fill: '#ffdd44',
      align: 'center',
      wordWrap: true,
      wordWrapWidth: 260
    });

    this.statusText = new PIXI.Text('', statusStyle);
    this.statusText.anchor.set(0.5);
    this.statusText.x = 150;
    this.statusText.y = 330;
    this.addChild(this.statusText);
  }

  /**
   * Setup panel hover effects
   */
  setupPanelHover() {
    this.interactive = true;
    this.buttonMode = false;

    this.on('pointerover', () => {
      if (!this.isCreating) {
        gsap.to(this.panel, {
          alpha: 0.9,
          duration: 0.2
        });
        gsap.to(this, {
          y: "-=5",
          duration: 0.3,
          ease: "power2.out"
        });
      }
    });

    this.on('pointerout', () => {
      if (!this.isCreating) {
        gsap.to(this.panel, {
          alpha: 1,
          duration: 0.2
        });
        gsap.to(this, {
          y: "+=5",
          duration: 0.3,
          ease: "power2.out"
        });
      }
    });
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Listen for game creation responses
    eventBus.subscribe('lobby.response.game.created', (response) => {
      console.log('🎮 CreateGamePanel: Game creation response:', response);
      
      if (response.success) {
        this.onGameCreated(response);
      } else {
        this.onGameCreationFailed(response.error || 'Failed to create game');
      }
    });

    // Listen for connection status
    eventBus.subscribe('game.connection.lost', () => {
      this.onConnectionLost();
    });

    eventBus.subscribe('game.connection.established', () => {
      this.onConnectionRestored();
    });
  }

  /**
   * Handle create game button click
   */
  handleCreateGame() {
    if (this.isCreating) return;

    console.log('🎮 CreateGamePanel: Creating game...');
    
    this.isCreating = true;
    this.showCreating();
    
    // Send create game request through EventBus
    eventBus.emit('lobby.create.game.request');
    
    // Also call GameService directly as backup
    import('../../../services/GameService').then(({ default: gameService }) => {
      gameService.createGame();
    });
  }

  /**
   * Show creating state with loading animation
   */
  showCreating() {
    // Disable button and show loading
    this.createButton.setEnabled(false);
    this.createButton.setText('Creating...');
    
    // Show loading spinner
    this.loadingSpinner.visible = true;
    this.spinAnimation.play();
    
    // Show status
    this.statusText.text = 'Creating your game...';
    
    // Add pulsing effect to panel
    gsap.to(this.panel, {
      alpha: 0.7,
      duration: 0.8,
      yoyo: true,
      repeat: -1,
      ease: "sine.inOut"
    });
  }

  /**
   * Handle successful game creation
   */
  onGameCreated(response) {
    console.log('🎮 CreateGamePanel: Game created successfully');
    
    // Stop loading animation
    this.stopLoading();
    
    // Show success state
    this.statusText.text = '✅ Game created successfully!';
    this.statusText.style.fill = '#4CAF50';
    
    // Success animation
    gsap.to(this.statusText, {
      scale: 1.2,
      duration: 0.3,
      yoyo: true,
      repeat: 1,
      ease: "power2.out"
    });

    // Panel will be hidden by LobbyScene transition
  }

  /**
   * Handle failed game creation
   */
  onGameCreationFailed(error) {
    console.log('🎮 CreateGamePanel: Game creation failed:', error);
    
    // Stop loading animation
    this.stopLoading();
    
    // Show error state
    this.statusText.text = `❌ ${error}`;
    this.statusText.style.fill = '#ff4444';
    
    // Error shake animation
    gsap.to(this, {
      x: "+=10",
      duration: 0.1,
      yoyo: true,
      repeat: 5,
      ease: "power2.inOut",
      onComplete: () => {
        // Reset after animation
        setTimeout(() => {
          this.resetToIdle();
        }, 2000);
      }
    });
  }

  /**
   * Handle connection lost
   */
  onConnectionLost() {
    this.stopLoading();
    this.statusText.text = '🔌 Connection lost...';
    this.statusText.style.fill = '#ff8844';
    this.createButton.setEnabled(false);
  }

  /**
   * Handle connection restored
   */
  onConnectionRestored() {
    this.resetToIdle();
    this.statusText.text = '🔌 Connected!';
    this.statusText.style.fill = '#4CAF50';
    
    // Clear status after a moment
    setTimeout(() => {
      if (this.statusText.text === '🔌 Connected!') {
        this.statusText.text = '';
      }
    }, 2000);
  }

  /**
   * Stop loading animation
   */
  stopLoading() {
    this.isCreating = false;
    
    // Hide spinner
    this.loadingSpinner.visible = false;
    this.spinAnimation.pause();
    
    // Stop panel pulsing
    gsap.killTweensOf(this.panel);
    this.panel.alpha = 1;
  }

  /**
   * Reset to idle state
   */
  resetToIdle() {
    this.stopLoading();
    
    // Reset button
    this.createButton.setEnabled(true);
    this.createButton.setText('Create New Game');
    
    // Clear status
    this.statusText.text = '';
    this.statusText.style.fill = '#ffdd44';
    this.statusText.scale.set(1);
  }

  /**
   * Enable/disable the panel
   */
  setEnabled(enabled) {
    this.createButton.setEnabled(enabled);
    this.interactive = enabled;
    this.alpha = enabled ? 1 : 0.5;
  }

  /**
   * Cleanup
   */
  destroy() {
    console.log('🎮 CreateGamePanel: Destroying...');
    
    // Kill animations
    gsap.killTweensOf([this, this.panel, this.statusText, this.loadingSpinner]);
    if (this.spinAnimation) {
      this.spinAnimation.kill();
    }
    
    // Destroy children
    if (this.panel) this.panel.destroy();
    if (this.createButton) this.createButton.destroy();
    
    super.destroy();
  }
}

export default CreateGamePanel;