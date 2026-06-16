import { drawKitchenBg, shd, nshd } from '@/game/drawHelpers';
import { audioSynth } from '@/systems/AudioSynth';
import { MINIGAME_REGISTRY } from '@/minigames';
import type { MinigameId } from '@/types';

let cdVal = 3;
let cdTimer = 0;

export function initCountdown(mgId: MinigameId): void {
  cdVal = 3; cdTimer = 3.5;
  const mod = MINIGAME_REGISTRY[mgId];
  // Module init is handled by the game loop (needs full context)
  void mod;
}

/** Returns true when countdown is done */
export function updateCountdown(dt: number): boolean {
  cdTimer -= dt;
  const nv = Math.max(0, Math.ceil(cdTimer) - 1);
  if (nv !== cdVal && nv >= 0) { cdVal = nv; nv > 0 ? audioSynth.countdown() : audioSynth.go(); }
  return cdTimer <= 0;
}

export function drawCountdown(ctx: CanvasRenderingContext2D, W: number, H: number, mgId: MinigameId): void {
  drawKitchenBg(ctx, W, H);
  const mod = MINIGAME_REGISTRY[mgId];
  ctx.font = 'bold 26px system-ui'; ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(255,220,150,0.9)';
  ctx.fillText(mod.icon + ' ' + mod.name, W / 2, H * 0.2);
  ctx.font = '16px system-ui'; ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.fillText(mod.hint, W / 2, H * 0.27);

  const label = cdVal === 0 ? 'COOK! 🍳' : String(cdVal);
  const col = cdVal === 0 ? '#44ff88' : '#ffd700';
  const sz = Math.round(H * 0.22 + Math.sin(cdTimer * 8) * H * 0.02);
  ctx.save(); shd(ctx, col, 40);
  ctx.font = `bold ${sz}px system-ui`; ctx.textAlign = 'center'; ctx.fillStyle = col;
  ctx.fillText(label, W / 2, H / 2 + sz * 0.35);
  nshd(ctx); ctx.restore();
}
