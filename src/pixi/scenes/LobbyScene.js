// src/pixi/scenes/LobbyScene.js

import { Container, Text, TextStyle } from 'pixi.js'; // Refactored import
import { gsap } from 'gsap';
import eventBus from '../../utils/EventBus';
import CreateGamePanel from '../components/lobby/CreateGamePanel';
import JoinGamePanel from '../components/lobby/JoinGamePanel';
import WaitingRoom from '../components/lobby/WaitingRoom';
import LobbyBackground from '../components/lobby/LobbyBackground';

/**
 * LobbyScene - Main lobby interface with animated panels
 * Uses 1200×800 base coordinate system (scaled by PixiApp)
 */
class LobbyScene extends Container { // Refactored inheritance
    constructor() {
        super();

        // Base design dimensions (PixiApp handles scaling)
        this.BASE_WIDTH = 1200;
        this.BASE_HEIGHT = 800;

        this.currentState = 'menu'; // 'menu', 'waiting'
        this.background = null;
        this.titleText = null;
        this.createGamePanel = null;
        this.joinGamePanel = null;
        this.waitingRoom = null;

        console.log('🏠 LobbyScene created (1200×800 base)');

        this.setupScene();
        this.setupEventListeners();
    }

    /**
     * Setup the lobby scene
     */
    setupScene() {
        // Create animated background
        this.background = new LobbyBackground();
        this.addChild(this.background);

        // Create title
        this.createTitle();

        // Create game panels (positioned in base coordinate system)
        this.createGamePanel = new CreateGamePanel();
        // Left panel: 200px from left (16.7% of width)
        this.createGamePanel.x = this.BASE_WIDTH * 0.167;  // 200
        this.createGamePanel.y = this.BASE_HEIGHT * 0.375;  // 300 (37.5% from top)
        this.addChild(this.createGamePanel);

        this.joinGamePanel = new JoinGamePanel();
        // Right panel: 700px from left (58.3% of width)
        this.joinGamePanel.x = this.BASE_WIDTH * 0.583;  // 700
        this.joinGamePanel.y = this.BASE_HEIGHT * 0.375;  // 300
        this.addChild(this.joinGamePanel);

        // Create waiting room (hidden initially)
        this.waitingRoom = new WaitingRoom();
        // Centered horizontally, slightly above center vertically
        this.waitingRoom.x = this.BASE_WIDTH * 0.25;  // 300 (25% from left)
        this.waitingRoom.y = this.BASE_HEIGHT * 0.3125;  // 250 (31.25% from top)
        this.waitingRoom.visible = false;
        this.addChild(this.waitingRoom);

        // Set initial positions for entrance animation
        this.setInitialPositions();
    }

    /**
     * Create the title text
     */
    createTitle() {
        // Create title text with PIXI v8+ API
        const titleStyle = new TextStyle({
            fontFamily: 'Arial, sans-serif',
            fontSize: 72,
            fontWeight: 'bold',
            fill: '#ffd700',
            stroke: {
                color: '#000000',
                width: 4
            },
            dropShadow: {
                color: '#000000',
                blur: 10,
                angle: Math.PI / 4,
                distance: 8
            }
        });

        this.titleText = new Text({
            text: '🎲 LUDO!',
            style: titleStyle
        });

        this.titleText.anchor.set(0.5);
        // Position in base coordinate system (centered horizontally)
        this.titleText.x = this.BASE_WIDTH / 2;  // 600
        this.titleText.y = this.BASE_HEIGHT * 0.15;  // 120 (15% from top)

        this.addChild(this.titleText);
    }    /**
     * Set initial positions for entrance animation
     */
    setInitialPositions() {
        // Store final positions for animation
        this._finalTitleY = this.BASE_HEIGHT * 0.15;  // 120
        this._finalCreatePanelX = this.BASE_WIDTH * 0.167;  // 200
        this._finalJoinPanelX = this.BASE_WIDTH * 0.583;  // 700

        // CRITICAL: Ensure all elements are fully visible by default
        // onShow() will hide and animate them if called
        this.titleText.alpha = 1;
        this.createGamePanel.alpha = 1;
        this.joinGamePanel.alpha = 1;
        this.background.alpha = 1;
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Game creation events
        eventBus.subscribe('lobby.game.created', (data) => {
            console.log('🏠 LobbyScene: Game created, showing waiting room');
            this.showWaitingRoom(data.gameId);
        });

        eventBus.subscribe('lobby.game.joined', (data) => {
            console.log('🏠 LobbyScene: Joined game, showing waiting room');
            this.showWaitingRoom(data.gameId);
        });

        // Leave game event
        eventBus.subscribe('game.left', () => {
            console.log('🏠 LobbyScene: Player left game, returning to menu');
            this.showMainMenu();
        });

        // Game start event
        eventBus.subscribe('game.state.updated', (data) => {
            if (data.newState && data.newState.gameStatus === 'IN_PROGRESS') {
                console.log('🏠 LobbyScene: Game starting, preparing exit animation');
                this.prepareGameTransition();
            }
        });

        // Error events
        eventBus.subscribe('game.error', (data) => {
            console.log('🏠 LobbyScene: Game error, showing error');
            this.showError(data.error);
        });

        // Connection events
        eventBus.subscribe('game.connection.lost', () => {
            console.log('🏠 LobbyScene: Connection lost');
            this.showConnectionLost();
        });
    }

