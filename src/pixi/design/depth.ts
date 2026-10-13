import { DropShadowFilter } from 'pixi-filters';
import type { Container } from 'pixi.js';

export type ElevationLevel = 0 | 1 | 2;

interface ElevationPreset {
  offset: { x: number; y: number };
  blur: number;
  alpha: number;
  quality: number;
}

// One depth vocabulary pieces/board/panels pull from instead of each
// inventing its own shadow numbers. 1 = resting (pieces, panel chrome -
// a small lift off the board); 2 = prominent (the board itself, the one
// physical object everything else sits on top of).
const PRESETS: Record<Exclude<ElevationLevel, 0>, ElevationPreset> = {
  1: { offset: { x: 2, y: 3 }, blur: 3, alpha: 0.35, quality: 3 },
  2: { offset: { x: 0, y: 6 }, blur: 6, alpha: 0.4, quality: 4 }
};

// Pairs DropShadowFilter with cacheAsTexture per PixiJS's own guidance:
// without caching, the filter recomputes every frame. Only apply this to
// a container whose content is drawn once and left alone - anything that
// redraws its own graphics or tweens a child's alpha/fill afterward needs
// an explicit updateCacheTexture() call to show the change, so this is
// deliberately not used on panels/pieces with ongoing internal animation.
export function applyElevation(target: Container, level: ElevationLevel, color: number = 0x000000): void {
  if (level === 0) {
    target.filters = [];
    target.cacheAsTexture(false);
    return;
  }

  const preset = PRESETS[level];
  target.filters = [
    new DropShadowFilter({
      offset: preset.offset,
      color,
      alpha: preset.alpha,
      blur: preset.blur,
      quality: preset.quality
    })
  ];
  target.cacheAsTexture(true);
}
