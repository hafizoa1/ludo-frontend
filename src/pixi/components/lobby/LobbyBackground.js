import * as PIXI from 'pixi.js';
import { gsap } from 'gsap';

/**
 * LobbyBackground - Animated background for lobby scene
 * Fixed for PIXI v8+ with 1200×800 base dimensions
 */
class LobbyBackground extends PIXI.Container {
  constructor() {
    super();

    // Base design dimensions (matches LobbyScene)
    this.BASE_WIDTH = 1200;
    this.BASE_HEIGHT = 800;

    this.particles = [];
    this.animationTimeline = null;

    console.log('🌟 LobbyBackground created (1200×800 base)');

    this.createBackground();
    this.createParticles();
    this.startAnimations();
  }

  /**
   * Create the main background
   */
  createBackground() {
  const bg = new PIXI.Graphics();

  // Create gradient using base dimensions
  const stripeCount = 10;
  const stripeHeight = this.BASE_HEIGHT / stripeCount;

  for (let i = 0; i < stripeCount; i++) {
    const alpha = 1 - (i * 0.1);
    const r = Math.floor((0.1 + i * 0.05) * 255);
    const g = Math.floor((0.1 + i * 0.03) * 255);
    const b = Math.floor((0.18 + i * 0.02) * 255);
    const color = (r << 16) | (g << 8) | b;

    // PIXI v8+ API - use base dimensions
    bg.rect(0, i * stripeHeight, this.BASE_WIDTH, stripeHeight);
    bg.fill({ color: color, alpha: alpha });
  }

  this.addChild(bg);
}

  /**
   * Create floating particles
   */
  createParticles() {
    for (let i = 0; i < 20; i++) {
      const particle = this.createParticle();
      this.particles.push(particle);
      this.addChild(particle);
    }
  }

  /**
   * Create individual particle
   */
  createParticle() {
  const particle = new PIXI.Graphics();
  const types = ['circle', 'square', 'diamond'];
  const type = types[Math.floor(Math.random() * types.length)];
  const size = Math.random() * 8 + 4;
  const color = Math.random() > 0.5 ? 0xffd700 : 0x4a9eff;

  // PIXI v8+ API
  switch (type) {
    case 'circle':
      particle.circle(0, 0, size);
      break;
    case 'square':
      particle.rect(-size/2, -size/2, size, size);
      break;
    case 'diamond':
      particle.poly([-size/2, 0, 0, -size/2, size/2, 0, 0, size/2]);
      break;
  }

  particle.fill({ color: color, alpha: 0.3 });

  // Position particles within base dimensions
  particle.x = Math.random() * this.BASE_WIDTH;
  particle.y = Math.random() * this.BASE_HEIGHT;
  particle.initialX = particle.x;
  particle.initialY = particle.y;

  return particle;
}
  /**
   * Start background animations
   */
  startAnimations() {
    // Animate each particle
    this.particles.forEach((particle, index) => {
      this.animateParticle(particle, index);
    });
  }

  /**
   * Animate individual particle
   */
  animateParticle(particle, index) {
    const timeline = gsap.timeline({ repeat: -1 });
    
    // Random floating movement
    timeline.to(particle, {
      x: particle.initialX + (Math.random() - 0.5) * 200,
      y: particle.initialY + (Math.random() - 0.5) * 100,
      rotation: Math.PI * 2,
      duration: 10 + Math.random() * 10,
      ease: "sine.inOut",
      delay: index * 0.2
    });
    
    timeline.to(particle, {
      x: particle.initialX + (Math.random() - 0.5) * 200,
      y: particle.initialY + (Math.random() - 0.5) * 100,
      rotation: Math.PI * 4,
      duration: 8 + Math.random() * 8,
      ease: "sine.inOut"
    });
    
    // Pulsing alpha
    gsap.to(particle, {
      alpha: 0.1,
      duration: 3 + Math.random() * 2,
      yoyo: true,
      repeat: -1,
      ease: "sine.inOut",
      delay: index * 0.1
    });
  }

  /**
   * Cleanup
   */
  destroy() {
    console.log('🌟 LobbyBackground: Destroying...');
    
    // Kill all animations
    gsap.killTweensOf(this.particles);
    
    super.destroy();
  }
}

export default LobbyBackground;