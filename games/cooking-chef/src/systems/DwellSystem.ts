import type { HandData } from '@/types';

export interface DwellRegion {
  id: string;
  x: number; y: number;
  w: number; h: number;
}

export class DwellSystem {
  dwellMs: number;
  private activeId: string | null = null;
  private startT: number = 0;
  private regions: DwellRegion[] = [];

  constructor(dwellMs = 1100) {
    this.dwellMs = dwellMs;
  }

  setRegions(regions: DwellRegion[]): void {
    this.regions = regions;
  }

  /** Returns the id that was just activated, or null */
  tick(hand: HandData | null): string | null {
    if (!hand || !hand.visible) { this.activeId = null; return null; }
    let hovered: string | null = null;
    for (const r of this.regions) {
      if (hand.x >= r.x && hand.x <= r.x + r.w && hand.y >= r.y && hand.y <= r.y + r.h) {
        hovered = r.id; break;
      }
    }
    if (!hovered) { this.activeId = null; return null; }
    if (hovered !== this.activeId) { this.activeId = hovered; this.startT = Date.now(); return null; }
    if (Date.now() - this.startT >= this.dwellMs) {
      const fired = this.activeId;
      this.activeId = null;
      return fired;
    }
    return null;
  }

  progress(): { id: string | null; p: number } {
    if (!this.activeId) return { id: null, p: 0 };
    return { id: this.activeId, p: Math.min(1, (Date.now() - this.startT) / this.dwellMs) };
  }

  reset(): void { this.activeId = null; }

  /** Draw dwell progress arc under each registered region */
  drawProgress(ctx: CanvasRenderingContext2D, accentCol = '#ff7c2e'): void {
    const { id, p } = this.progress();
    if (!id || p <= 0) return;
    const r = this.regions.find(r => r.id === id);
    if (!r) return;
    const bx = r.x, by = r.y + r.h - 6, bw = r.w;
    ctx.save();
    ctx.beginPath();
    (ctx as CanvasRenderingContext2D & { roundRect?(x: number, y: number, w: number, h: number, r: number): void }).roundRect?.(bx, by, bw * p, 6, 3);
    ctx.fillStyle = accentCol;
    ctx.fill();
    ctx.restore();
  }
}
