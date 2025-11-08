// src/pixi/components/lobby/JoinGamePanel.js

import * as PIXI from 'pixi.js';
import { gsap } from 'gsap';
import eventBus from '../../../utils/EventBus';
import Button from '../ui/Button';
import Panel from '../ui/Panel';
import TextInput from '../ui/TextInput';

/**
 * JoinGamePanel - Panel for joining existing games
 */
class JoinGamePanel extends PIXI.Container {
  constructor() {
    super();
    
    this.panel = null;
    this.titleText = null;
    this.gameIdInput = null;
    this.joinButton = null;
    this.loadingSpinner = null;
    this.statusText = null;
    
    this.isJoining = false;
    this.gameIdValue = '';
    
    console.log('🔗 JoinGamePanel created');
    
    this.setupPanel();
    this.setupEventListeners();
  }

  /**
   * Setup the join game panel
   */
  setupPanel() {
    // Create background panel
    this.panel = new Panel({
      width: 300,
      height: 400,
      backgroundColor: 0x2a4a2a,
      borderColor: 0x4a6a4a,
      borderWidth: 3,
      cornerRadius: 20
    });
    this.addChild(this.panel);

    // Create title
    this.createTitle();

    // Create description text
    this.createDescription();

    // Create game ID input
    this.createGameIdInput();

    // Create join button
    this.createJoinButton();

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

    this.titleText = new PIXI.Text('🔗 Join Game', titleStyle);
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
      'Enter a game code to join an existing game!\n\nGet the code from a friend who created a game.',
      descStyle
    );
    descText.anchor.set(0.5);
    descText.x = 150;
    descText.y = 140;
    this.addChild(descText);
  }

  /**
   * Create game ID input field
   */
   createGameIdInput() {
    this.gameIdInput = new TextInput({
      placeholder: 'Enter Game ID',
      width: 200,
      height: 40,
      x: 50,
      y: 200,
      fontSize: 16,
      backgroundColor: 0x444444,
      borderColor: 0x666666,
      textColor: 0xFFFFFF,
      placeholderColor: 0xAAAAAA
    });
    
    this.addChild(this.gameIdInput);

    // FIXED: Listen for input changes WITHOUT calling setText
    this.gameIdInput.onTextChange = (text) => {
      // Store the uppercase value
      this.gameIdValue = text.toUpperCase();
      
      // DON'T call setText here - that causes recursion!
      // The TextInput will handle the display internally
      
      // Just update the button state
      this.updateJoinButtonState();
      
      console.log('Game ID changed to:', this.gameIdValue);
    };
  }

  /**
   * Create join button
   */
  createJoinButton() {
    this.joinButton = new Button({
      text: 'Join Game',
      width: 200,
      height: 60,
      backgroundColor: 0x2196F3,
      hoverColor: 0x1976D2,
      textColor: 0xFFFFFF,
      fontSize: 18,
      cornerRadius: 10,
      enabled: false // Disabled until game ID is entered
    });
    this.joinButton.x = 50;
    this.joinButton.y = 260;
    this.addChild(this.joinButton);

    // Setup button interaction
    this.joinButton.onButtonClick = () => {
      this.handleJoinGame();
    };
  }

  /**
   * Create loading spinner
   */
  createLoadingSpinner() {
    this.loadingSpinner = new PIXI.Graphics();
    this.loadingSpinner.lineStyle(4, 0x2196F3, 1);
    this.loadingSpinner.arc(0, 0, 20, 0, Math.PI * 1.5);
    this.loadingSpinner.x = 150;
    this.loadingSpinner.y = 290;
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
    this.statusText.y = 350;
    this.addChild(this.statusText);
  }

  /**
   * Setup panel hover effects
   */
  setupPanelHover() {
    this.interactive = true;
    this.buttonMode = false;

    this.on('pointerover', () => {
      if (!this.isJoining) {
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
      if (!this.isJoining) {
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
    // Listen for game join responses
    eventBus.subscribe('lobby.response.game.joined', (response) => {
      console.log('🔗 JoinGamePanel: Game join response:', response);
      
      if (response.success) {
        this.onGameJoined(response);
      } else {
        this.onGameJoinFailed(response.error || 'Failed to join game');
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
   * Update join button enabled state based on input
   */
  updateJoinButtonState() {
    const isValidGameId = this.gameIdValue.length >= 4; // Minimum game ID length
    this.joinButton.setEnabled(isValidGameId && !this.isJoining);
  }

  /**
   * Handle join game button click
   */
  handleJoinGame() {
    if (this.isJoining || !this.gameIdValue.trim()) return;

    console.log('🔗 JoinGamePanel: Joining game:', this.gameIdValue);
    
    this.isJoining = true;
    this.showJoining();
    
    // Send join game request through EventBus
    eventBus.emit('lobby.join.game.request', { gameId: this.gameIdValue });
    
    // Also call GameService directly as backup
    import('../../../services/GameService').then(({ default: gameService }) => {
      gameService.joinGame(this.gameIdValue);
    });
  }

  /**
   * Show joining state with loading animation
   */
  showJoining() {
    // Disable input and button
    this.gameIdInput.setEnabled(false);
    this.joinButton.setEnabled(false);
    this.joinButton.setText('Joining...');
    
    // Show loading spinner
    this.loadingSpinner.visible = true;
    this.spinAnimation.play();
    
    // Show status
    this.statusText.text = `Joining game ${this.gameIdValue}...`;
    
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
   * Handle successful game join
   */
  onGameJoined(response) {
    console.log('🔗 JoinGamePanel: Game joined successfully');
    
    // Stop loading animation
    this.stopLoading();
    
    // Show success state
    this.statusText.text = '✅ Joined game successfully!';
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
   * Handle failed game join
   */
  onGameJoinFailed(error) {
    console.log('🔗 JoinGamePanel: Game join failed:', error);
    
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
    this.gameIdInput.setEnabled(false);
    this.joinButton.setEnabled(false);
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
    this.isJoining = false;
    
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
    
    // Reset input and button
    this.gameIdInput.setEnabled(true);
    this.joinButton.setText('Join Game');
    this.updateJoinButtonState();
    
    // Clear status
    this.statusText.text = '';
    this.statusText.style.fill = '#ffdd44';
    this.statusText.scale.set(1);
  }

  /**
   * Enable/disable the panel
   */
  setEnabled(enabled) {
    this.gameIdInput.setEnabled(enabled);
    this.joinButton.setEnabled(enabled && this.gameIdValue.length >= 4);
    this.interactive = enabled;
    this.alpha = enabled ? 1 : 0.5;
  }

  /**
   * Cleanup
   */
  destroy() {
    console.log('🔗 JoinGamePanel: Destroying...');
    
    // Kill animations
    gsap.killTweensOf([this, this.panel, this.statusText, this.loadingSpinner]);
    if (this.spinAnimation) {
      this.spinAnimation.kill();
    }
    
    // Destroy children
    if (this.panel) this.panel.destroy();
    if (this.gameIdInput) this.gameIdInput.destroy();
    if (this.joinButton) this.joinButton.destroy();
    
    super.destroy();
  }
}

export default JoinGamePanel;