    /**
     * Scene entrance animation
     */
    async onShow() {
        // Reset to initial state
        this.currentState = 'menu';
        this.waitingRoom.visible = false;
        this.createGamePanel.visible = true;
        this.joinGamePanel.visible = true;

        // Set initial positions for animation (NOW, not in constructor)
        this.titleText.y = -100;
        this.titleText.alpha = 0;
        this.createGamePanel.x = -400;
        this.createGamePanel.alpha = 0;
        this.joinGamePanel.x = this.BASE_WIDTH + 400;  // 1600
        this.joinGamePanel.alpha = 0;
        this.background.alpha = 0;

        // Create entrance timeline
        const timeline = gsap.timeline();

        // Background fade in
        timeline.to(this.background, {
            alpha: 1,
            duration: 0.5
        });

        // Title drop down and fade in
        timeline.to(this.titleText, {
            y: this._finalTitleY || this.BASE_HEIGHT * 0.15,  // 120
            alpha: 1,
            duration: 0.8,
            ease: "bounce.out"
        }, "-=0.3");

        // Panels slide in from sides
        timeline.to(this.createGamePanel, {
            x: this._finalCreatePanelX || this.BASE_WIDTH * 0.167,  // 200
            alpha: 1,
            duration: 0.6,
            ease: "power2.out"
        }, "-=0.4");

        timeline.to(this.joinGamePanel, {
            x: this._finalJoinPanelX || this.BASE_WIDTH * 0.583,  // 700
            alpha: 1,
            duration: 0.6,
            ease: "power2.out"
        }, "-=0.4");

        // Add subtle floating animation to title
        gsap.to(this.titleText, {
            y: "+=10",
            duration: 2,
            yoyo: true,
            repeat: -1,
            ease: "sine.inOut"
        });

        return new Promise(resolve => {
            timeline.call(resolve);
        });
    }

    /**
     * Scene exit animation
     */
    async onHide() {
        console.log('🏠 LobbyScene: Hiding with animation');

        // Kill ongoing animations
        gsap.killTweensOf([this.titleText, this.createGamePanel, this.joinGamePanel]);

        // Quick fade out
        await new Promise(resolve => {
            gsap.to(this, {
                alpha: 0,
                duration: 0.3,
                onComplete: resolve
            });
        });

        // Reset alpha for next time
        this.alpha = 1;
    }

    /**
     * Show waiting room when game is created/joined
     */
    showWaitingRoom(gameId) {
        if (this.currentState === 'waiting') return;

        this.currentState = 'waiting';
        console.log('🏠 LobbyScene: Transitioning to waiting room');

        // Set waiting room data
        this.waitingRoom.setGameId(gameId);
        this.waitingRoom.visible = true;

        // Animate transition
        const timeline = gsap.timeline();

        // Slide out menu panels
        timeline.to(this.createGamePanel, {
            x: -400,  // Off-screen left
            alpha: 0,
            duration: 0.5,
            ease: "power2.in"
        });

        timeline.to(this.joinGamePanel, {
            x: this.BASE_WIDTH + 400,  // 1600 (off-screen right)
            alpha: 0,
            duration: 0.5,
            ease: "power2.in"
        }, "-=0.5");

        // Hide panels and show waiting room
        timeline.call(() => {
            this.createGamePanel.visible = false;
            this.joinGamePanel.visible = false;
            this.waitingRoom.alpha = 0;
            this.waitingRoom.y = this.BASE_HEIGHT * 0.4375; // 350 (start below)
        });

        // Slide in waiting room
        timeline.to(this.waitingRoom, {
            alpha: 1,
            y: this.BASE_HEIGHT * 0.3125,  // 250
            duration: 0.6,
            ease: "power2.out"
        });

        // Start waiting room animations
        timeline.call(() => {
            this.waitingRoom.startWaitingAnimation();
        });
    }

