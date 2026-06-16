import type { HandData, GameAction } from '@/types';
import type { Dispatch } from 'react';
import { drawKitchenBg, drawHandCursor, card, shd, nshd } from '@/game/drawHelpers';
import { DwellSystem } from '@/systems/DwellSystem';
import { audioSynth } from '@/systems/AudioSynth';

const howtoDwell = new DwellSystem(1100);

const GESTURES = [
  { icon: '✌', name: 'Pinch',          desc: 'Thumb + index close together' },
  { icon: '🖐', name: 'Open Palm',      desc: 'All fingers spread wide open' },
  { icon: '✊', name: 'Fist',           desc: 'All fingers curled in' },
  { icon: '👍', name: 'Thumbs Up',      desc: 'Thumb up, fingers closed' },
  { icon: '⬆', name: 'Swipe Up',       desc: 'Fast upward flick' },
  { icon: '⬇', name: 'Swipe Down',     desc: 'Fast downward karate chop' },
  { icon: '⬅', name: 'Swipe Left',     desc: 'Fast leftward flick' },
  { icon: '➡', name: 'Swipe Right',    desc: 'Fast rightward flick' },
  { icon: '🔄', name: 'Circular Stir', desc: 'Move wrist in a circle' },
  { icon: '🤝', name: 'Two-Hand Fold', desc: 'Both hands pinch toward center' },
];

export function updateHowTo(dt: number, hands: HandData[], dispatch: Dispatch<GameAction>): void {
  void dt;
  const bh = hands.find(h => h.visible) ?? null;
  const fired = howtoDwell.tick(bh);
  if (fired === 'back') { audioSynth.select(); dispatch({ type: 'NAVIGATE', screen: 'menu' }); }
}

export function drawHowTo(ctx: CanvasRenderingContext2D, W: number, H: number, hands: HandData[]): void {
  drawKitchenBg(ctx, W, H);
  ctx.save(); shd(ctx, '#cc88ff', 28);
  ctx.font = `bold ${Math.round(H * 0.065)}px system-ui`; ctx.textAlign = 'center'; ctx.fillStyle = '#cc88ff';
  ctx.fillText('📖 HOW TO PLAY', W / 2, H * 0.12); nshd(ctx); ctx.restore();

  ctx.font = '15px system-ui'; ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.fillText('All navigation and gameplay uses hand gestures only — no mouse or keyboard!', W / 2, H * 0.2);

  const cols = 2, bw = Math.min(320, W * 0.37), bh = 58, gap = 10;
  const totalW = cols * bw + (cols - 1) * gap;
  const sx = W / 2 - totalW / 2, sy = H * 0.26;
  GESTURES.forEach((g, i) => {
    const col = i % cols, row = Math.floor(i / cols);
    const x = sx + col * (bw + gap), y = sy + row * (bh + gap);
    card(ctx, x, y, bw, bh, 12, 'rgba(0,0,0,0.5)', 'rgba(204,136,255,0.3)', 1.5);
    ctx.font = '26px system-ui'; ctx.textAlign = 'left'; ctx.fillText(g.icon, x + 12, y + 38);
    ctx.font = 'bold 14px system-ui'; ctx.fillStyle = '#cc88ff'; ctx.fillText(g.name, x + 50, y + 26);
    ctx.font = '12px system-ui'; ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.fillText(g.desc, x + 50, y + 46);
  });

  ctx.font = '14px system-ui'; ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(255,200,100,0.75)';
  ctx.fillText('💡 Dwell (hover) over any button for 1 second to activate it', W / 2, H * 0.9);

  const backR = [{ id: 'back', x: W / 2 - 110, y: H * 0.93, w: 220, h: 50 }];
  howtoDwell.setRegions(backR);
  const { id: hovId, p } = howtoDwell.progress();
  const hov = hovId === 'back';
  ctx.save(); if (hov) shd(ctx, '#ff7c2e', 18);
  card(ctx, backR[0].x, backR[0].y, 220, 50, 14, hov ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.07)', hov ? '#ff7c2e' : 'rgba(255,255,255,0.2)', hov ? 3 : 2);
  if (hov && p > 0) { ctx.beginPath(); (ctx as unknown as { roundRect?(x: number, y: number, w: number, h: number, r: number): void }).roundRect?.(backR[0].x, backR[0].y + 44, 220 * p, 6, 3); ctx.fillStyle = '#ff7c2e'; ctx.fill(); }
  ctx.font = 'bold 17px system-ui'; ctx.textAlign = 'center'; ctx.fillStyle = hov ? '#ff7c2e' : '#fff';
  ctx.fillText('← MAIN MENU', W / 2, backR[0].y + 31);
  nshd(ctx); ctx.restore();

  hands.forEach(h => drawHandCursor(ctx, h));
}
