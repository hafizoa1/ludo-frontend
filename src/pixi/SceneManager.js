import { gsap } from 'gsap';
import LobbyScene from './scenes/LobbyScene';
//import GameScene from './scenes/GameScene';
import GameScene from './scenes/game-scene/GameScene';
import eventBus from '../utils/EventBus';
import { motion } from './design/tokens';

/**
 * SceneManager - Handles scene transitions and management
 * DEBUG VERSION with detailed logging
 */
class SceneManager {
  constructor(app) {
    console.log('🎬 SceneManager constructor started');
    this.app = app;
    this.currentScene = null;
    this.scenes = new Map();
    this.transitioning = false;
    // A scene created well after the last real resize event (the common
    // case - most resizes happen once, early) never gets another one to
    // react to, so it would otherwise stay laid out for whatever the
    // viewport was when SceneManager was first built. Cache it and apply
    // it explicitly to every newly-shown scene instead.
    this.lastResizeData = null;

    this.unsubscribeResize = eventBus.subscribe('pixi.resize', (data) => {
      this.lastResizeData = data;
      this.currentScene?.onResize?.(data.width, data.height, data);
    });

    console.log('🎬 SceneManager created successfully');
  }

  /**
   * Show a scene (with optional transition)
   */
  async showScene(sceneName, options = {}) {
    console.log(`🎬 showScene('${sceneName}') called`);
    
    if (this.transitioning) {
      console.warn('Scene transition already in progress');
      return;
    }

    console.log(`🎬 Showing scene: ${sceneName}`);

    let newScene;
    try {
      console.log(`🎬 Getting or creating scene: ${sceneName}`);
      newScene = this.getOrCreateScene(sceneName);
      console.log(`🎬 Scene creation result:`, newScene ? 'SUCCESS' : 'FAILED');
      console.log(`🎬 Scene object:`, newScene);
      
      if (!newScene) {
        console.error(`❌ Failed to get/create scene: ${sceneName}`);
        return;
      }
    } catch (error) {
      console.error(`❌ Error creating scene ${sceneName}:`, error);
      console.error('Scene creation stack:', error.stack);
      return;
    }

    if (this.currentScene === newScene) {
      console.log('Scene already active');
      return;
    }

    this.transitioning = true;
    console.log(`🎬 Starting transition to ${sceneName}`);

    try {
      // If no current scene, just show the new one
      if (!this.currentScene) {
        console.log('🎬 No current scene - showing immediately');
        await this.showSceneImmediate(newScene);
        console.log('🎬 Immediate scene show completed');
      } else {
        // Transition between scenes
        console.log('🎬 Transitioning between scenes');
        await this.transitionToScene(newScene, options.transition || 'fade');
        console.log('🎬 Scene transition completed');
      }

      this.currentScene = newScene;
      console.log(`✅ Scene active: ${sceneName}`);
      console.log(`🎬 Stage children count: ${this.app.stage.children.length}`);
    } catch (error) {
      console.error('❌ Scene transition failed:', error);
      console.error('Transition error stack:', error.stack);
    } finally {
      this.transitioning = false;
      console.log(`🎬 Scene transition completed for ${sceneName}`);
    }
  }

  /**
   * Get or create a scene instance
   */
  getOrCreateScene(sceneName) {
    console.log(`🎬 getOrCreateScene('${sceneName}') called`);
    
    if (this.scenes.has(sceneName)) {
      console.log(`🎬 Scene '${sceneName}' already exists, returning cached version`);
      return this.scenes.get(sceneName);
    }

    console.log(`🎬 Creating new scene: ${sceneName}`);
    let scene;
    
    try {
      switch (sceneName) {
        case 'lobby':
          console.log('🎬 Creating LobbyScene...');
          scene = new LobbyScene();
          console.log('🎬 LobbyScene created successfully');
          break;
        case 'game':
          console.log('🎬 Creating GameScene...');
          scene = new GameScene();
          console.log('🎬 GameScene created successfully');
          break;
        default:
          console.error(`Unknown scene: ${sceneName}`);
          return null;
      }
    } catch (error) {
      console.error(`❌ Error in scene constructor for ${sceneName}:`, error);
      console.error('Constructor error stack:', error.stack);
      return null;
    }

    if (scene) {
      console.log(`🎬 Caching scene: ${sceneName}`);
      this.scenes.set(sceneName, scene);
      console.log(`🎬 Scene cached. Total scenes: ${this.scenes.size}`);
    }

    return scene;
  }

