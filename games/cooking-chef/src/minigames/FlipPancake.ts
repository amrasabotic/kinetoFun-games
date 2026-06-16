import type { MinigameModule, MinigameContext } from '@/types/minigame';
import type { MinigameResult } from '@/types';
import { detectSwipeUp } from '@/mediapipe/GestureDetector';
import { drawKitchenBg, drawTimerBar, drawGestureHint, drawHandCursor, shd, nshd } from '@/game/drawHelpers';

interface Pan { x: number; y: number; cook: number; maxCook: number; state: 'raw' | 'cooked' | 'burned'; done: boolean; flipping: boolean; flipY: number; flipVY: number; }

let pans: Pan[] = [];
let activeIdx = 0;
let flipCooldown = 0;
let mgTime = 0;
let perfects = 0;

export const FlipPancakeModule: MinigameModule = {
  id: 'flip-pancake', name: 'Flip the Pancake!', icon: '🥞',
  hint: 'Swipe UP at the right moment!', duration: 13, maxScore: 300,

  init({ W, H }) {
    pans = [0, 1, 2].map(i => ({ x: W / 2 + (i - 1) * 200, y: H * 0.58, cook: 0, maxCook: 3.5 + i * 0.3, state: 'raw' as const, done: false, flipping: false, flipY: 0, flipVY: 0 }));
    activeIdx = 0; flipCooldown = 0; mgTime = this.duration; perfects = 0;
  },

  update({ ctx, W, H, dt, hands, particles, score, audio }): boolean | void {
    mgTime -= dt;
    flipCooldown = Math.max(0, flipCooldown - dt);
    const pan = pans[activeIdx];

    if (pan && !pan.done) {
      if (!pan.flipping) {
        pan.cook += dt;
        const ratio = pan.cook / pan.maxCook;
        let flipped = false;
        hands.forEach(h => {
          if (!h.visible || flipCooldown > 0) return;
          if (detectSwipeUp(h) && Math.abs(h.x - pan.x) < 160) flipped = true;
        });
        if (flipped) {
          const r = pan.cook / pan.maxCook;
          let pts = 0, label = '';
          if (r >= 0.65 && r <= 0.9) { pts = 100; label = 'PERFECT! 🔥'; audio.perfect(); perfects++; }
          else if (r >= 0.5 && r <= 1.0) { pts = 70; label = 'GREAT!'; }
          else if (r >= 0.3) { pts = 40; label = 'GOOD'; }
          else { pts = 0; label = 'TOO SOON'; score.breakCombo(); audio.miss(); }
          if (pts > 0) { score.add(pts, pan.x, pan.y - 60, label); score.addCombo(audio); audio.flip(); }
          pan.flipping = true; pan.flipY = 0; pan.flipVY = -15; flipCooldown = 0.5;
        }
        if (pan.cook > pan.maxCook * 1.4 && pan.state !== 'burned') { pan.state = 'burned'; audio.miss(); score.breakCombo(); }
      } else {
        pan.flipY += pan.flipVY; pan.flipVY += 0.9;
        if (pan.flipY >= 0 && pan.flipVY > 0) {
          pan.flipping = false; pan.flipY = 0; pan.state = 'cooked'; pan.done = true;
          particles.burst(pan.x, pan.y, '#ffd700', 16);
          setTimeout(() => { if (activeIdx < pans.length - 1) activeIdx++; }, 400);
        }
      }
    }

    // Draw
    drawKitchenBg(ctx, W, H);
    pans.forEach((p, i) => {
      const isActive = i === activeIdx;
      ctx.save(); ctx.translate(p.x, p.y);
      ctx.fillStyle = '#222'; ctx.beginPath(); ctx.ellipse(0, 0, 80, 22, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#333'; ctx.beginPath(); ctx.ellipse(0, -6, 74, 18, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#111'; ctx.beginPath();
      (ctx as unknown as { roundRect?(x: number, y: number, w: number, h: number, r: number): void }).roundRect?.(74, -8, 60, 14, 5);
      ctx.fill();

      const fOffset = p.flipping ? p.flipY : 0;
      const scaleY = p.flipping ? Math.cos(p.flipY * 0.15) : 1;
      if (!p.done || p.flipping) {
        const brown = p.cook / p.maxCook;
        const col = p.state === 'burned' ? '#331100' : `rgb(${Math.round(200 + 55 * (1 - brown))},${Math.round(160 - 90 * brown)},${Math.round(50 - 30 * brown)})`;
        ctx.save(); ctx.translate(0, fOffset); ctx.scale(1, Math.abs(scaleY));
        ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(0, -5, 58, 16, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = `rgba(0,0,0,${brown * 0.5})`;
        [[-20, 0], [5, -5], [15, 5], [-5, 5]].forEach(([dx, dy]) => { ctx.beginPath(); ctx.arc(dx, dy, 5, 0, Math.PI * 2); ctx.fill(); });
        ctx.restore();
      } else {
        ctx.fillStyle = '#ffd700'; ctx.font = '28px system-ui'; ctx.textAlign = 'center'; ctx.fillText('✓', 0, -10);
      }

      if (isActive && !p.done) {
        const ratio = p.cook / p.maxCook;
        const inWindow = ratio >= 0.65 && ratio <= 0.9;
        ctx.strokeStyle = inWindow ? '#44ff88' : 'rgba(255,255,255,0.3)'; ctx.lineWidth = inWindow ? 3 : 1.5;
        if (inWindow) shd(ctx, '#44ff88', 15);
        ctx.beginPath(); ctx.ellipse(0, -6, 82, 22, 0, 0, Math.PI * 2); ctx.stroke(); nshd(ctx);
        ctx.strokeStyle = 'rgba(255,200,50,0.7)'; ctx.lineWidth = 5;
        ctx.beginPath(); ctx.arc(0, -6, 90, -Math.PI / 2, -Math.PI / 2 + ratio * Math.PI * 2); ctx.stroke();
        if (inWindow) { ctx.save(); shd(ctx, '#44ff88', 20); ctx.font = 'bold 14px system-ui'; ctx.textAlign = 'center'; ctx.fillStyle = '#44ff88'; ctx.fillText('FLIP NOW! ☝', 0, 45); nshd(ctx); ctx.restore(); }
      }
      ctx.restore();
    });

    // Swipe trail
    hands.forEach(h => {
      if (!h.visible || h.vy > -3) return;
      ctx.save(); ctx.globalAlpha = 0.4; ctx.strokeStyle = '#44ff88'; ctx.lineWidth = 4;
      ctx.beginPath(); h.hist.slice(-8).forEach((p, i) => { i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y); }); ctx.stroke(); ctx.restore();
    });

    drawTimerBar(ctx, mgTime, this.duration, W / 2 - 300, H * 0.12, 600, 16);
    drawGestureHint(ctx, W, this.hint, '🥞');
    score.drawHUD(ctx, W, H);
    hands.forEach(h => drawHandCursor(ctx, h, '#ffd700'));
    particles.draw(ctx); score.draw(ctx);

    if (pans.every(p => p.done)) return true;
  },

  finish({ score }): MinigameResult {
    return { score: score.roundScore, maxScore: this.maxScore, stars: score.computeStars(this.maxScore), perfectCount: perfects, combo: score.maxCombo };
  },
};
