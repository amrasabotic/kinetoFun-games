import type { HandData, GameAction } from '@/types';
import type { Dispatch } from 'react';
import { drawKitchenBg, drawHandCursor, card, shd, nshd } from '@/game/drawHelpers';
import { audioSynth } from '@/systems/AudioSynth';

const THUMB_HOLD = 1.2;
let thumbTimer = 0;
let handCount = 0;

export function initCalibration(): void { thumbTimer = 0; }

export function updateCalibration(dt: number, hands: HandData[], dispatch: Dispatch<GameAction>): void {
  handCount = hands.filter(h => h.visible).length;
  const anyThumb = hands.some(h => h.visible && h.thumbUp);
  if (anyThumb) {
    thumbTimer += dt;
    if (thumbTimer >= THUMB_HOLD) { audioSynth.resume(); audioSynth.fanfare(); dispatch({ type: 'CALIBRATION_DONE' }); thumbTimer = 0; }
  } else {
    thumbTimer = Math.max(0, thumbTimer - dt * 2);
  }
}

export function drawCalibration(ctx: CanvasRenderingContext2D, W: number, H: number, hands: HandData[]): void {
  drawKitchenBg(ctx, W, H);

  ctx.save();
  shd(ctx, '#ff7c2e', 30);
  ctx.font = `bold ${Math.round(W * 0.065)}px system-ui`;
  ctx.textAlign = 'center'; ctx.fillStyle = '#ff7c2e';
  ctx.fillText('🍳 COOKING CHEF', W / 2, H * 0.18);
  nshd(ctx);

  card(ctx, W / 2 - 320, H * 0.26, 640, 210, 20, 'rgba(0,0,0,0.6)', 'rgba(255,124,46,0.4)', 2);
  ctx.font = 'bold 26px system-ui'; ctx.fillStyle = 'rgba(255,220,150,0.95)'; ctx.textAlign = 'center';
  ctx.fillText('Welcome, Chef! 👨‍🍳', W / 2, H * 0.26 + 52);
  ctx.font = '17px system-ui'; ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.fillText('Raise your hands and give a 👍 Thumbs Up to begin!', W / 2, H * 0.26 + 88);
  ctx.fillText('Use gestures only — no mouse or keyboard needed.', W / 2, H * 0.26 + 118);
  ctx.restore();

  const hy = H * 0.62;
  [0, 1].forEach(i => {
    const hx = W / 2 + (i === 0 ? -90 : 90);
    const h = hands[i];
    const vis = h?.visible;
    const col = vis ? (h.thumbUp ? '#44ff88' : '#ff7c2e') : 'rgba(255,255,255,0.2)';
    ctx.save(); shd(ctx, col, vis ? 25 : 0);
    ctx.strokeStyle = col; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(hx, hy, 44, 0, Math.PI * 2); ctx.stroke(); nshd(ctx);
    ctx.font = '36px system-ui'; ctx.textAlign = 'center'; ctx.fillText('✋', hx, hy + 14);
    ctx.font = 'bold 12px system-ui'; ctx.fillStyle = col;
    ctx.fillText(i === 0 ? 'LEFT HAND' : 'RIGHT HAND', hx, hy + 68);
    ctx.fillText(vis ? (h.thumbUp ? '👍 THUMBS UP!' : '✓ DETECTED') : 'NOT DETECTED', hx, hy + 88);
    ctx.restore();
  });

  if (thumbTimer > 0) {
    const p = thumbTimer / THUMB_HOLD;
    ctx.save(); shd(ctx, '#44ff88', 20);
    ctx.strokeStyle = '#44ff88'; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.arc(W / 2, hy, 110, -Math.PI / 2, -Math.PI / 2 + p * Math.PI * 2); ctx.stroke(); nshd(ctx);
    ctx.font = 'bold 20px system-ui'; ctx.textAlign = 'center'; ctx.fillStyle = '#44ff88';
    ctx.fillText('Hold it! ' + (THUMB_HOLD - thumbTimer).toFixed(1) + 's', W / 2, hy + 130);
    ctx.restore();
  } else if (handCount >= 1) {
    ctx.font = 'bold 18px system-ui'; ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(255,200,100,0.9)';
    ctx.fillText('Now give a 👍 Thumbs Up!', W / 2, hy + 130);
  } else {
    ctx.font = '18px system-ui'; ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fillText('Raise your hand(s) in front of the camera', W / 2, hy + 130);
  }

  hands.forEach(h => drawHandCursor(ctx, h));
}
