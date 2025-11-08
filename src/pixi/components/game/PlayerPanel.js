

import * as PIXI from 'pixi.js';
import { gsap } from 'gsap';

/**
 * PlayerPanel - Display player information and statistics
 * Shows player name, color, pieces status, and turn indicator
 */
class PlayerPanel extends PIXI.Container {
  constructor(options = {}) {
    super();
    
    this.color = options.color || 'red';
    this.width = options.width || 200;
    this.height = options.height || 150;
    
    this.playerData = null;
    this.isHighlighted = false;
    this.isCurrentTurn = false;
    
    // Visual elements
    this.background = null;
    this.border = null;
    this.playerNameText = null;
    this.turnIndicator = null;
    this.piecesStatusContainer = null;
    this.statsContainer = null;
    
    console.log(`👤 PlayerPanel created for ${this.color}`);
    
    this.createPanel();
  }

  /**
   * Create the panel visual elements
   */
  createPanel() {
    this.createBackground();
    this.createHeader();
    this.createPiecesStatus();
    this.createStats();
    this.createTurnIndicator();
  }

  /**
   * Create panel background
   */
  createBackground() {
    const colors = {
      red: 0xff6b6b,
      blue: 0x4dabf7,
      green: 0x51cf66,
      yellow: 0xffd43b
    };
    
    // Main background
    this.background = new PIXI.Graphics();
    this.background.roundRect(0, 0, this.width, this.height, 10);
    this.background.fill({ color: colors[this.color], alpha: 0.2 });
    this.addChild(this.background);
    
    // Border
    this.border = new PIXI.Graphics();
    this.border.roundRect(0, 0, this.width, this.height, 10);
    this.border.stroke({ color: colors[this.color], width: 2 });
    this.addChild(this.border);
  }

  /**
   * Create panel header with player name
   */
  createHeader() {
    // Player name
    this.playerNameText = new PIXI.Text(this.color.toUpperCase(), {
      fontFamily: 'Arial, sans-serif',
      fontSize: 18,
      fontWeight: 'bold',
      fill: this.getPlayerColor(),
      align: 'center'
    });
    this.playerNameText.x = 10;
    this.playerNameText.y = 10;
    this.addChild(this.playerNameText);
    
    // Player color indicator
    const colorIndicator = new PIXI.Graphics();
    colorIndicator.circle(this.width - 25, 25, 12);
    colorIndicator.fill({ color: this.getPlayerColor() });
    colorIndicator.stroke({ color: 0xffffff, width: 2 });
    this.addChild(colorIndicator);
  }

  /**
   * Create pieces status display
   */
  createPiecesStatus() {
    this.piecesStatusContainer = new PIXI.Container();
    this.piecesStatusContainer.y = 40;
    
    // Title
    const statusTitle = new PIXI.Text('Pieces:', {
      fontFamily: 'Arial, sans-serif',
      fontSize: 12,
      fill: '#666666',
      align: 'left'
    });
    statusTitle.x = 10;
    statusTitle.y = 0;
    this.piecesStatusContainer.addChild(statusTitle);
    
    // Create 4 piece indicators
    for (let i = 0; i < 4; i++) {
      const pieceIndicator = this.createPieceIndicator(i);
      pieceIndicator.x = 10 + (i * 35);
      pieceIndicator.y = 20;
      this.piecesStatusContainer.addChild(pieceIndicator);
    }
    
    this.addChild(this.piecesStatusContainer);
  }

  /**
   * Create individual piece indicator
   */
  createPieceIndicator(index) {
    const container = new PIXI.Container();
    container.name = `piece_${index}`;
    
    // Piece circle
    const piece = new PIXI.Graphics();
    piece.circle(0, 0, 10);
    piece.fill({ color: this.getPlayerColor(), alpha: 0.6 });
    piece.stroke({ color: 0xffffff, width: 1 });
    
    // Status indicator (home/path/finished)
    const statusRing = new PIXI.Graphics();
    statusRing.circle(0, 0, 12);
    statusRing.stroke({ color: 0x999999, width: 2 });
    statusRing.name = 'statusRing';
    
    container.addChild(statusRing);
    container.addChild(piece);
    
    // Store references
    container.piece = piece;
    container.statusRing = statusRing;
    container.status = 'home'; // home, path, finished
    
    return container;
  }

  /**
   * Create stats section
   */
  createStats() {
    this.statsContainer = new PIXI.Container();
    this.statsContainer.y = 90;
    
    // Stats background
    const statsBg = new PIXI.Graphics();
    statsBg.roundRect(5, 0, this.width - 10, 50, 5);
    statsBg.fill({ color: 0x000000, alpha: 0.1 });
    this.statsContainer.addChild(statsBg);
    
    // Create stat displays
    this.movesText = new PIXI.Text('Moves: 0', {
      fontFamily: 'Arial, sans-serif',
      fontSize: 11,
      fill: '#333333'
    });
    this.movesText.x = 10;
    this.movesText.y = 8;
    this.statsContainer.addChild(this.movesText);
    
    this.capturesText = new PIXI.Text('Captures: 0', {
      fontFamily: 'Arial, sans-serif',
      fontSize: 11,
      fill: '#333333'
    });
    this.capturesText.x = 10;
    this.capturesText.y = 25;
    this.statsContainer.addChild(this.capturesText);
    
    this.statusText = new PIXI.Text('Waiting...', {
      fontFamily: 'Arial, sans-serif',
      fontSize: 10,
      fill: '#666666',
      fontStyle: 'italic'
    });
    this.statusText.x = this.width - 10;
    this.statusText.y = 8;
    this.statusText.anchor.x = 1;
    this.statsContainer.addChild(this.statusText);
    
    this.addChild(this.statsContainer);
  }

