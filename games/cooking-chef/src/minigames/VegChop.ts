import type { MinigameModule, MinigameContext } from '@/types/minigame';
import type { MinigameResult } from '@/types';
import { detectChopDown } from '@/mediapipe/GestureDetector';
import { drawKitchenBg, drawTimerBar, drawGestureHint, drawHandCursor, card, shd, nshd, rnd } from '@/game/drawHelpers';

interface Veg {
  x: number; y: number; r: number; hp: number; maxHp: number;
  emoji: string; col: string;
  sliced: boolean; flash: number; shake: number; dy: number;
}

const VEG_TYPES = [
  { emoji: '🥕', col: '#ff8822' }, { emoji: '🍅', col: '#ff2222' },
  { emoji: '🥒', col: '#44cc44' }, { emoji: '🧅', col: '#ffcc88' }, { emoji: '🍄', col: '#997755' },
];

let vegs: Veg[] = [];
let chopCooldown = 0;
let mgTime = 0;
let totalPts = 0;
let perfects = 0;

export const VegChopModule: MinigameModule = {
  id: 'veg-chop', name: 'Vegetable Chop!', icon: '🥕',
  hint: 'Chop down fast!', duration: 12, maxScore: 500,

  init({ W, H }) {
    vegs = VEG_TYPES.map((vt, i) => ({
      x: W * 0.15 + i * (W * 0.7 / 4), y: H * 0.58, r: 44,
      hp: 2, maxHp: 2, ...vt, sliced: false,
      flash: 0, shake: 0, dy: 0,
    }));
    chopCooldown = 0; mgTime = this.duration; totalPts = 0; perfects = 0;
  },

  update({ ctx, W, H, dt, hands, particles, score, audio }): boolean | void {
    mgTime -= dt;
    chopCooldown = Math.max(0, chopCooldown - dt);

    hands.forEach(h => {
      if (!h.visible || chopCooldown > 0) return;
      if (detectChopDown(h)) {
        vegs.forEach(v => {
          if (v.sliced) return;
          if (Math.hypot(h.x - v.x, h.y - v.y) < v.r + 30) {
            v.hp--; v.flash = 0.25; v.shake = 8;
            audio.chop(); particles.slice(v.x, v.y);
            if (v.hp <= 0) {
              v.sliced = true; v.dy = -8;
              const pts = score.add(80, v.x, v.y, 'CHOP!'); totalPts += pts;
              score.addCombo(audio); audio.sizzle(); particles.burst(v.x, v.y, '#ff7c2e', 20);
              perfects++;
            } else {
              score.add(20, v.x, v.y, 'SLICE!');
            }
            chopCooldown = 0.18;
          }
        });
      }
    });

    vegs.forEach(v => {
      v.flash = Math.max(0, v.flash - dt); v.shake = Math.max(0, v.shake - dt * 30);
      if (v.sliced) { v.y += v.dy; v.dy += 0.5; }
    });

    // Draw
    drawKitchenBg(ctx, W, H);
    card(ctx, W / 2 - 350, H * 0.5, 700, H * 0.22, 16, '#8B5E3C', '#6B4020', 4);
    ctx.strokeStyle = 'rgba(0,0,0,0.1)'; ctx.lineWidth = 2;
    for (let i = 0; i < 8; i++) { ctx.beginPath(); ctx.moveTo(W / 2 - 340, H * 0.5 + i * 14 + 10); ctx.lineTo(W / 2 + 340, H * 0.5 + i * 14 + 10); ctx.stroke(); }

    vegs.forEach(v => {
      if (v.sliced && v.y > H + 100) return;
      const sx = v.shake * Math.sin(performance.now() * 0.08);
      ctx.save(); ctx.translate(v.x + sx, v.y);
      if (v.flash > 0) shd(ctx, v.col, 25);
      ctx.font = (v.r * 1.8) + 'px system-ui'; ctx.textAlign = 'center';
      ctx.fillText(v.emoji, 0, v.r * 0.6);
      if (!v.sliced && v.hp < v.maxHp) { ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-10, -v.r * 0.5); ctx.lineTo(10, v.r * 0.5); ctx.stroke(); }
      if (v.sliced) { ctx.globalAlpha = 0.5; ctx.font = '16px system-ui'; ctx.fillStyle = '#44ff88'; ctx.fillText('✓', 0, -v.r); ctx.globalAlpha = 1; }
      nshd(ctx); ctx.restore();
    });

    // Chop trail
    hands.forEach(h => {
      if (!h.visible || Math.abs(h.vy) < 5) return;
      ctx.save(); ctx.globalAlpha = 0.4; ctx.strokeStyle = '#ff7c2e'; ctx.lineWidth = 4;
      ctx.beginPath(); h.hist.slice(-6).forEach((p, i) => { i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y); }); ctx.stroke(); ctx.restore();
    });

    drawTimerBar(ctx, mgTime, this.duration, W / 2 - 300, H * 0.12, 600, 16);
    drawGestureHint(ctx, W, this.hint, '🥕');
    score.drawHUD(ctx, W, H);
    hands.forEach(h => drawHandCursor(ctx, h, '#ff7c2e'));
    particles.draw(ctx); score.draw(ctx);

    if (vegs.every(v => v.sliced)) { score.add(100, W / 2, H * 0.3, 'PERFECT! 🔥'); return true; }
  },

  finish({ score }): MinigameResult {
    return { score: score.roundScore, maxScore: this.maxScore, stars: score.computeStars(this.maxScore), perfectCount: perfects, combo: score.maxCombo };
  },
};