    /**
     * Return to main menu (if game creation fails, etc.)
     */
    showMainMenu() {
        if (this.currentState === 'menu') return;

        console.log('🏠 LobbyScene: Returning to main menu');
        this.currentState = 'menu';

        // Hide waiting room
        gsap.to(this.waitingRoom, {
            alpha: 0,
            duration: 0.3,
            onComplete: () => {
                this.waitingRoom.visible = false;
                this.waitingRoom.stopWaitingAnimation();
                this.waitingRoom.reset(); // Clear waiting room state
            }
        });

        // Reset and show menu panels
        this.joinGamePanel.reset(); // Clear join game input
        this.createGamePanel.resetToIdle(); // Clear create game code/status
        this.createGamePanel.visible = true;
        this.joinGamePanel.visible = true;

        // Animate panels back in
        gsap.to(this.createGamePanel, {
            x: this.BASE_WIDTH * 0.167,  // 200
            alpha: 1,
            duration: 0.5,
            ease: "power2.out"
        });

        gsap.to(this.joinGamePanel, {
            x: this.BASE_WIDTH * 0.583,  // 700
            alpha: 1,
            duration: 0.5,
            ease: "power2.out"
        });
    }

    /**
     * Prepare for game transition
     */
    prepareGameTransition() {
        console.log('🏠 LobbyScene: Preparing for game transition');
        
        // Stop all animations
        this.waitingRoom.stopWaitingAnimation();
        
        // Add exit effects here if needed
        eventBus.emit('pixi.scene.change', { scene: 'game' });
    }

    /**
     * Show error message
     */
    showError(errorMessage) {
        console.log('🏠 LobbyScene: Showing error:', errorMessage);
        
        // Create temporary error text (PIXI v8+ API)
        const errorStyle = new TextStyle({
            fontFamily: 'Arial, sans-serif',
            fontSize: 24,
            fill: '#ff4444',
            stroke: {
                color: '#ffffff',
                width: 2
            }
        });

        // Use PIXI v8+ Text API
        const errorText = new Text({
            text: `Error: ${errorMessage}`,
            style: errorStyle
        });
        errorText.anchor.set(0.5);
        // Position at bottom center in base coordinates
        errorText.x = this.BASE_WIDTH / 2;  // 600 (centered)
        errorText.y = this.BASE_HEIGHT * 0.875;  // 700 (87.5% from top)
        errorText.alpha = 0;
        this.addChild(errorText);

        // Animate error in and out
        const timeline = gsap.timeline();
        timeline.to(errorText, { alpha: 1, duration: 0.3 });
        timeline.to(errorText, { alpha: 0, duration: 0.3, delay: 3 });
        timeline.call(() => {
            this.removeChild(errorText);
            errorText.destroy();
        });
    }

    /**
     * Show connection lost message
     */
    showConnectionLost() {
        console.log('🏠 LobbyScene: Connection lost');
        this.showError('Connection lost. Please refresh the page.');
    }

    /**
     * Cleanup
     */
    destroy() {
        console.log('🏠 LobbyScene: Destroying...');

        // Kill all animations
        gsap.killTweensOf([this, this.titleText, this.createGamePanel, this.joinGamePanel, this.waitingRoom]);

        // Destroy children
        if (this.background) this.background.destroy();
        if (this.createGamePanel) this.createGamePanel.destroy();
        if (this.joinGamePanel) this.joinGamePanel.destroy();
        if (this.waitingRoom) this.waitingRoom.destroy();

        super.destroy();
    }
}

export default LobbyScene;