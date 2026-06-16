import type { HandData, GameAction } from '@/types';
import type { Dispatch } from 'react';
import { drawKitchenBg, drawHandCursor, card, shd, nshd } from '@/game/drawHelpers';
import { DwellSystem } from '@/systems/DwellSystem';
import { audioSynth } from '@/systems/AudioSynth';
import { SHORT_SEQUENCE } from '@/hooks/useGameState';

const partyDwell = new DwellSystem(1100);

const PLAYER_COLS = ['#ff7c2e', '#4dc8ff', '#44ff88', '#cc88ff'];
const MAX_PLAYERS = 4;
const MIN_PLAYERS = 2;

let playerCount = 2;
let partyAnim = 0;

export function initPartySetup(): void {
  playerCount = 2;
  partyAnim = 0;
}

export function updatePartySetup(dt: number, hands: HandData[], dispatch: Dispatch<GameAction>): void {
  partyAnim += dt;
  const bh = hands.find(h => h.visible) ?? null;
  const fired = partyDwell.tick(bh);
  if (!fired) return;
  audioSynth.select();
  if (fired === 'back') { dispatch({ type: 'NAVIGATE', screen: 'menu' }); return; }
  if (fired === 'minus') { playerCount = Math.max(MIN_PLAYERS, playerCount - 1); return; }
  if (fired === 'plus') { playerCount = Math.min(MAX_PLAYERS, playerCount + 1); return; }
  if (fired === 'start') {
    const names = Array.from({ length: playerCount }, (_, i) => `Player ${i + 1}`);
    dispatch({ type: 'SET_PARTY_NAMES', names });
    dispatch({ type: 'START_GAME', mode: 'party', sequence: SHORT_SEQUENCE });
  }
}

export function drawPartySetup(ctx: CanvasRenderingContext2D, W: number, H: number, hands: HandData[]): void {
  drawKitchenBg(ctx, W, H);
  ctx.save(); shd(ctx, '#4dc8ff', 28);
  ctx.font = `bold ${Math.round(H * 0.065)}px system-ui`; ctx.textAlign = 'center'; ctx.fillStyle = '#4dc8ff';
  ctx.fillText('🎉 PARTY MODE', W / 2, H * 0.14); nshd(ctx);
  ctx.font = '16px system-ui'; ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.fillText('Players take turns — same 5 minigames, ranked by total score', W / 2, H * 0.22);

  ctx.font = 'bold 20px system-ui'; ctx.fillStyle = 'rgba(255,220,150,0.9)';
  ctx.fillText('NUMBER OF PLAYERS', W / 2, H * 0.35);
  ctx.restore();

  const btnW = 60, btnH = 60, countW = 100;
  const rowY = H * 0.42 - btnH / 2;
  const totalRowW = btnW + 20 + countW + 20 + btnW;
  const rowX = W / 2 - totalRowW / 2;

  const regions = [
    { id: 'minus', x: rowX,                        y: rowY, w: btnW,   h: btnH },
    { id: 'plus',  x: rowX + btnW + 20 + countW + 20, y: rowY, w: btnW, h: btnH },
    { id: 'start', x: W / 2 - 130, y: H * 0.76, w: 260, h: 58 },
    { id: 'back',  x: W / 2 - 110, y: H * 0.87, w: 220, h: 50 },
  ];
  partyDwell.setRegions(regions);
  const { id: hovId, p } = partyDwell.progress();

  [{ r: regions[0], label: '−' }, { r: regions[1], label: '+' }].forEach(({ r, label }) => {
    const hov = hovId === r.id;
    const canAct = (label === '−' && playerCount > MIN_PLAYERS) || (label === '+' && playerCount < MAX_PLAYERS);
    ctx.save(); ctx.globalAlpha = canAct ? 1 : 0.3;
    if (hov && canAct) shd(ctx, '#4dc8ff', 18);
    card(ctx, r.x, r.y, r.w, r.h, 14, hov ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.07)', hov ? '#4dc8ff' : 'rgba(255,255,255,0.25)', hov ? 3 : 2);
    if (hov && canAct && p > 0) { ctx.beginPath(); (ctx as unknown as { roundRect?(x: number, y: number, w: number, h: number, r: number): void }).roundRect?.(r.x, r.y + r.h - 6, r.w * p, 6, 3); ctx.fillStyle = '#4dc8ff'; ctx.fill(); }
    ctx.font = 'bold 30px system-ui'; ctx.textAlign = 'center'; ctx.fillStyle = hov ? '#4dc8ff' : '#fff';
    ctx.fillText(label, r.x + r.w / 2, r.y + r.h / 2 + 12);
    nshd(ctx); ctx.restore();
  });

  ctx.font = `bold ${Math.round(H * 0.09)}px system-ui`; ctx.textAlign = 'center'; ctx.fillStyle = '#ffd700';
  shd(ctx, '#ffd700', 20);
  ctx.fillText(String(playerCount), rowX + btnW + 20 + countW / 2, rowY + btnH / 2 + 16 + Math.sin(partyAnim * 3) * 3);
  nshd(ctx);

  const iconY = H * 0.54;
  const iconGap = 90;
  const iconStartX = W / 2 - ((playerCount - 1) * iconGap) / 2;
  for (let i = 0; i < playerCount; i++) {
    const x = iconStartX + i * iconGap;
    ctx.font = '34px system-ui'; ctx.textAlign = 'center';
    ctx.fillText('👤', x, iconY + Math.sin(partyAnim * 2 + i * 0.8) * 6);
    ctx.font = 'bold 14px system-ui'; ctx.fillStyle = PLAYER_COLS[i];
    ctx.fillText(`P${i + 1}`, x, iconY + 30);
  }

  const startR = regions[2];
  const hovStart = hovId === 'start';
  ctx.save(); if (hovStart) shd(ctx, '#44ff88', 20);
  card(ctx, startR.x, startR.y, startR.w, startR.h, 16, hovStart ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.07)', hovStart ? '#44ff88' : 'rgba(68,255,136,0.4)', hovStart ? 3 : 2);
  if (hovStart && p > 0) { ctx.beginPath(); (ctx as unknown as { roundRect?(x: number, y: number, w: number, h: number, r: number): void }).roundRect?.(startR.x, startR.y + startR.h - 6, startR.w * p, 6, 3); ctx.fillStyle = '#44ff88'; ctx.fill(); }
  ctx.font = 'bold 22px system-ui'; ctx.textAlign = 'center'; ctx.fillStyle = hovStart ? '#44ff88' : '#fff';
  ctx.fillText('▶ START PARTY', W / 2, startR.y + 38);
  nshd(ctx); ctx.restore();

  const backR = regions[3];
  const hovBack = hovId === 'back';
  ctx.save(); if (hovBack) shd(ctx, '#ff7c2e', 18);
  card(ctx, backR.x, backR.y, 220, 50, 14, hovBack ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.07)', hovBack ? '#ff7c2e' : 'rgba(255,255,255,0.2)', hovBack ? 3 : 2);
  if (hovBack && p > 0) { ctx.beginPath(); (ctx as unknown as { roundRect?(x: number, y: number, w: number, h: number, r: number): void }).roundRect?.(backR.x, backR.y + 44, 220 * p, 6, 3); ctx.fillStyle = '#ff7c2e'; ctx.fill(); }
  ctx.font = 'bold 17px system-ui'; ctx.textAlign = 'center'; ctx.fillStyle = hovBack ? '#ff7c2e' : '#fff';
  ctx.fillText('← MAIN MENU', W / 2, backR.y + 31);
  nshd(ctx); ctx.restore();

  hands.forEach(h => drawHandCursor(ctx, h));
}

