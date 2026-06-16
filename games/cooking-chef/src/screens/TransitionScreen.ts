import { drawKitchenBg, shd, nshd } from '@/game/drawHelpers';
import { MINIGAME_REGISTRY } from '@/minigames';
import type { MinigameId } from '@/types';

export const TRANS_DUR = 1.8;
let transTimer = 0;

export function initTransition(): void { transTimer = TRANS_DUR; }

/** Returns true when transition is over */
export function updateTransition(dt: number): boolean {
  transTimer -= dt;
  return transTimer <= 0;
}

export function drawTransition(ctx: CanvasRenderingContext2D, W: number, H: number, nextMgId: MinigameId | null): void {
  drawKitchenBg(ctx, W, H);
  const p = 1 - transTimer / TRANS_DUR;
  const sz = Math.round(H * 0.14 + p * H * 0.04);
  ctx.save(); shd(ctx, '#ffd700', 30);
  ctx.font = `bold ${sz}px system-ui`; ctx.textAlign = 'center'; ctx.fillStyle = '#ffd700';
  ctx.fillText('🍽 NEXT STAGE!', W / 2, H / 2 + sz * 0.3);
  nshd(ctx);
  if (nextMgId) {
    const mod = MINIGAME_REGISTRY[nextMgId];
    ctx.font = 'bold 24px system-ui'; ctx.fillStyle = 'rgba(255,200,100,0.85)';
    ctx.fillText(mod.icon + ' ' + mod.name, W / 2, H / 2 + sz * 0.3 + 50);
  }
  ctx.restore();
}