  /**
   * Apply the most recent resize to a scene that just got added - a
   * newly-constructed scene otherwise defaults to assuming landscape
   * until the next real resize event, which may never come.
   */
  applyLastResize(scene) {
    if (this.lastResizeData) {
      scene.onResize?.(this.lastResizeData.width, this.lastResizeData.height, this.lastResizeData);
    }
  }

  /**
   * Show scene immediately (no transition)
   */
  async showSceneImmediate(scene) {
    console.log('🎬 showSceneImmediate called');
    
    try {
      // Remove current scene
      if (this.currentScene) {
        console.log('🎬 Removing current scene');
        this.app.stage.removeChild(this.currentScene);
        if (this.currentScene.onHide) {
          console.log('🎬 Calling onHide on current scene');
          await this.currentScene.onHide();
        }
        console.log('🎬 Current scene removed');
      }

      // Add new scene
      console.log('🎬 Adding new scene to stage');
      this.app.stage.addChild(scene);
      console.log('🎬 Scene added to stage');
      this.applyLastResize(scene);

      if (scene.onShow) {
        console.log('🎬 Calling onShow on new scene');
        await scene.onShow();
        console.log('🎬 onShow completed');
      }
      
      console.log('🎬 showSceneImmediate completed successfully');
    } catch (error) {
      console.error('❌ Error in showSceneImmediate:', error);
      console.error('showSceneImmediate error stack:', error.stack);
      throw error;
    }
  }

  /**
   * Transition between scenes with animation
   */
  async transitionToScene(newScene, transitionType = 'fade') {
    const oldScene = this.currentScene;

    switch (transitionType) {
      case 'fade':
        await this.fadeTransition(oldScene, newScene);
        break;
      case 'slide':
        await this.slideTransition(oldScene, newScene);
        break;
      default:
        await this.fadeTransition(oldScene, newScene);
    }
  }

  /**
   * Fade transition between scenes
   */
  async fadeTransition(oldScene, newScene) {
    return new Promise(async (resolve) => {
      // Add new scene (hidden)
      newScene.alpha = 0;
      this.app.stage.addChild(newScene);
      this.applyLastResize(newScene);

      if (newScene.onShow) {
        await newScene.onShow();
      }

      // Create timeline
      const timeline = gsap.timeline({
        onComplete: () => {
          // Remove old scene
          if (oldScene) {
            this.app.stage.removeChild(oldScene);
            if (oldScene.onHide) {
              oldScene.onHide();
            }
          }
          resolve();
        }
      });

      // Fade out old scene and fade in new scene
      if (oldScene) {
        timeline.to(oldScene, { alpha: 0, duration: motion.glide.duration, ease: motion.glide.ease });
      }
      timeline.to(newScene, { alpha: 1, duration: motion.glide.duration, ease: motion.glide.ease }, oldScene ? "-=0.3" : 0);
    });
  }

  /**
   * Slide transition between scenes
   */
  async slideTransition(oldScene, newScene) {
    return new Promise(async (resolve) => {
      // Position new scene off-screen
      newScene.x = 1200; // Off to the right
      this.app.stage.addChild(newScene);
      this.applyLastResize(newScene);

      if (newScene.onShow) {
        await newScene.onShow();
      }

      // Create timeline
      const timeline = gsap.timeline({
        onComplete: () => {
          if (oldScene) {
            this.app.stage.removeChild(oldScene);
            if (oldScene.onHide) {
              oldScene.onHide();
            }
          }
          resolve();
        }
      });

      // Slide old scene out and new scene in
      if (oldScene) {
        timeline.to(oldScene, { x: -1200, duration: 0.7, ease: motion.glide.ease });
      }
      timeline.to(newScene, { x: 0, duration: 0.7, ease: motion.glide.ease }, oldScene ? "-=0.5" : 0);
    });
  }

  /**
   * Get current scene
   */
  getCurrentScene() {
    return this.currentScene;
  }

  /**
   * Cleanup
   */
  destroy() {
    console.log('🎬 Destroying SceneManager...');

    if (this.unsubscribeResize) {
      this.unsubscribeResize();
      this.unsubscribeResize = null;
    }

    this.scenes.forEach(scene => {
      if (scene.destroy) {
        scene.destroy();
      }
    });
    this.scenes.clear();

    this.currentScene = null;
  }
}

export default SceneManager;