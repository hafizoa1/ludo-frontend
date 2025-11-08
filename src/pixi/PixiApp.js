
import * as PIXI from 'pixi.js';
import SceneManager from './SceneManager';
import eventBus from '../utils/EventBus';

/**
 * Main PixiJS Application - Fixed version with better error handling
 * Manages scenes, responsiveness, and game lifecycle
 */
class PixiApp {
  constructor() {
    this.app = null;
    this.sceneManager = null;
    this.initialized = false;
    this.resizeHandler = null;
    this.resizeObserver = null;
    this.dpiMediaQuery = null;
    this.resizeTimeout = null;
    this.dpiCheckInterval = null;
    this.currentDPI = window.devicePixelRatio || 1;
    this.lastContainerSize = { width: 0, height: 0 };

    console.log('🎨 PixiApp created');
  }

  /**
   * Initialize PixiJS application with full lobby system (PIXI v8+)
   */
  async init(container) {
    if (this.initialized) {
      console.warn('PixiApp already initialized');
      return this.app;
    }

    if (!container) {
      console.error('❌ Container is null or undefined');
      return null;
    }

    try {
      // 1. Create PixiJS application instance (v8+ pattern)
      this.app = new PIXI.Application();

      // 2. Initialize the app with options (MUST await in v8+)
      await this.app.init({
        width: 1200,
        height: 800,
        backgroundColor: 0x1a1a2e,
        antialias: true,
        resolution: window.devicePixelRatio || 1,
        autoDensity: true,
      });

      // 3. Verify app and renderer are created
      if (!this.app || !this.app.renderer) {
        throw new Error('PIXI Application or renderer failed to initialize');
      }

      // 4. Get canvas (in v8+ it's always app.canvas)
      const canvas = this.app.canvas;
      if (!canvas) {
        throw new Error('Canvas not available from PIXI application');
      }

      // 5. Add canvas to container
      if (container && canvas) {
        container.innerHTML = '';
        container.appendChild(canvas);
      } else {
        throw new Error('Container or canvas not available for appendChild');
      }

      // 6. Wait for the next frame to ensure the canvas is rendered in the DOM
      await new Promise(resolve => requestAnimationFrame(resolve));

      // 7. Setup responsive canvas
      this.setupResponsiveCanvas(container);

      // 8. Initialize scene manager
      try {
        this.sceneManager = new SceneManager(this.app);
      } catch (sceneError) {
        console.error('❌ SceneManager creation failed:', sceneError);
        throw sceneError;
      }

      // 9. Setup global event listeners
      this.setupEventListeners();

      // 10. Start with lobby scene
      try {
        await this.sceneManager.showScene('lobby');
      } catch (sceneError) {
        console.error('❌ Failed to load lobby scene:', sceneError);
        throw sceneError;
      }

      this.initialized = true;
      

      

      eventBus.emit('pixi.initialized', { app: this.app });

      return this.app;
    } catch (error) {
      console.error('❌ PixiJS v8+ initialization failed:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        app: this.app,
        renderer: this.app?.renderer,
        canvas: this.app?.canvas
      });
      
      // Clean up on failure
      if (this.app) {
        try {
          this.app.destroy();
        } catch (destroyError) {
          console.warn('Error cleaning up failed app:', destroyError);
        }
        this.app = null;
      }
      
      this.initialized = false;
      throw error;
    }
  }

  /**
   * Alternative initialization method for older PIXI versions
   */
  async initLegacy(container) {
    if (this.initialized) {
      console.warn('PixiApp already initialized');
      return this.app;
    }

    if (!container) {
      console.error('❌ Container is null or undefined');
      return null;
    }

    console.log('🎨 Initializing PixiJS (Legacy mode)...');

    try {
      // For older PIXI versions, use the constructor with options directly
      this.app = new PIXI.Application({
        width: 1200,
        height: 800,
        backgroundColor: 0x1a1a2e,
        antialias: true,
        resolution: window.devicePixelRatio || 1,
        autoDensity: true,
      });

      // Wait a tick for initialization
      await new Promise(resolve => setTimeout(resolve, 0));

      console.log('✅ PIXI Application created (Legacy)');
      console.log('App renderer:', this.app.renderer);

      if (!this.app || !this.app.renderer) {
        throw new Error('PIXI Application or renderer failed to initialize');
      }

      // Get canvas
      const canvas = this.app.view || this.app.canvas;
      if (!canvas) {
        throw new Error('Canvas not available from PIXI application');
      }

      // Add canvas to container
      container.appendChild(canvas);
      console.log('✅ Canvas added to container (Legacy)');

      // Continue with rest of initialization...
      await new Promise(resolve => requestAnimationFrame(resolve));
      
      this.setupResponsiveCanvas(container);
      this.sceneManager = new SceneManager(this.app);
      this.setupEventListeners();
      await this.sceneManager.showScene('lobby');

      this.initialized = true;
      console.log('✅ PixiJS initialized with lobby system (Legacy)');

      eventBus.emit('pixi.initialized', { app: this.app });
      return this.app;

    } catch (error) {
      console.error('❌ PixiJS initialization failed (Legacy):', error);
      this.initialized = false;
      throw error;
    }
  }

  /**
   * Setup responsive canvas resizing with monitor/DPI change detection
   */
  setupResponsiveCanvas(container) {
    if (!this.app || !this.app.renderer || !container) {
      console.warn('Cannot setup responsive canvas - missing dependencies');
      return;
    }

    const resize = () => {
      try {
        if (!this.app || !this.app.renderer || !container) return;

        const containerRect = container.getBoundingClientRect();
        const containerWidth = containerRect.width || window.innerWidth;
        const containerHeight = containerRect.height || window.innerHeight;

        // Design aspect ratio (3:2)
        const baseWidth = 1200;
        const baseHeight = 800;
        const designAspectRatio = baseWidth / baseHeight; // 1.5

        // Calculate dimensions that fit in container while maintaining aspect ratio
        let rendererWidth, rendererHeight;
        const containerAspectRatio = containerWidth / containerHeight;

        if (containerAspectRatio > designAspectRatio) {
          // Container is wider than design - fit to height
          rendererHeight = containerHeight;
          rendererWidth = rendererHeight * designAspectRatio;
        } else {
          // Container is taller than design - fit to width
          rendererWidth = containerWidth;
          rendererHeight = rendererWidth / designAspectRatio;
        }

        // Check if DPI changed (moving between monitors)
        const currentDPI = window.devicePixelRatio || 1;
        if (currentDPI !== this.currentDPI) {
          console.log(`🖥️ DPI changed: ${this.currentDPI} → ${currentDPI}`);
          this.currentDPI = currentDPI;

          // Update renderer resolution for new display
          this.app.renderer.resolution = currentDPI;
        }

        // Resize the PixiJS renderer to the calculated size
        this.app.renderer.resize(rendererWidth, rendererHeight);

        // Calculate scale factor for scene elements
        const scale = Math.min(rendererWidth / baseWidth, rendererHeight / baseHeight);

        // Apply scale to stage so our 1200×800 design fits perfectly
        this.app.stage.scale.set(scale);

        // Center the stage within the renderer
        this.app.stage.x = (rendererWidth - baseWidth * scale) / 2;
        this.app.stage.y = (rendererHeight - baseHeight * scale) / 2;

        // Get canvas and center it in container using CSS
        const canvas = this.app.canvas;
        canvas.style.display = 'block';
        canvas.style.position = 'absolute';
        canvas.style.left = '50%';
        canvas.style.top = '50%';
        canvas.style.transform = 'translate(-50%, -50%)';

        // Emit resize event for scenes to handle
        eventBus.emit('pixi.resize', {
          width: rendererWidth,
          height: rendererHeight,
          scale,
          baseWidth,
          baseHeight,
          dpi: currentDPI
        });
      } catch (error) {
        console.error('❌ Resize error:', error);
      }
    };

    // Debounced resize handler for performance
    const debouncedResize = () => {
      if (this.resizeTimeout) {
        clearTimeout(this.resizeTimeout);
      }

      this.resizeTimeout = setTimeout(() => {
        resize();
        this.resizeTimeout = null;
      }, 100);
    };

    // CRITICAL: Do initial resize IMMEDIATELY (synchronously)
    // This ensures the stage is scaled BEFORE any scenes are added
    resize();

    // 1. Listen for window resize events (traditional method)
    this.resizeHandler = debouncedResize;
    window.addEventListener('resize', this.resizeHandler);

    // 2. Use ResizeObserver for container size changes (catches monitor moves)
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          if (entry.target === container) {
            const newWidth = entry.contentRect.width;
            const newHeight = entry.contentRect.height;

            // Check if size actually changed
            if (newWidth !== this.lastContainerSize.width ||
                newHeight !== this.lastContainerSize.height) {
              console.log('📐 Container size changed via ResizeObserver:',
                `${this.lastContainerSize.width}x${this.lastContainerSize.height} → ${newWidth}x${newHeight}`);

              this.lastContainerSize = { width: newWidth, height: newHeight };

              // For significant changes, resize immediately without debounce
              resize();
            }
          }
        }
      });

      this.resizeObserver.observe(container);
      console.log('✅ ResizeObserver attached to container');
    } else {
      console.warn('⚠️ ResizeObserver not supported in this browser');
    }

    // 3. Monitor DPI changes using matchMedia (for high-DPI display switches)
    this.setupDPIMonitoring(debouncedResize);

    // 4. Poll for DPI changes every 500ms (fallback for browsers that don't fire events)
    this.startDPIPolling(resize);
  }

  /**
   * Setup DPI change detection for monitor switches
   */
  setupDPIMonitoring(resizeCallback) {
    // Create a media query that watches for devicePixelRatio changes
    const updateDPIListener = () => {
      const currentDPI = window.devicePixelRatio || 1;

      // Remove old listener if it exists
      if (this.dpiMediaQuery) {
        this.dpiMediaQuery.removeEventListener('change', this.dpiChangeHandler);
      }

      // Create new media query for current DPI
      const mqString = `(resolution: ${currentDPI}dppx)`;
      this.dpiMediaQuery = window.matchMedia(mqString);

      // Handler for DPI changes
      this.dpiChangeHandler = () => {
        console.log('🖥️ Display DPI changed - updating canvas');
        resizeCallback();
        updateDPIListener(); // Re-setup for new DPI
      };

      this.dpiMediaQuery.addEventListener('change', this.dpiChangeHandler);
    };

    // Check if matchMedia is supported
    if (typeof window.matchMedia !== 'undefined') {
      updateDPIListener();
      console.log('✅ DPI monitoring enabled');
    } else {
      console.warn('⚠️ matchMedia not supported - DPI monitoring disabled');
    }
  }

  /**
   * Poll for DPI changes as a fallback mechanism
   * Some browsers/OS combinations don't fire events when moving between monitors
   */
  startDPIPolling(resizeCallback) {
    // Check DPI every 500ms
    this.dpiCheckInterval = setInterval(() => {
      const currentDPI = window.devicePixelRatio || 1;

      if (currentDPI !== this.currentDPI) {
        console.log('🖥️ DPI change detected via polling:', this.currentDPI, '→', currentDPI);
        this.currentDPI = currentDPI;
        resizeCallback();
      }
    }, 500);

    console.log('✅ DPI polling started (500ms interval)');
  }

  /**
   * Setup global event listeners for game lifecycle
   */
  setupEventListeners() {
    // Listen for scene change requests
    eventBus.subscribe('pixi.scene.change', (data) => {
      this.sceneManager.showScene(data.scene, data.options);
    });

    // Listen for game lifecycle events
    eventBus.subscribe('lobby.game.created', () => {
      // Could add global effects here (screen flash, etc.)
    });

    eventBus.subscribe('lobby.game.joined', () => {
      // Could add global effects here
    });

    // Listen for game state updates to trigger scene transitions
    eventBus.subscribe('game.state.updated', (data) => {
      if (data.newState && data.newState.gameStatus === 'IN_PROGRESS') {
        // Transition to game scene
        this.sceneManager.showScene('game');
      }
    });

    // Listen for connection status
    eventBus.subscribe('game.connection.established', () => {
      // Could show connection indicator
    });

    eventBus.subscribe('game.connection.lost', () => {
      // Could show connection lost overlay
    });

    // Listen for errors
    eventBus.subscribe('game.error', (data) => {
      console.error('❌ Game error:', data.error);
      // Could show error overlay
    });
  }

  /**
   * Get current scene
   */
  getCurrentScene() {
    return this.sceneManager?.getCurrentScene();
  }

  /**
   * Get PixiJS app instance
   */
  getApp() {
    return this.app;
  }

  /**
   * Get scene manager
   */
  getSceneManager() {
    return this.sceneManager;
  }

  /**
   * Add global loading overlay
   */
  showLoading(message = 'Loading...') {
    if (!this.app || !this.app.stage) return;
    
    this.hideLoading(); // Remove existing loading

    const overlay = new PIXI.Container();
    overlay.name = 'loadingOverlay';

    // Semi-transparent background
    const bg = new PIXI.Graphics();
    bg.beginFill(0x000000, 0.7);
    bg.drawRect(0, 0, 1200, 800);
    bg.endFill();
    overlay.addChild(bg);

    // Loading text
    const loadingText = new PIXI.Text(message, {
      fontFamily: 'Arial',
      fontSize: 32,
      fill: '#ffffff',
      align: 'center'
    });
    loadingText.anchor.set(0.5);
    loadingText.x = 600;
    loadingText.y = 400;
    overlay.addChild(loadingText);

    // Simple loading animation
    this.app.ticker.add(function loadingAnimation() {
      loadingText.alpha = 0.5 + Math.sin(Date.now() * 0.005) * 0.5;
    });

    this.app.stage.addChild(overlay);
  }

  /**
   * Remove global loading overlay
   */
  hideLoading() {
    if (!this.app || !this.app.stage) return;
    
    const existingOverlay = this.app.stage.getChildByName('loadingOverlay');
    if (existingOverlay) {
      this.app.stage.removeChild(existingOverlay);
      existingOverlay.destroy();
    }
  }

  /**
   * Cleanup and destroy
   */
  destroy() {
    console.log('🎨 Destroying PixiApp...');

    try {
      // Clear any pending resize timeout
      if (this.resizeTimeout) {
        clearTimeout(this.resizeTimeout);
        this.resizeTimeout = null;
      }

      // Stop DPI polling interval
      if (this.dpiCheckInterval) {
        clearInterval(this.dpiCheckInterval);
        this.dpiCheckInterval = null;
        console.log('✅ DPI polling stopped');
      }

      // Remove window resize listener
      if (this.resizeHandler) {
        window.removeEventListener('resize', this.resizeHandler);
        this.resizeHandler = null;
      }

      // Disconnect ResizeObserver
      if (this.resizeObserver) {
        this.resizeObserver.disconnect();
        this.resizeObserver = null;
        console.log('✅ ResizeObserver disconnected');
      }

      // Remove DPI monitoring listener
      if (this.dpiMediaQuery && this.dpiChangeHandler) {
        this.dpiMediaQuery.removeEventListener('change', this.dpiChangeHandler);
        this.dpiMediaQuery = null;
        this.dpiChangeHandler = null;
        console.log('✅ DPI monitoring removed');
      }

      // Destroy scene manager
      if (this.sceneManager) {
        this.sceneManager.destroy();
        this.sceneManager = null;
      }

      // Stop ticker and destroy app
      if (this.app) {
        this.app.ticker.stop();
        this.app.destroy(true, {
          children: true,
          texture: true,
          baseTexture: true
        });
        this.app = null;
      }

      this.initialized = false;
      eventBus.emit('pixi.destroyed');
      console.log('✅ PixiApp destroyed successfully');

    } catch (error) {
      console.warn('Error during PixiApp cleanup:', error);
    }
  }
}

// Create singleton instance
const pixiApp = new PixiApp();

export default pixiApp;