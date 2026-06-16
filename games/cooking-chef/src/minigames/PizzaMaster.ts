import type { MinigameModule, MinigameContext } from '@/types/minigame';
import type { MinigameResult } from '@/types';
import { stirValue } from '@/mediapipe/GestureDetector';
import { drawKitchenBg, drawTimerBar, drawGestureHint, drawHandCursor, shd, nshd, rnd } from '@/game/drawHelpers';

const TOPPINGS = ['🍅', '🧀', '🫑', '🍄', '🫒', '🥓'];

interface Topping { emoji: string; x: number; y: number; placed: boolean; }

let doughSize = 60;
let doughAngle = 0;
let spinProgress = 0;
let toppings: Topping[] = [];
let sauce = false;
let baking = false;
let bakeTimer = 0;
let mgTime = 0;
let perfects = 0;
let phase: 'spin' | 'sauce' | 'toppings' | 'bake' = 'spin';

export const PizzaMasterModule: MinigameModule = {
  id: 'pizza-master', name: 'Pizza Master!', icon: '🍕',
  hint: 'Spin the dough, then add toppings!', duration: 15, maxScore: 500,

  init({ W, H }) {
    doughSize = 60; doughAngle = 0; spinProgress = 0; sauce = false;
    baking = false; bakeTimer = 0; mgTime = this.duration; perfects = 0; phase = 'spin';
    toppings = TOPPINGS.map(e => ({ emoji: e, x: rnd(W * 0.65, W * 0.9), y: rnd(H * 0.3, H * 0.7), placed: false }));
  },

  update({ ctx, W, H, dt, hands, particles, score, audio }): boolean | void {
    mgTime -= dt;
    const cx2 = W / 2, cy = H * 0.52;

    if (phase === 'spin') {
      hands.forEach(h => {
        if (!h.visible) return;
        const sv = stirValue(h);
        if (Math.abs(sv) > 6) {
          doughAngle += sv * 0.05;
          doughSize = Math.min(160, doughSize + Math.abs(sv) * 0.03);
          spinProgress = Math.min(1, spinProgress + Math.abs(sv) * 0.003);
          score.add(Math.round(Math.abs(sv) * 0.3), h.x, h.y - 30);
          score.addCombo(audio);
          if (Math.random() < 0.2) audio.stir();
          if (spinProgress > 0.3) particles.steam(cx2 + rnd(-30, 30), cy - doughSize - 20);
        }
      });
      if (spinProgress >= 1) { phase = 'sauce'; score.add(100, cx2, cy - 80, 'PERFECT DOUGH! 🍕'); perfects++; audio.success(); }
    } else if (phase === 'sauce') {
      hands.forEach(h => {
        if (!h.visible) return;
        if (h.palm && Math.hypot(h.x - cx2, h.y - cy) < doughSize + 30) { sauce = true; }
      });
      if (sauce) { score.add(50, cx2, cy, 'SAUCE ADDED! 🍅'); phase = 'toppings'; audio.place(); }
    } else if (phase === 'toppings') {
      hands.forEach(h => {
        if (!h.visible || !h.pinch || h.lastPinch) return;
        toppings.forEach(t => {
          if (t.placed) return;
          if (Math.hypot(h.x - t.x, h.y - t.y) < 40) {
            t.placed = true; t.x = cx2 + rnd(-doughSize * 0.8, doughSize * 0.8); t.y = cy + rnd(-doughSize * 0.4, doughSize * 0.4);
            score.add(40, t.x, t.y, 'TOPPING! ✓'); score.addCombo(audio); audio.catch_();
            particles.burst(t.x, t.y, '#ff7c2e', 8);
          }
        });
      });
      if (toppings.filter(t => t.placed).length >= 4) { phase = 'bake'; bakeTimer = 2.5; audio.success(); }
    } else if (phase === 'bake') {
      baking = true; bakeTimer -= dt;
      if (bakeTimer <= 0) { score.add(150, cx2, cy, 'PERFECT PIZZA! 🔥'); perfects++; audio.fanfare(); particles.confetti(cx2, cy); return true; }
    }

    // Draw
    drawKitchenBg(ctx, W, H);
    ctx.save();
    // Counter/oven
    if (baking) {
      ctx.fillStyle = '#442200'; ctx.fillRect(cx2 - 200, cy - 150, 400, 300);
      ctx.strokeStyle = '#ff6600'; ctx.lineWidth = 4; ctx.strokeRect(cx2 - 200, cy - 150, 400, 300);
      ctx.fillStyle = `rgba(255,80,0,${0.1 + 0.05 * Math.sin(performance.now() * 0.005)})`;
      ctx.fillRect(cx2 - 200, cy - 150, 400, 300);
    }

    // Dough
    ctx.save(); ctx.translate(cx2, cy); ctx.rotate(doughAngle * 0.02);
    const dg = ctx.createRadialGradient(0, 0, 5, 0, 0, doughSize);
    dg.addColorStop(0, '#ffe4a0'); dg.addColorStop(0.7, phase === 'bake' ? '#cc8800' : '#f5c842'); dg.addColorStop(1, phase === 'bake' ? '#884400' : '#d4a012');
    ctx.fillStyle = dg; ctx.beginPath(); ctx.ellipse(0, 0, doughSize, doughSize * 0.55, 0, 0, Math.PI * 2); ctx.fill();
    if (sauce) { ctx.fillStyle = 'rgba(220,40,0,0.5)'; ctx.beginPath(); ctx.ellipse(0, 0, doughSize * 0.8, doughSize * 0.42, 0, 0, Math.PI * 2); ctx.fill(); }
    toppings.filter(t => t.placed).forEach(t => { ctx.font = '22px system-ui'; ctx.textAlign = 'center'; ctx.fillText(t.emoji, t.x - cx2, t.y - cy + 8); });
    ctx.restore();

    // Spin progress ring
    if (phase === 'spin') {
      shd(ctx, '#ffd700', 15); ctx.strokeStyle = `rgba(255,215,0,0.6)`; ctx.lineWidth = 6;
      ctx.beginPath(); ctx.arc(cx2, cy, doughSize + 20, -Math.PI / 2, -Math.PI / 2 + spinProgress * Math.PI * 2); ctx.stroke(); nshd(ctx);
      ctx.font = 'bold 16px system-ui'; ctx.textAlign = 'center'; ctx.fillStyle = '#ffd700'; ctx.fillText('Spin to stretch! ' + Math.round(spinProgress * 100) + '%', cx2, cy - doughSize - 30);
    } else if (phase === 'toppings') {
      toppings.filter(t => !t.placed).forEach(t => { ctx.font = '36px system-ui'; ctx.textAlign = 'center'; ctx.fillText(t.emoji, t.x, t.y + 12); });
    }
    ctx.restore();

    drawTimerBar(ctx, mgTime, this.duration, W / 2 - 300, H * 0.12, 600, 16);
    const hints: Record<string, string> = { spin: 'Spin the dough! 🔄', sauce: 'Open palm on dough for sauce!', toppings: 'Pinch toppings and place them!', bake: 'Baking... 🔥' };
    drawGestureHint(ctx, W, hints[phase], '🍕');
    score.drawHUD(ctx, W, H);
    hands.forEach(h => drawHandCursor(ctx, h));
    particles.draw(ctx); score.draw(ctx);
  },

  finish({ score }): MinigameResult {
    return { score: score.roundScore, maxScore: this.maxScore, stars: score.computeStars(this.maxScore), perfectCount: perfects, combo: score.maxCombo };
  },
};
