import type { HandData, GameAction, MinigameId } from '@/types';
import type { Dispatch } from 'react';
import { drawKitchenBg, drawHandCursor, card, shd, nshd } from '@/game/drawHelpers';
import { DwellSystem } from '@/systems/DwellSystem';
import { audioSynth } from '@/systems/AudioSynth';
import { storage } from '@/storage/localStorage';
import { STORY_SEQUENCE } from '@/hooks/useGameState';

const worldDwell = new DwellSystem(1100);

interface World {
  name: string;
  icon: string;
  col: string;
  stages: MinigameId[];
  starsNeeded: number;
}

const WORLDS: World[] = [
  { name: 'Countryside Kitchen', icon: '🌾', col: '#a8e06a', stages: STORY_SEQUENCE.slice(0, 2),  starsNeeded: 0  },
  { name: 'Harbor Bistro',        icon: '⛵', col: '#4dc8ff', stages: STORY_SEQUENCE.slice(2, 4),  starsNeeded: 4  },
  { name: 'Night Market',         icon: '🏮', col: '#ff7c2e', stages: STORY_SEQUENCE.slice(4, 6),  starsNeeded: 10 },
  { name: 'Mountain Retreat',     icon: '⛰', col: '#cc88ff', stages: STORY_SEQUENCE.slice(6, 8),  starsNeeded: 18 },
  { name: 'Royal Palace',         icon: '👑', col: '#ffd700', stages: STORY_SEQUENCE.slice(8, 10), starsNeeded: 28 },
  { name: 'Ultimate Arena',       icon: '🏆', col: '#ff4466', stages: STORY_SEQUENCE.slice(10, 12), starsNeeded: 40 },
];

export function initWorldMap(): void { /* reset anim state if needed */ }

export function updateWorldMap(dt: number, hands: HandData[], dispatch: Dispatch<GameAction>): void {
  void dt;
  const bh = hands.find(h => h.visible) ?? null;
  const fired = worldDwell.tick(bh);
  if (!fired) return;
  audioSynth.select();
  if (fired === 'back') { dispatch({ type: 'NAVIGATE', screen: 'menu' }); return; }
  const idx = parseInt(fired.replace('world_', ''), 10);
  if (isNaN(idx)) return;
  const prog = storage.getOrDefault('progress');
  const totalStars = prog.totalStars;
  const world = WORLDS[idx];
  if (!world) return;
  if (totalStars < world.starsNeeded) { audioSynth.miss(); return; }
  dispatch({ type: 'START_GAME', mode: 'story', sequence: world.stages });
}

export function drawWorldMap(ctx: CanvasRenderingContext2D, W: number, H: number, hands: HandData[]): void {
  drawKitchenBg(ctx, W, H);
  ctx.save(); shd(ctx, '#ffd700', 28);
  ctx.font = `bold ${Math.round(H * 0.065)}px system-ui`; ctx.textAlign = 'center'; ctx.fillStyle = '#ffd700';
  ctx.fillText('🗺 WORLD MAP', W / 2, H * 0.13); nshd(ctx); ctx.restore();

  const prog = storage.getOrDefault('progress');
  const totalStars = prog.totalStars;

  ctx.font = 'bold 16px system-ui'; ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(255,215,0,0.85)';
  ctx.fillText(`⭐ Total Stars: ${totalStars}`, W / 2, H * 0.2);

  const cols = 3, bw = Math.min(240, W * 0.28), bh = 100, gap = 16;
  const totalW = cols * bw + (cols - 1) * gap;
  const startX = W / 2 - totalW / 2;
  const startY = H * 0.27;

  const regions = WORLDS.map((w, i) => ({
    id: `world_${i}`,
    x: startX + (i % cols) * (bw + gap),
    y: startY + Math.floor(i / cols) * (bh + gap),
    w: bw, h: bh,
  }));
  regions.push({ id: 'back', x: W / 2 - 110, y: H * 0.91, w: 220, h: 50 });
  worldDwell.setRegions(regions);
  const { id: hovId, p } = worldDwell.progress();

  WORLDS.forEach((world, i) => {
    const r = regions[i];
    const locked = totalStars < world.starsNeeded;
    const hov = hovId === `world_${i}` && !locked;
    ctx.save();
    if (hov) shd(ctx, world.col, 20);
    card(ctx, r.x, r.y, bw, bh, 16,
      locked ? 'rgba(0,0,0,0.55)' : (hov ? `${world.col}22` : 'rgba(0,0,0,0.5)'),
      locked ? 'rgba(255,255,255,0.1)' : (hov ? world.col : `${world.col}66`),
      hov ? 3 : 2);
    if (locked) ctx.globalAlpha = 0.4;
    ctx.font = '30px system-ui'; ctx.textAlign = 'center';
    ctx.fillText(locked ? '🔒' : world.icon, r.x + bw / 2, r.y + 44);
    ctx.globalAlpha = 1;
    ctx.font = `bold 13px system-ui`; ctx.fillStyle = locked ? 'rgba(255,255,255,0.3)' : '#fff';
    ctx.fillText(world.name, r.x + bw / 2, r.y + 66);
    ctx.font = '11px system-ui'; ctx.fillStyle = locked ? '#ff6666' : 'rgba(255,200,100,0.75)';
    ctx.fillText(locked ? `Need ⭐${world.starsNeeded}` : `${world.stages.length} stages`, r.x + bw / 2, r.y + 84);
    if (hov && p > 0) {
      ctx.beginPath();
      (ctx as unknown as { roundRect?(x: number, y: number, w: number, h: number, r: number): void }).roundRect?.(r.x, r.y + bh - 6, bw * p, 6, 3);
      ctx.fillStyle = world.col; ctx.fill();
    }
    nshd(ctx); ctx.restore();
  });

  const backR = regions[regions.length - 1];
  const hov = hovId === 'back';
  ctx.save(); if (hov) shd(ctx, '#ff7c2e', 18);
  card(ctx, backR.x, backR.y, 220, 50, 14, hov ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.07)', hov ? '#ff7c2e' : 'rgba(255,255,255,0.2)', hov ? 3 : 2);
  if (hov && p > 0) { ctx.beginPath(); (ctx as unknown as { roundRect?(x: number, y: number, w: number, h: number, r: number): void }).roundRect?.(backR.x, backR.y + 44, 220 * p, 6, 3); ctx.fillStyle = '#ff7c2e'; ctx.fill(); }
  ctx.font = 'bold 17px system-ui'; ctx.textAlign = 'center'; ctx.fillStyle = hov ? '#ff7c2e' : '#fff';
  ctx.fillText('← MAIN MENU', W / 2, backR.y + 31);
  nshd(ctx); ctx.restore();

  hands.forEach(h => drawHandCursor(ctx, h));
}
