import type { HandData, GameAction } from '@/types';
import type { Dispatch } from 'react';
import { drawKitchenBg, drawHandCursor, card, shd, nshd } from '@/game/drawHelpers';
import { DwellSystem } from '@/systems/DwellSystem';
import { audioSynth } from '@/systems/AudioSynth';
import { storage } from '@/storage/localStorage';
import { STORY_SEQUENCE, buildEndlessSequence } from '@/hooks/useGameState';
import type { MinigameId } from '@/types';

const ITEMS = [
  { id: 'play',    label: '▶  STORY MODE',        sub: 'Cook through all 12 stages!', col: '#ff7c2e' },
  { id: 'endless', label: '♾  ENDLESS MODE',       sub: 'How long can you last?',     col: '#ffd700' },
  { id: 'daily',   label: '📅  DAILY CHALLENGE',   sub: 'One special set per day',     col: '#44ff88' },
  { id: 'party',   label: '🎉  PARTY MODE',        sub: '2–4 players, take turns',     col: '#4dc8ff' },
  { id: 'howto',   label: '📖  HOW TO PLAY',       sub: 'Gesture guide',               col: '#cc88ff' },
  { id: 'settings',label: '⚙  SETTINGS',           sub: 'Audio, difficulty, handedness', col: '#88ccff' },
  { id: 'leaderboard', label: '🏆  LEADERBOARD',  sub: 'Top scores',                  col: '#ffd700' },
];

let menuAnim = 0;
export const menuDwell = new DwellSystem(1100);

export function drawMenu(ctx: CanvasRenderingContext2D, W: number, H: number, hands: HandData[], dispatch: Dispatch<GameAction>, dailySequence: MinigameId[]): void {
  menuAnim += 0.016;
  drawKitchenBg(ctx, W, H);

  const bh = hands.find(h => h.visible) ?? null;
  const fired = menuDwell.tick(bh);
  if (fired) { handleMenuActivate(fired, dispatch, dailySequence); }

  // Title
  ctx.save(); shd(ctx, '#ff7c2e', 35);
  ctx.font = `bold ${Math.round(W * 0.065)}px system-ui`; ctx.textAlign = 'center'; ctx.fillStyle = '#ff7c2e';
  ctx.fillText('🍳 COOKING CHEF', W / 2, H * 0.15 + Math.sin(menuAnim * 0.8) * 5); nshd(ctx);
  ctx.font = `${Math.round(W * 0.022)}px system-ui`; ctx.fillStyle = 'rgba(255,220,150,0.7)';
  ctx.fillText('A KinetoFun TV Experience — Gesture Controlled', W / 2, H * 0.15 + 44);

  const prog = storage.getOrDefault('progress');
  if (prog.bestScore > 0) {
    card(ctx, W - 175, 10, 165, 44, 10, 'rgba(0,0,0,0.5)', 'rgba(255,215,0,0.4)', 2);
    ctx.font = 'bold 14px system-ui'; ctx.textAlign = 'center'; ctx.fillStyle = '#ffd700';
    ctx.fillText('🏆 BEST: ' + prog.bestScore, W - 92, 36);
  }
  ctx.restore();

  const bw = Math.min(440, W * 0.5), bh2 = 65, gap = 14;
  const totalH = ITEMS.length * (bh2 + gap) - gap;
  const startY = H / 2 - totalH / 2 + H * 0.04;
  const regions = ITEMS.map((item, i) => ({ id: item.id, x: W / 2 - bw / 2, y: startY + i * (bh2 + gap), w: bw, h: bh2 }));
  menuDwell.setRegions(regions);

  const { id: hovId, p } = menuDwell.progress();
  ITEMS.forEach((item, i) => {
    const r = regions[i];
    const isHov = hovId === item.id;
    ctx.save();
    if (isHov) shd(ctx, item.col, 20);
    card(ctx, r.x, r.y, r.w, r.h, 14, isHov ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.06)', isHov ? item.col : 'rgba(255,255,255,0.15)', isHov ? 3 : 2);
    if (isHov && p > 0) { ctx.beginPath(); (ctx as unknown as { roundRect?(x: number, y: number, w: number, h: number, r: number): void }).roundRect?.(r.x, r.y + r.h - 6, r.w * p, 6, 3); ctx.fillStyle = item.col; ctx.fill(); }
    ctx.font = 'bold 20px system-ui'; ctx.textAlign = 'center'; ctx.fillStyle = isHov ? item.col : '#fff';
    ctx.fillText(item.label, W / 2, r.y + 28);
    ctx.font = '13px system-ui'; ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fillText(item.sub, W / 2, r.y + 50);
    nshd(ctx); ctx.restore();
  });

  ctx.font = 'bold 15px system-ui'; ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(255,200,100,0.75)';
  ctx.fillText('👋 Hover over a dish to select (1 second hold)', W / 2, H * 0.97);

  hands.forEach(h => drawHandCursor(ctx, h));
}

function handleMenuActivate(id: string, dispatch: Dispatch<GameAction>, dailySequence: MinigameId[]): void {
  audioSynth.resume(); audioSynth.select();
  switch (id) {
    case 'play':    dispatch({ type: 'START_GAME', mode: 'story',   sequence: STORY_SEQUENCE }); break;
    case 'endless': dispatch({ type: 'START_GAME', mode: 'endless', sequence: buildEndlessSequence(1) }); break;
    case 'daily':   dispatch({ type: 'START_GAME', mode: 'daily',   sequence: dailySequence }); break;
    case 'party':   dispatch({ type: 'NAVIGATE', screen: 'party-setup' }); break;
    case 'howto':   dispatch({ type: 'NAVIGATE', screen: 'howto' }); break;
    case 'settings':dispatch({ type: 'NAVIGATE', screen: 'settings' }); break;
    case 'leaderboard': dispatch({ type: 'NAVIGATE', screen: 'leaderboard' }); break;
    default: break;
  }
}
