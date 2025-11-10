// src/pixi/components/lobby/WaitingRoom.js

import * as PIXI from 'pixi.js';
import { gsap } from 'gsap';
import eventBus from '../../../utils/EventBus';
import Panel from '../ui/Panel';

/**
 * WaitingRoom - Shows players waiting for game to start
 */
class WaitingRoom extends PIXI.Container {
  constructor() {
    super();
    
    this.panel = null;
    this.titleText = null;
    this.gameIdText = null;
    this.playersContainer = null;
    this.statusText = null;
    this.waitingAnimation = null;
    
    this.gameId = '';
    this.players = [];
    
    console.log('⏳ WaitingRoom created');
    
    this.setupRoom();
    this.setupEventListeners();
  }

  /**
   * Setup the waiting room
   */
  setupRoom() {
    // Create background panel
    this.panel = new Panel({
      width: 600,
      height: 300,
      backgroundColor: 0x3a2a4a,
      borderColor: 0x6a4a7a,
      borderWidth: 3,
      cornerRadius: 20
    });
    this.addChild(this.panel);

    // Create title
    this.createTitle();

    // Create game ID display
    this.createGameIdDisplay();

    // Create players container
    this.createPlayersContainer();

    // Create status text
    this.createStatusText();
  }

  /**
   * Create title text
   */
  createTitle() {
    const titleStyle = new PIXI.TextStyle({
      fontFamily: 'Arial, sans-serif',
      fontSize: 32,
      fontWeight: 'bold',
      fill: '#ffffff',
      align: 'center'
    });

    this.titleText = new PIXI.Text('⏳ Waiting Room', titleStyle);
    this.titleText.anchor.set(0.5);
    this.titleText.x = 300;
    this.titleText.y = 50;
    this.addChild(this.titleText);
  }

  /**
   * Create game ID display
   */
  createGameIdDisplay() {
    const gameIdStyle = new PIXI.TextStyle({
      fontFamily: 'Arial, sans-serif',
      fontSize: 24,
      fontWeight: 'bold',
      fill: '#ffdd44',
      align: 'center'
    });

    this.gameIdText = new PIXI.Text('Game ID: ----', gameIdStyle);
    this.gameIdText.anchor.set(0.5);
    this.gameIdText.x = 300;
    this.gameIdText.y = 90;
    this.addChild(this.gameIdText);
  }

  /**
   * Create players container
   */
  createPlayersContainer() {
    this.playersContainer = new PIXI.Container();
    this.playersContainer.x = 50;
    this.playersContainer.y = 130;
    this.addChild(this.playersContainer);
  }

  /**
   * Create status text
   */
  createStatusText() {
    const statusStyle = new PIXI.TextStyle({
      fontFamily: 'Arial, sans-serif',
      fontSize: 18,
      fill: '#cccccc',
      align: 'center'
    });

    this.statusText = new PIXI.Text('Waiting for players to join...', statusStyle);
    this.statusText.anchor.set(0.5);
    this.statusText.x = 300;
    this.statusText.y = 250;
    this.addChild(this.statusText);
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Listen for game state updates (player join/leave)
    eventBus.subscribe('game.state.updated', (data) => {
      if (data.newState && data.newState.players) {
        this.updatePlayers(data.newState.players);
      }
    });

    // Listen for player events
    eventBus.subscribe('game.player.update', (event) => {
      console.log('⏳ WaitingRoom: Player update:', event);
      // Handle player join/leave animations
    });
  }

  /**
   * Set game ID
   */
  setGameId(gameId) {
    this.gameId = gameId;
    this.gameIdText.text = `Game ID: ${gameId}`;
    
    // Add pulsing animation to game ID
    gsap.to(this.gameIdText, {
      alpha: 0.7,
      duration: 1,
      yoyo: true,
      repeat: -1,
      ease: "sine.inOut"
    });
  }

  /**
   * Update players list
   */
  updatePlayers(players) {
    this.players = players;
    this.renderPlayers();
    this.updateStatus();
  }

  /**
   * Render players in the waiting room
   */
  renderPlayers() {
    // Clear existing player displays
    this.playersContainer.removeChildren();

    this.players.forEach((player, index) => {
      const playerCard = this.createPlayerCard(player, index);
      playerCard.x = (index % 2) * 260;
      playerCard.y = Math.floor(index / 2) * 70;
      this.playersContainer.addChild(playerCard);
    });
  }