  /**
   * Create turn indicator
   */
  createTurnIndicator() {
    this.turnIndicator = new PIXI.Container();
    this.turnIndicator.visible = false;
    
    // Animated border for current turn
    const glowBorder = new PIXI.Graphics();
    glowBorder.roundRect(-5, -5, this.width + 10, this.height + 10, 15);
    glowBorder.stroke({ color: 0xffffff, width: 4 });
    this.turnIndicator.addChild(glowBorder);
    
    // Turn text
    const turnText = new PIXI.Text('YOUR TURN', {
      fontFamily: 'Arial, sans-serif',
      fontSize: 12,
      fontWeight: 'bold',
      fill: '#ffffff',
      align: 'center'
    });
    turnText.anchor.set(0.5);
    turnText.x = this.width / 2;
    turnText.y = -15;
    this.turnIndicator.addChild(turnText);
    
    this.addChild(this.turnIndicator);
    
    // Store reference to glow border for animation
    this.glowBorder = glowBorder;
  }

  /**
   * Get player color hex value
   */
  getPlayerColor() {
    const colors = {
      red: 0xff4444,
      blue: 0x4444ff,
      green: 0x44ff44,
      yellow: 0xffdd44
    };
    return colors[this.color] || 0xffffff;
  }

  /**
   * Update player data
   */
  updatePlayerData(playerData) {
    this.playerData = playerData;
    
    if (!playerData) return;
    
    // Update player name if provided
    if (playerData.name) {
      this.playerNameText.text = playerData.name.toUpperCase();
    }
    
    // Update pieces status
    if (playerData.pieces) {
      this.updatePiecesStatus(playerData.pieces);
    }
    
    // Update statistics
    if (playerData.stats) {
      this.updateStats(playerData.stats);
    }
    
    // Update status
    if (playerData.status) {
      this.updateStatus(playerData.status);
    }
    
    console.log(`👤 ${this.color} panel updated`);
  }

  /**
   * Update pieces status indicators
   */
  updatePiecesStatus(piecesData) {
    piecesData.forEach((pieceData, index) => {
      const indicator = this.piecesStatusContainer.getChildByName(`piece_${index}`);
      if (indicator) {
        this.updatePieceIndicator(indicator, pieceData);
      }
    });
  }

  /**
   * Update individual piece indicator
   */
  updatePieceIndicator(indicator, pieceData) {
    const newStatus = this.getPieceStatus(pieceData);
    
    if (indicator.status !== newStatus) {
      indicator.status = newStatus;
      
      // Update visual based on status
      const colors = {
        home: 0x999999,      // Gray for home
        path: 0xffd700,      // Gold for on path
        finished: 0x00ff00   // Green for finished
      };
      
      const statusColor = colors[newStatus] || 0x999999;
      
      // Animate color change
      gsap.to(indicator.statusRing, {
        tint: statusColor,
        duration: 0.5,
        ease: "power2.out"
      });
      
      // Update piece opacity
      const alpha = newStatus === 'home' ? 0.6 : 1.0;
      gsap.to(indicator.piece, {
        alpha: alpha,
        duration: 0.3
      });
      
      // Special animation for finishing
      if (newStatus === 'finished') {
        this.animatePieceFinished(indicator);
      }
    }
  }

  /**
   * Get piece status from piece data
   */
  getPieceStatus(pieceData) {
    if (pieceData.isFinished) return 'finished';
    if (pieceData.isInHome) return 'home';
    return 'path';
  }

  /**
   * Animate piece finishing
   */
  animatePieceFinished(indicator) {
    // Celebrate with scale and glow animation
    gsap.fromTo(indicator.scale,
      { x: 1, y: 1 },
      { 
        x: 1.3, 
        y: 1.3, 
        duration: 0.3, 
        yoyo: true, 
        repeat: 1,
        ease: "power2.out"
      }
    );
    
    // Glow effect
    gsap.to(indicator.piece, {
      tint: 0xffffff,
      duration: 0.2,
      yoyo: true,
      repeat: 3
    });
  }

  /**
   * Update statistics display
   */
  updateStats(stats) {
    if (stats.moves !== undefined) {
      this.movesText.text = `Moves: ${stats.moves}`;
    }
    
    if (stats.captures !== undefined) {
      this.capturesText.text = `Captures: ${stats.captures}`;
    }
  }