export function drawPartyLeaderboard(
  ctx: CanvasRenderingContext2D, W: number, H: number,
  players: Array<{ name: string; score: number; stars: number }>,
  hands: HandData[], dispatch: Dispatch<GameAction>
): void {
  drawKitchenBg(ctx, W, H);
  ctx.save(); shd(ctx, '#4dc8ff', 28);
  ctx.font = `bold ${Math.round(H * 0.065)}px system-ui`; ctx.textAlign = 'center'; ctx.fillStyle = '#4dc8ff';
  ctx.fillText('🎉 PARTY RESULTS', W / 2, H * 0.13); nshd(ctx); ctx.restore();

  const sorted = [...players].sort((a, b) => b.score - a.score);
  const medals = ['🥇', '🥈', '🥉', '4️⃣'];
  const bw = Math.min(480, W * 0.55), bh = 66, gap = 12;
  const startY = H * 0.28;
  sorted.forEach((pl, i) => {
    const x = W / 2 - bw / 2, y = startY + i * (bh + gap);
    card(ctx, x, y, bw, bh, 14, i === 0 ? 'rgba(255,215,0,0.18)' : 'rgba(255,255,255,0.07)', i === 0 ? 'rgba(255,215,0,0.5)' : 'rgba(255,255,255,0.15)', i === 0 ? 3 : 1.5);
    ctx.font = '26px system-ui'; ctx.textAlign = 'left'; ctx.fillText(medals[i] ?? String(i + 1), x + 14, y + 44);
    ctx.font = `bold ${i === 0 ? 20 : 17}px system-ui`; ctx.fillStyle = i === 0 ? '#ffd700' : '#fff';
    ctx.fillText(pl.name, x + 56, y + 32);
    ctx.font = '14px system-ui'; ctx.fillStyle = 'rgba(255,200,100,0.75)';
    ctx.fillText('⭐'.repeat(pl.stars), x + 56, y + 54);
    ctx.textAlign = 'right'; ctx.font = 'bold 20px system-ui'; ctx.fillStyle = i === 0 ? '#ffd700' : '#fff';
    ctx.fillText(pl.score.toLocaleString(), x + bw - 14, y + 44);
  });

  const backRegion = [{ id: 'back', x: W / 2 - 110, y: H * 0.88, w: 220, h: 50 }];
  partyDwell.setRegions(backRegion);
  const { id: hovId, p } = partyDwell.progress();
  const hov = hovId === 'back';
  if (hov) { audioSynth.select(); dispatch({ type: 'NAVIGATE', screen: 'menu' }); }
  ctx.save(); if (hov) shd(ctx, '#ff7c2e', 18);
  card(ctx, backRegion[0].x, backRegion[0].y, 220, 50, 14, hov ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.07)', hov ? '#ff7c2e' : 'rgba(255,255,255,0.2)', hov ? 3 : 2);
  if (hov && p > 0) { ctx.beginPath(); (ctx as unknown as { roundRect?(x: number, y: number, w: number, h: number, r: number): void }).roundRect?.(backRegion[0].x, backRegion[0].y + 44, 220 * p, 6, 3); ctx.fillStyle = '#ff7c2e'; ctx.fill(); }
  ctx.font = 'bold 17px system-ui'; ctx.textAlign = 'center'; ctx.fillStyle = hov ? '#ff7c2e' : '#fff';
  ctx.fillText('← MAIN MENU', W / 2, backRegion[0].y + 31);
  nshd(ctx); ctx.restore();

  hands.forEach(h => drawHandCursor(ctx, h));
}