  /**
   * Create individual player card
   */
  createPlayerCard(player, index) {
    const card = new PIXI.Container();

    // Player background
    const bg = new PIXI.Graphics();
    bg.beginFill(0x4a4a6a);
    bg.drawRoundedRect(0, 0, 250, 60, 10);
    bg.endFill();
    card.addChild(bg);

    // Player name
    const nameStyle = new PIXI.TextStyle({
      fontFamily: 'Arial, sans-serif',
      fontSize: 18,
      fontWeight: 'bold',
      fill: '#ffffff'
    });

    const nameText = new PIXI.Text(player.playerName || `Player ${index + 1}`, nameStyle);
    nameText.x = 15;
    nameText.y = 10;
    card.addChild(nameText);

    // Player colors
    if (player.colors) {
      player.colors.forEach((color, colorIndex) => {
        const colorCircle = new PIXI.Graphics();
        const pixiColor = this.getPixiColor(color);
        colorCircle.beginFill(pixiColor);
        colorCircle.drawCircle(0, 0, 8);
        colorCircle.endFill();
        colorCircle.x = 15 + (colorIndex * 25);
        colorCircle.y = 40;
        card.addChild(colorCircle);
      });
    }

    // Connection status
    const statusColor = player.human ? 0x4CAF50 : 0x888888;
    const statusCircle = new PIXI.Graphics();
    statusCircle.beginFill(statusColor);
    statusCircle.drawCircle(0, 0, 5);
    statusCircle.endFill();
    statusCircle.x = 220;
    statusCircle.y = 15;
    card.addChild(statusCircle);

    // Add entrance animation
    card.alpha = 0;
    card.scale.set(0.8);
    gsap.to(card, {
      alpha: 1,
      scale: 1,
      duration: 0.5,
      ease: "back.out(1.2)",
      delay: index * 0.1
    });

    return card;
  }

  /**
   * Convert color string to PIXI color
   */
  getPixiColor(colorString) {
    const colorMap = {
      'RED': 0xFF4444,
      'BLUE': 0x4444FF,
      'GREEN': 0x44FF44,
      'YELLOW': 0xFFFF44
    };
    return colorMap[colorString] || 0xFFFFFF;
  }

  /**
   * Update status text
   */
  updateStatus() {
    const playerCount = this.players.length;
    
  if (playerCount < 2) {
    this.statusText.text = `Waiting for players... (${playerCount}/4)`;
    this.statusText.style.fill = '#cccccc';
  } else {
    this.statusText.text = `Game full! (${playerCount}/2) - Starting soon...`;
    this.statusText.style.fill = '#4CAF50';
  }
}

 /**
  * Start waiting animation
  */
 startWaitingAnimation() {
   console.log('⏳ WaitingRoom: Starting waiting animation');
   
   // Gentle pulsing animation for the whole room
   this.waitingAnimation = gsap.to(this.panel, {
     alpha: 0.8,
     duration: 2,
     yoyo: true,
     repeat: -1,
     ease: "sine.inOut"
   });

   // Floating animation for status text
   gsap.to(this.statusText, {
     y: "+=5",
     duration: 1.5,
     yoyo: true,
     repeat: -1,
     ease: "sine.inOut"
   });
 }

 /**
  * Stop waiting animation
  */
 stopWaitingAnimation() {
   console.log('⏳ WaitingRoom: Stopping waiting animation');
   
   if (this.waitingAnimation) {
     this.waitingAnimation.kill();
     this.waitingAnimation = null;
   }
   
   // Reset alpha
   gsap.to(this.panel, { alpha: 1, duration: 0.3 });
   
   // Kill status text animation
   gsap.killTweensOf(this.statusText);
 }

 /**
  * Reset waiting room state
  */
 reset() {
   console.log('⏳ WaitingRoom: Resetting...');

   // Clear game ID
   this.gameId = '';
   this.gameIdText.text = 'Game ID: ';

   // Clear players
   this.players = [];
   this.playersContainer.removeChildren();

   // Reset status text
   this.statusText.text = 'Waiting for players...';

   // Stop any ongoing animations
   this.stopWaitingAnimation();
   gsap.killTweensOf(this.gameIdText);
 }

 /**
  * Cleanup
  */
 destroy() {
   console.log('⏳ WaitingRoom: Destroying...');

   this.stopWaitingAnimation();

   // Kill all animations
   gsap.killTweensOf([this, this.panel, this.statusText, this.gameIdText]);

   super.destroy();
 }
}

export default WaitingRoom;
      