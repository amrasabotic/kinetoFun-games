import type { HandData, GameAction } from '@/types';
import type { Dispatch } from 'react';
import { drawKitchenBg, drawHandCursor, card, shd, nshd } from '@/game/drawHelpers';
import { DwellSystem } from '@/systems/DwellSystem';
import { audioSynth } from '@/systems/AudioSynth';
import { storage } from '@/storage/localStorage';

const lbDwell = new DwellSystem(1100);

export function updateLeaderboard(dt: number, hands: HandData[], dispatch: Dispatch<GameAction>): void {
  void dt;
  const bh = hands.find(h => h.visible) ?? null;
  const fired = lbDwell.tick(bh);
  if (fired === 'back') { audioSynth.select(); dispatch({ type: 'NAVIGATE', screen: 'menu' }); }
}

export function drawLeaderboard(ctx: CanvasRenderingContext2D, W: number, H: number, hands: HandData[]): void {
  drawKitchenBg(ctx, W, H);
  ctx.save(); shd(ctx, '#ffd700', 28);
  ctx.font = `bold ${Math.round(H * 0.065)}px system-ui`; ctx.textAlign = 'center'; ctx.fillStyle = '#ffd700';
  ctx.fillText('🏆 LEADERBOARD', W / 2, H * 0.14); nshd(ctx); ctx.restore();

  const entries = storage.getOrDefault('leaderboard');
  const topN = entries.slice(0, 10);

  const rowH = 44, startY = H * 0.22, colW = Math.min(660, W * 0.7);
  const lx = W / 2 - colW / 2;

  const medals = ['🥇', '🥈', '🥉'];

  if (topN.length === 0) {
    ctx.font = '20px system-ui'; ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.fillText('No scores yet — play a game first!', W / 2, H * 0.5);
  } else {
    topN.forEach((e, i) => {
      const y = startY + i * (rowH + 6);
      const medal = medals[i] ?? `#${i + 1}`;
      const isTop3 = i < 3;
      card(ctx, lx, y, colW, rowH, 10,
        isTop3 ? 'rgba(255,215,0,0.12)' : 'rgba(255,255,255,0.06)',
        isTop3 ? 'rgba(255,215,0,0.4)' : 'rgba(255,255,255,0.12)', isTop3 ? 2 : 1);
      ctx.font = isTop3 ? 'bold 18px system-ui' : '16px system-ui';
      ctx.textAlign = 'left'; ctx.fillStyle = isTop3 ? '#ffd700' : '#fff';
      ctx.fillText(`${medal}  ${e.playerName}`, lx + 14, y + 28);
      ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(255,200,100,0.7)';
      ctx.font = '14px system-ui';
      ctx.fillText(e.mode, W / 2, y + 28);
      ctx.textAlign = 'right';
      const starStr = '⭐'.repeat(e.stars);
      ctx.fillText(`${e.score.toLocaleString()}  ${starStr}`, lx + colW - 14, y + 28);
    });
  }

  const backRegion = [{ id: 'back', x: W / 2 - 110, y: H * 0.9, w: 220, h: 52 }];
  lbDwell.setRegions(backRegion);
  const { id: hovId, p } = lbDwell.progress();
  const hov = hovId === 'back';
  ctx.save(); if (hov) shd(ctx, '#ff7c2e', 18);
  card(ctx, backRegion[0].x, backRegion[0].y, 220, 52, 14, hov ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.07)', hov ? '#ff7c2e' : 'rgba(255,255,255,0.2)', hov ? 3 : 2);
  if (hov && p > 0) { ctx.beginPath(); (ctx as unknown as { roundRect?(x: number, y: number, w: number, h: number, r: number): void }).roundRect?.(backRegion[0].x, backRegion[0].y + 46, 220 * p, 6, 3); ctx.fillStyle = '#ff7c2e'; ctx.fill(); }
  ctx.font = 'bold 18px system-ui'; ctx.textAlign = 'center'; ctx.fillStyle = hov ? '#ff7c2e' : '#fff';
  ctx.fillText('← MAIN MENU', W / 2, backRegion[0].y + 33);
  nshd(ctx); ctx.restore();

  hands.forEach(h => drawHandCursor(ctx, h));
}
