import type { HandData, GameAction, GameSession, GameMode } from '@/types';
import type { Dispatch } from 'react';
import { drawKitchenBg, drawHandCursor, card, shd, nshd } from '@/game/drawHelpers';
import { DwellSystem } from '@/systems/DwellSystem';
import { audioSynth } from '@/systems/AudioSynth';
import { storage } from '@/storage/localStorage';
import type { ParticleSystem } from '@/systems/ParticleSystem';

const resultsDwell = new DwellSystem(1100);
let resultsTimer = 0;

export function initResults(session: GameSession, particles: ParticleSystem): void {
  resultsTimer = 0;
  audioSynth.fanfare();
  const prog = storage.getOrDefault('progress');
  if (session.totalScore > prog.bestScore) {
    storage.update('progress', p => ({ ...p, bestScore: session.totalScore }));
  }
  const coins = Math.floor(session.totalScore / 10);
  storage.update('progress', p => ({ ...p, totalStars: p.totalStars + session.stars, totalCoins: p.totalCoins + coins }));
  // Leaderboard
  storage.update('leaderboard', lb => {
    const entry = { score: session.totalScore, playerName: 'Chef', date: new Date().toLocaleDateString(), mode: session.mode, stars: session.stars };
    const sorted = [...lb, entry].sort((a, b) => b.score - a.score).slice(0, 20);
    return sorted;
  });
  // Confetti rain
  for (let i = 0; i < 15; i++) setTimeout(() => particles.confetti(Math.random() * 1920, Math.random() * 400), i * 120);
}

export function updateResults(dt: number, hands: HandData[], dispatch: Dispatch<GameAction>): void {
  resultsTimer += dt;
  const bh = hands.find(h => h.visible) ?? null;
  const fired = resultsDwell.tick(bh);
  if (fired) handleResultsActivate(fired, dispatch);
}

function handleResultsActivate(id: string, dispatch: Dispatch<GameAction>): void {
  audioSynth.select();
  if (id === 'play_again') dispatch({ type: 'NAVIGATE', screen: 'countdown' });
  else if (id === 'menu') dispatch({ type: 'NAVIGATE', screen: 'menu' });
}

export function drawResults(ctx: CanvasRenderingContext2D, W: number, H: number, session: GameSession, hands: HandData[], particles: ParticleSystem): void {
  drawKitchenBg(ctx, W, H);
  const t = resultsTimer;
  const prog = storage.getOrDefault('progress');

  ctx.save(); shd(ctx, '#ffd700', 30);
  ctx.font = `bold ${Math.round(H * 0.07)}px system-ui`; ctx.textAlign = 'center'; ctx.fillStyle = '#ffd700';
  ctx.fillText('🏆 ROUND COMPLETE!', W / 2, H * 0.16); nshd(ctx);

  card(ctx, W / 2 - 300, H * 0.22, 600, H * 0.44, 20, 'rgba(0,0,0,0.65)', 'rgba(255,215,0,0.4)', 2.5);
  ctx.font = 'bold 22px system-ui'; ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.fillText('YOUR SCORE', W / 2, H * 0.22 + 44);
  ctx.font = `bold ${Math.round(H * 0.1)}px system-ui`; ctx.fillStyle = '#ff7c2e'; shd(ctx, '#ff7c2e', 20);
  ctx.fillText(String(session.totalScore), W / 2, H * 0.22 + 44 + H * 0.1 + 10); nshd(ctx);
  if (session.totalScore >= prog.bestScore) { ctx.font = 'bold 18px system-ui'; ctx.fillStyle = '#44ff88'; ctx.fillText('🎉 NEW BEST!', W / 2, H * 0.22 + 44 + H * 0.1 + 42); }
  ctx.restore();

  const starY = H * 0.52;
  ['⭐', '⭐', '⭐'].forEach((s, i) => {
    const x = W / 2 + (i - 1) * 80;
    const show = t > (i * 0.3 + 0.5);
    ctx.globalAlpha = show ? (i < session.stars ? 1 : 0.2) : 0;
    if (show && i < session.stars) { shd(ctx, '#ffd700', 20); }
    ctx.font = '52px system-ui'; ctx.textAlign = 'center'; ctx.fillText(s, x, starY);
    nshd(ctx); ctx.globalAlpha = 1;
  });

  const coins = Math.floor(session.totalScore / 10);
  ctx.font = 'bold 19px system-ui'; ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(255,220,150,0.85)';
  ctx.fillText(`+ ${coins} coins 🪙  |  Best combo x${session.maxCombo}`, W / 2, H * 0.68);

  const btns = [
    { id: 'play_again', label: '🔄 Play Again', col: '#ff7c2e' },
    { id: 'menu',       label: '🏠 Main Menu',  col: '#4dc8ff' },
  ];
  const bw = 220, bh = 56, totalW = btns.length * bw + (btns.length - 1) * 24;
  const regions = btns.map((b, i) => ({ id: b.id, x: W / 2 - totalW / 2 + i * (bw + 24), y: H * 0.76, w: bw, h: bh }));
  resultsDwell.setRegions(regions);
  const { id: hovId, p } = resultsDwell.progress();
  btns.forEach((b, i) => {
    const r = regions[i];
    const hov = hovId === b.id;
    ctx.save(); if (hov) shd(ctx, b.col, 20);
    card(ctx, r.x, r.y, bw, bh, 14, hov ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.07)', hov ? b.col : 'rgba(255,255,255,0.2)', hov ? 3 : 2);
    if (hov && p > 0) { ctx.beginPath(); (ctx as unknown as { roundRect?(x: number, y: number, w: number, h: number, r: number): void }).roundRect?.(r.x, r.y + bh - 6, bw * p, 6, 3); ctx.fillStyle = b.col; ctx.fill(); }
    ctx.font = 'bold 18px system-ui'; ctx.textAlign = 'center'; ctx.fillStyle = hov ? b.col : '#fff';
    ctx.fillText(b.label, r.x + bw / 2, r.y + 36);
    nshd(ctx); ctx.restore();
  });

  particles.draw(ctx);
  hands.forEach(h => drawHandCursor(ctx, h));
}
