import type { MinigameModule, MinigameContext } from '@/types/minigame';
import type { MinigameResult } from '@/types';
import { detectSwipeLeft, detectSwipeRight } from '@/mediapipe/GestureDetector';
import { drawKitchenBg, drawTimerBar, drawGestureHint, drawHandCursor, card, shd, nshd, rnd } from '@/game/drawHelpers';

interface Meat { x: number; y: number; cook: number; maxCook: number; flipped: boolean; done: boolean; burned: boolean; emoji: string; flipAnim: number; flipVY: number; }

const MEATS = ['🥩', '🍗', '🌭', '🍔'];

let meats: Meat[] = [];
let flipCooldown = 0;
let mgTime = 0;
let perfects = 0;

export const BBQGrillModule: MinigameModule = {
  id: 'bbq-grill', name: 'BBQ Grill Master!', icon: '🔥',
  hint: 'Hover to cook, swipe to flip!', duration: 13, maxScore: 460,

  init({ W, H }) {
    meats = Array.from({ length: 4 }, (_, i) => ({
      x: W * 0.25 + i * (W * 0.17), y: H * 0.54, cook: 0, maxCook: 3 + i * 0.5,
      flipped: false, done: false, burned: false, emoji: MEATS[i % MEATS.length], flipAnim: 0, flipVY: 0,
    }));
    flipCooldown = 0; mgTime = this.duration; perfects = 0;
  },

  update({ ctx, W, H, dt, hands, particles, score, audio }): boolean | void {
    mgTime -= dt;
    flipCooldown = Math.max(0, flipCooldown - dt);
    const grillY = H * 0.55;

    meats.forEach(m => {
      if (m.done || m.burned) return;
      // Cook from hand hover
      hands.forEach(h => {
        if (!h.visible) return;
        if (h.palm && Math.hypot(h.x - m.x, h.y - m.y) < 50) {
          m.cook += dt * 0.6;
          if (Math.random() < 0.08) { audio.sizzle(); particles.steam(m.x, m.y - 20); }
        }
      });
      // Flip with swipe
      if (flipCooldown <= 0) {
        hands.forEach(h => {
          if (!h.visible) return;
          const isSwipe = detectSwipeLeft(h) || detectSwipeRight(h);
          if (isSwipe && Math.abs(h.y - m.y) < 80 && Math.abs(h.x - m.x) < 80) {
            const r = m.cook / m.maxCook;
            if (r >= 0.45 && r <= 0.55 && !m.flipped) {
              m.flipped = true; m.flipVY = -14; m.flipAnim = 0;
              score.add(100, m.x, m.y, 'PERFECT FLIP! 🔥'); score.addCombo(audio); audio.flip(); perfects++;
            } else if (!m.flipped) {
              m.flipped = true; m.flipVY = -14; m.flipAnim = 0;
              score.add(40, m.x, m.y, 'FLIP'); score.addCombo(audio); audio.flip();
            }
            flipCooldown = 0.4;
          }
        });
      }
      // Flip animation
      if (m.flipped && m.flipVY !== 0) {
        m.flipAnim += m.flipVY; m.flipVY += 0.9;
        if (m.flipAnim >= 0 && m.flipVY > 0) { m.flipAnim = 0; m.flipVY = 0; m.cook += 0.5; }
      }
      if (m.cook >= m.maxCook * 0.9 && m.flipped) { m.done = true; score.add(80, m.x, m.y, 'COOKED! ✓'); particles.burst(m.x, m.y, '#ff7c2e', 14); audio.success(); }
      if (m.cook > m.maxCook * 1.6) { m.burned = true; score.breakCombo(); audio.fail(); }
    });

    // Draw
    drawKitchenBg(ctx, W, H);
    // Grill rack
    ctx.save();
    ctx.fillStyle = '#222'; ctx.fillRect(W * 0.15, grillY - 30, W * 0.7, 80);
    ctx.strokeStyle = '#666'; ctx.lineWidth = 6;
    for (let i = 0; i <= 6; i++) { ctx.beginPath(); ctx.moveTo(W * 0.15 + i * (W * 0.7 / 6), grillY - 30); ctx.lineTo(W * 0.15 + i * (W * 0.7 / 6), grillY + 50); ctx.stroke(); }
    // Grill marks light
    ctx.fillStyle = 'rgba(255,80,0,0.15)'; ctx.fillRect(W * 0.15, grillY - 30, W * 0.7, 80);

    meats.forEach(m => {
      ctx.save(); ctx.translate(m.x, m.y + m.flipAnim);
      const browning = Math.min(1, m.cook / m.maxCook);
      if (m.burned) { ctx.globalAlpha = 0.5; }
      // Meat body
      ctx.fillStyle = m.burned ? '#221100' : `rgb(${Math.round(180 - browning * 80)},${Math.round(80 - browning * 40)},${Math.round(30 - browning * 20)})`;
      ctx.beginPath(); ctx.ellipse(0, 0, 38, 22, 0, 0, Math.PI * 2); ctx.fill();
      ctx.font = '30px system-ui'; ctx.textAlign = 'center'; ctx.fillText(m.emoji, 0, 10);

      if (!m.done && !m.burned) {
        const r = m.cook / m.maxCook;
        const inWindow = r >= 0.4 && r <= 0.6 && !m.flipped;
        if (inWindow) { shd(ctx, '#44ff88', 15); }
        ctx.strokeStyle = inWindow ? '#44ff88' : `rgba(255,${Math.round(200 - r * 150)},0,0.7)`; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.ellipse(0, 0, 44, 26, 0, 0, Math.PI * 2); ctx.stroke(); nshd(ctx);
        // Cook arc
        ctx.strokeStyle = `rgba(255,100,0,0.5)`; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.arc(0, 0, 50, -Math.PI / 2, -Math.PI / 2 + r * Math.PI * 2); ctx.stroke();
      }
      if (m.done) { ctx.font = '18px system-ui'; ctx.fillStyle = '#44ff88'; ctx.textAlign = 'center'; ctx.fillText('✓', 0, -35); }
      if (m.burned) { ctx.font = '18px system-ui'; ctx.fillStyle = '#ff3344'; ctx.textAlign = 'center'; ctx.fillText('💀', 0, -35); }
      ctx.restore();
    });
    // Steam / grill smoke
    if (Math.random() < 0.08) { particles.steam(W * 0.2 + Math.random() * W * 0.6, grillY - 30); }
    ctx.restore();

    // Palm cursor indicators
    hands.forEach(h => {
      if (!h.visible) return;
      drawHandCursor(ctx, h, h.palm ? '#ff7c2e' : '#fff');
      if (h.palm) { ctx.save(); ctx.globalAlpha = 0.2; ctx.fillStyle = '#ff7c2e'; ctx.beginPath(); ctx.arc(h.x, h.y, 45, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
    });

    drawTimerBar(ctx, mgTime, this.duration, W / 2 - 300, H * 0.12, 600, 16);
    drawGestureHint(ctx, W, this.hint, '🔥');
    score.drawHUD(ctx, W, H);
    particles.draw(ctx); score.draw(ctx);

    if (meats.every(m => m.done || m.burned)) return true;
  },

  finish({ score }): MinigameResult {
    return { score: score.roundScore, maxScore: this.maxScore, stars: score.computeStars(this.maxScore), perfectCount: perfects, combo: score.maxCombo };
  },
};
