import type { MinigameModule, MinigameContext } from '@/types/minigame';
import type { MinigameResult } from '@/types';
import { detectChopDown } from '@/mediapipe/GestureDetector';
import { drawKitchenBg, drawTimerBar, drawGestureHint, drawHandCursor, card, shd, nshd, rnd } from '@/game/drawHelpers';

const GOOD_FRUIT = ['🍓', '🍇', '🥭', '🍍', '🍌', '🍊', '🫐'];
const BAD_FRUIT  = ['🤢', '🦠'];

interface Fruit { emoji: string; x: number; y: number; vy: number; good: boolean; chopped: boolean; missed: boolean; wobble: number; }

let fruits: Fruit[] = [];
let blenderFill = 0;
let chopCooldown = 0;
let mgTime = 0;
let perfects = 0;

export const SmoothieFrenzyModule: MinigameModule = {
  id: 'smoothie-frenzy', name: 'Smoothie Frenzy!', icon: '🥤',
  hint: 'Chop down fast on falling fruit!', duration: 12, maxScore: 480,

  init({ W, H }) {
    fruits = Array.from({ length: 16 }, (_, i) => {
      const bad = Math.random() < 0.15;
      const arr = bad ? BAD_FRUIT : GOOD_FRUIT;
      return { emoji: arr[Math.floor(Math.random() * arr.length)], x: rnd(W * 0.15, W * 0.85), y: -(i * 80 + rnd(20, 60)), vy: 2.5 + Math.random() * 2, good: !bad, chopped: false, missed: false, wobble: Math.random() * Math.PI * 2 };
    });
    blenderFill = 0; chopCooldown = 0; mgTime = this.duration; perfects = 0;
  },

  update({ ctx, W, H, dt, hands, particles, score, audio }): boolean | void {
    mgTime -= dt;
    chopCooldown = Math.max(0, chopCooldown - dt);
    const speed = 1 + (1 - mgTime / this.duration) * 1.5;
    const blenderX = W / 2, blenderY = H * 0.75;

    fruits.forEach(f => {
      if (f.chopped || f.missed) return;
      f.y += f.vy * speed;
      f.wobble += 0.05;

      hands.forEach(h => {
        if (!h.visible || chopCooldown > 0) return;
        if (detectChopDown(h) && Math.hypot(h.x - f.x, h.y - f.y) < 50) {
          f.chopped = true;
          if (f.good) { blenderFill = Math.min(1, blenderFill + 0.1); score.add(50, f.x, f.y, 'CHOP!'); score.addCombo(audio); audio.chop(); particles.slice(f.x, f.y); perfects++; }
          else { score.breakCombo(); audio.fail(); particles.burst(f.x, f.y, '#ff3344', 10); score.add(0, f.x, f.y, 'BAD! 🤢'); }
          chopCooldown = 0.15;
        }
      });

      if (f.y > H + 60) { f.missed = true; if (f.good) { score.breakCombo(); audio.miss(); } }
    });

    // Draw
    drawKitchenBg(ctx, W, H);
    fruits.forEach(f => {
      if (f.chopped || f.missed) return;
      ctx.save(); ctx.translate(f.x + Math.sin(f.wobble) * 5, f.y);
      ctx.font = '38px system-ui'; ctx.textAlign = 'center'; ctx.fillText(f.emoji, 0, 14);
      ctx.restore();
    });

    // Blender
    ctx.save(); ctx.translate(blenderX, blenderY);
    ctx.fillStyle = 'rgba(255,255,255,0.15)'; ctx.beginPath();
    ctx.moveTo(-50, 0); ctx.lineTo(-40, -80); ctx.lineTo(40, -80); ctx.lineTo(50, 0); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = 3; ctx.stroke();
    if (blenderFill > 0) {
      const fillH = 80 * blenderFill;
      const col = `hsl(${300 - blenderFill * 120}, 80%, 60%)`;
      ctx.fillStyle = col; ctx.beginPath();
      ctx.moveTo(-50 + (1 - blenderFill) * 10, -fillH);
      ctx.lineTo(50 - (1 - blenderFill) * 10, -fillH);
      ctx.lineTo(50, 0); ctx.lineTo(-50, 0); ctx.closePath(); ctx.fill();
    }
    ctx.font = 'bold 14px system-ui'; ctx.textAlign = 'center'; ctx.fillStyle = '#fff';
    ctx.fillText(`${Math.round(blenderFill * 100)}%`, 0, -90);
    ctx.restore();

    // Chop trail
    hands.forEach(h => {
      if (!h.visible || Math.abs(h.vy) < 5) return;
      ctx.save(); ctx.globalAlpha = 0.45; ctx.strokeStyle = '#ff7c2e'; ctx.lineWidth = 4;
      ctx.beginPath(); h.hist.slice(-6).forEach((p, i) => { i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y); }); ctx.stroke(); ctx.restore();
    });

    drawTimerBar(ctx, mgTime, this.duration, W / 2 - 300, H * 0.12, 600, 16);
    drawGestureHint(ctx, W, this.hint, '🥤');
    score.drawHUD(ctx, W, H);
    hands.forEach(h => drawHandCursor(ctx, h, '#ff7c2e'));
    particles.draw(ctx); score.draw(ctx);
  },

  finish({ score }): MinigameResult {
    if (blenderFill >= 0.8) score.add(100, 0, 0, 'FULL BLEND!');
    return { score: score.roundScore, maxScore: this.maxScore, stars: score.computeStars(this.maxScore), perfectCount: perfects, combo: score.maxCombo };
  },
};
