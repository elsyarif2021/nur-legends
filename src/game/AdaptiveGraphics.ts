import type { GraphicsQuality } from '../types/game';

export type RenderQuality = Exclude<GraphicsQuality, 'auto'>;

export class AdaptiveGraphics {
  private preference: GraphicsQuality | undefined;
  private tier: RenderQuality = 'high';
  private elapsed = 0;
  private slowTime = 0;
  private slowWindows = 0;

  constructor(private readonly limitedDevice: boolean) {}

  update(preference: GraphicsQuality, frameMs = 0): RenderQuality {
    if (preference !== this.preference) {
      this.preference = preference;
      this.tier = preference === 'auto' ? (this.limitedDevice ? 'medium' : 'high') : preference;
      this.resetSample();
    }

    if (this.tier === 'low' || (preference !== 'auto' && preference !== 'high')) return this.tier;
    // Ignore startup, visibility changes and isolated stalls.
    if (!Number.isFinite(frameMs) || frameMs <= 0 || frameMs > 250) {
      this.resetSample();
      return this.tier;
    }

    this.elapsed += frameMs;
    if (frameMs >= 24) this.slowTime += frameMs;
    if (this.elapsed >= 1000) {
      this.slowWindows = this.slowTime >= this.elapsed * 0.65 ? this.slowWindows + 1 : 0;
      this.elapsed = 0;
      this.slowTime = 0;
      if (this.slowWindows >= 2) {
        this.tier = this.tier === 'high' ? 'medium' : 'low';
        this.slowWindows = 0;
      }
    }
    return this.tier;
  }

  private resetSample(): void {
    this.elapsed = 0;
    this.slowTime = 0;
    this.slowWindows = 0;
  }
}