  /**
   * Update status text
   */
  updateStatus(status) {
    const statusTexts = {
      waiting: 'Waiting...',
      playing: 'Playing',
      rolling: 'Rolling dice...',
      moving: 'Moving piece...',
      finished: 'Finished!',
      disconnected: 'Disconnected'
    };
    
    this.statusText.text = statusTexts[status] || status;
    
    // Color code the status
    const statusColors = {
      waiting: 0x999999,
      playing: 0x00aa00,
      rolling: 0xff8800,
      moving: 0x0088ff,
      finished: 0x00ff00,
      disconnected: 0xff0000
    };
    
    this.statusText.style.fill = statusColors[status] || 0x666666;
  }

  /**
   * Set panel as highlighted (current turn)
   */
  setHighlighted(highlighted) {
    if (this.isHighlighted === highlighted) return;
    
    this.isHighlighted = highlighted;
    this.isCurrentTurn = highlighted;
    
    if (highlighted) {
      this.showTurnIndicator();
    } else {
      this.hideTurnIndicator();
    }
  }

  /**
   * Show turn indicator
   */
  showTurnIndicator() {
    this.turnIndicator.visible = true;
    
    // Animate glow border
    gsap.to(this.glowBorder, {
      alpha: 0.8,
      duration: 1,
      yoyo: true,
      repeat: -1,
      ease: "sine.inOut"
    });
    
    // Scale up panel slightly
    gsap.to(this.scale, {
      x: 1.05,
      y: 1.05,
      duration: 0.3,
      ease: "power2.out"
    });
    
    // Update background
    gsap.to(this.background, {
      alpha: 0.4,
      duration: 0.3
    });
  }

  /**
   * Hide turn indicator
   */
  hideTurnIndicator() {
    this.turnIndicator.visible = false;
    
    // Stop glow animation
    gsap.killTweensOf(this.glowBorder);
    
    // Scale back to normal
    gsap.to(this.scale, {
      x: 1,
      y: 1,
      duration: 0.3,
      ease: "power2.out"
    });
    
    // Reset background
    gsap.to(this.background, {
      alpha: 0.2,
      duration: 0.3
    });
  }

  /**
   * Show player connected
   */
  showConnected() {
    this.alpha = 1;
    this.updateStatus('waiting');
    
    // Brief glow to indicate connection
    gsap.to(this.border, {
      alpha: 1,
      duration: 0.3,
      yoyo: true,
      repeat: 1
    });
  }

  /**
   * Show player disconnected
   */
  showDisconnected() {
    this.alpha = 0.5;
    this.updateStatus('disconnected');
    
    // Darken the panel
    gsap.to(this.background, {
      alpha: 0.1,
      duration: 0.5
    });
  }

  /**
   * Animate panel entrance
   */
  animateEntrance() {
    // Start from the side and slide in
    const startX = this.x;
    this.x = this.color === 'red' || this.color === 'yellow' ? -this.width : 1200;
    this.alpha = 0;
    
    gsap.to(this, {
      x: startX,
      alpha: 1,
      duration: 0.8,
      ease: "power2.out"
    });
    
    // Animate pieces indicators
    for (let i = 0; i < 4; i++) {
      const indicator = this.piecesStatusContainer.getChildByName(`piece_${i}`);
      if (indicator) {
        indicator.scale.set(0);
        gsap.to(indicator.scale, {
          x: 1,
          y: 1,
          duration: 0.4,
          delay: 0.5 + i * 0.1,
          ease: "back.out(1.7)"
        });
      }
    }
  }

  /**
   * Show win celebration
   */
  showWinCelebration() {
    // Winner glow effect
    const celebration = gsap.timeline({ repeat: 3 });
    
    celebration.to(this.background, {
      alpha: 0.8,
      duration: 0.3
    });
    
    celebration.to(this.border, {
      tint: 0xffd700, // Gold tint
      duration: 0.3
    }, 0);
    
    celebration.to(this.scale, {
      x: 1.1,
      y: 1.1,
      duration: 0.3,
      yoyo: true,
      repeat: 1
    }, 0);
    
    // Update status
    this.updateStatus('finished');
    
    // Show winner text
    const winnerText = new PIXI.Text('WINNER!', {
      fontFamily: 'Arial, sans-serif',
      fontSize: 16,
      fontWeight: 'bold',
      fill: 0xffd700,
      align: 'center'
    });
    winnerText.anchor.set(0.5);
    winnerText.x = this.width / 2;
    winnerText.y = this.height / 2;
    winnerText.alpha = 0;
    
    this.addChild(winnerText);
    
    gsap.to(winnerText, {
      alpha: 1,
      duration: 0.5,
      delay: 1
    });
  }

  /**
   * Get panel info for external use
   */
  getPanelInfo() {
    return {
      color: this.color,
      isHighlighted: this.isHighlighted,
      isCurrentTurn: this.isCurrentTurn,
      playerData: this.playerData
    };
  }

  /**
   * Cleanup
   */
  destroy() {
    console.log(`👤 PlayerPanel (${this.color}): Destroying...`);
    
    // Kill all animations
    gsap.killTweensOf([
      this, 
      this.scale, 
      this.background, 
      this.border, 
      this.glowBorder
    ]);
    
    super.destroy();
  }
}

export default PlayerPanel;