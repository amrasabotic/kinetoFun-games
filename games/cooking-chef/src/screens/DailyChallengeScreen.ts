import type { HandData, GameAction, MinigameId } from '@/types';
import type { Dispatch } from 'react';
import { drawKitchenBg, drawHandCursor, card, shd, nshd } from '@/game/drawHelpers';
import { DwellSystem } from '@/systems/DwellSystem';
import { audioSynth } from '@/systems/AudioSynth';
import { storage } from '@/storage/localStorage';
import { MINIGAME_REGISTRY } from '@/minigames';

const dailyDwell = new DwellSystem(1100);

export function updateDailyChallenge(dt: number, hands: HandData[], dispatch: Dispatch<GameAction>, dailySeq: MinigameId[]): void {
  void dt;
  const bh = hands.find(h => h.visible) ?? null;
  const fired = dailyDwell.tick(bh);
  if (!fired) return;
  audioSynth.select();
  if (fired === 'back') { dispatch({ type: 'NAVIGATE', screen: 'menu' }); return; }
  if (fired === 'play') {
    const today = new Date().toLocaleDateString();
    const dc = storage.getOrDefault('dailyChallenge');
    if (dc.lastPlayedDate === today) { audioSynth.miss(); return; }
    dispatch({ type: 'START_GAME', mode: 'daily', sequence: dailySeq });
  }
}

export function drawDailyChallenge(ctx: CanvasRenderingContext2D, W: number, H: number, hands: HandData[], dailySeq: MinigameId[]): void {
  drawKitchenBg(ctx, W, H);
  ctx.save(); shd(ctx, '#44ff88', 28);
  ctx.font = `bold ${Math.round(H * 0.065)}px system-ui`; ctx.textAlign = 'center'; ctx.fillStyle = '#44ff88';
  ctx.fillText('📅 DAILY CHALLENGE', W / 2, H * 0.13); nshd(ctx); ctx.restore();

  const dc = storage.getOrDefault('dailyChallenge');
  const today = new Date().toLocaleDateString();
  const alreadyPlayed = dc.lastPlayedDate === today;

  ctx.font = 'bold 20px system-ui'; ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(255,220,150,0.9)';
  ctx.fillText(`🔥 Streak: ${dc.streak} day${dc.streak !== 1 ? 's' : ''}`, W / 2, H * 0.22);
  ctx.font = '16px system-ui'; ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.fillText(`Best daily score: ${dc.bestDailyScore}`, W / 2, H * 0.28);

  ctx.font = 'bold 17px system-ui'; ctx.fillStyle = 'rgba(255,200,100,0.85)';
  ctx.fillText("TODAY'S STAGES:", W / 2, H * 0.38);

  const bw = 110, bh2 = 90, gap = 12;
  const totalW = dailySeq.length * (bw + gap) - gap;
  const sx = W / 2 - totalW / 2;
  dailySeq.forEach((id, i) => {
    const mod = MINIGAME_REGISTRY[id];
    const x = sx + i * (bw + gap), y = H * 0.42;
    card(ctx, x, y, bw, bh2, 12, 'rgba(0,0,0,0.55)', 'rgba(255,200,100,0.35)', 2);
    ctx.font = '32px system-ui'; ctx.textAlign = 'center'; ctx.fillText(mod.icon, x + bw / 2, y + 46);
    ctx.font = 'bold 11px system-ui'; ctx.fillStyle = '#fff';
    ctx.fillText(mod.name, x + bw / 2, y + 72);
  });

  if (alreadyPlayed) {
    card(ctx, W / 2 - 200, H * 0.66, 400, 56, 14, 'rgba(0,200,80,0.15)', 'rgba(68,255,136,0.4)', 2);
    ctx.font = 'bold 18px system-ui'; ctx.textAlign = 'center'; ctx.fillStyle = '#44ff88';
    ctx.fillText('✅ Already played today! Come back tomorrow.', W / 2, H * 0.66 + 33);
  }

  const regions = [
    { id: 'play', x: W / 2 - 110, y: H * 0.76, w: 220, h: 54 },
    { id: 'back', x: W / 2 - 110, y: H * 0.86, w: 220, h: 50 },
  ];
  dailyDwell.setRegions(regions);
  const { id: hovId, p } = dailyDwell.progress();

  const btnDefs = [
    { id: 'play', label: alreadyPlayed ? '✓ Played Today' : '▶ PLAY NOW', col: '#44ff88' },
    { id: 'back', label: '← MAIN MENU', col: '#ff7c2e' },
  ];
  btnDefs.forEach(b => {
    const r = regions.find(rr => rr.id === b.id)!;
    const hov = hovId === b.id && !(b.id === 'play' && alreadyPlayed);
    ctx.save(); if (hov) shd(ctx, b.col, 18);
    const alpha = b.id === 'play' && alreadyPlayed ? 0.35 : 1;
    ctx.globalAlpha = alpha;
    card(ctx, r.x, r.y, r.w, r.h, 14, hov ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.07)', hov ? b.col : 'rgba(255,255,255,0.2)', hov ? 3 : 2);
    if (hov && p > 0) { ctx.beginPath(); (ctx as unknown as { roundRect?(x: number, y: number, w: number, h: number, r: number): void }).roundRect?.(r.x, r.y + r.h - 6, r.w * p, 6, 3); ctx.fillStyle = b.col; ctx.fill(); }
    ctx.font = 'bold 17px system-ui'; ctx.textAlign = 'center'; ctx.fillStyle = hov ? b.col : '#fff';
    ctx.fillText(b.label, r.x + r.w / 2, r.y + r.h / 2 + 7); ctx.globalAlpha = 1;
    nshd(ctx); ctx.restore();
  });

  hands.forEach(h => drawHandCursor(ctx, h));
}

export function completeDailyChallenge(score: number): void {
  const today = new Date().toLocaleDateString();
  storage.update('dailyChallenge', dc => {
    const yesterday = new Date(Date.now() - 86400000).toLocaleDateString();
    const streak = dc.lastPlayedDate === yesterday ? dc.streak + 1 : 1;
    return { lastPlayedDate: today, streak, bestDailyScore: Math.max(dc.bestDailyScore, score) };
  });
}
