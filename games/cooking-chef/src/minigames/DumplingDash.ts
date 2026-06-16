import type { MinigameModule, MinigameContext } from '@/types/minigame';
import type { MinigameResult } from '@/types';
import { detectTwoHandFold } from '@/mediapipe/GestureDetector';
import { drawKitchenBg, drawTimerBar, drawGestureHint, drawHandCursor, card, shd, nshd, rnd } from '@/game/drawHelpers';

interface Dumpling { x: number; y: number; state: 'raw' | 'folding' | 'done'; foldProgress: number; wobble: number; }

let dumplings: Dumpling[] = [];
let foldCooldown = 0;
let steamTimer = 0;
let mgTime = 0;
let perfects = 0;

export const DumplingDashModule: MinigameModule = {
  id: 'dumpling-dash', name: 'Dumpling Dash!', icon: '🥟',
  hint: 'Squeeze both hands together to fold!', duration: 13, maxScore: 450,

  init({ W, H }) {
    dumplings = Array.from({ length: 8 }, (_, i) => ({
      x: W * 0.15 + i * (W * 0.7 / 7), y: H * 0.52 + (i % 2) * 60 - 30,
      state: 'raw' as const, foldProgress: 0, wobble: Math.random() * Math.PI * 2,
    }));
    foldCooldown = 0; steamTimer = 0; mgTime = this.duration; perfects = 0;
  },

  update({ ctx, W, H, dt, hands, particles, score, audio }): boolean | void {
    mgTime -= dt;
    foldCooldown = Math.max(0, foldCooldown - dt);
    steamTimer += dt;
    if (steamTimer > 0.4) { steamTimer = 0; dumplings.filter(d => d.state === 'done').forEach(d => particles.steam(d.x, d.y - 20)); }

    const folding = detectTwoHandFold(hands[0], hands[1]);

    dumplings.forEach(d => {
      d.wobble += 0.04;
      if (d.state !== 'raw') return;
      const handNear = hands.some(h => h.visible && Math.hypot(h.x - d.x, h.y - d.y) < 70);
      if (handNear && folding && foldCooldown <= 0) {
        d.foldProgress = Math.min(1, d.foldProgress + dt * 2);
        if (d.foldProgress >= 1) {
          d.state = 'done'; foldCooldown = 0.25;
          score.add(80, d.x, d.y, 'FOLDED! 🥟'); score.addCombo(audio); audio.place();
          particles.burst(d.x, d.y, '#ffe0b0', 12); perfects++;
        }
      } else if (!folding) {
        d.foldProgress = Math.max(0, d.foldProgress - dt * 3);
      }
    });

    // Draw
    drawKitchenBg(ctx, W, H);
    // Bamboo steamer
    card(ctx, W / 2 - 380, H * 0.44, 760, H * 0.28, 20, '#8B6914', '#6B4020', 4);
    card(ctx, W / 2 - 380, H * 0.44, 760, 12, 12, '#6B4020');

    dumplings.forEach(d => {
      const wobX = Math.sin(d.wobble) * 3;
      ctx.save(); ctx.translate(d.x + wobX, d.y);

      if (d.state === 'raw') {
        // Raw wrapper — open crescent
        const p = d.foldProgress;
        ctx.fillStyle = '#fff5e0'; ctx.beginPath(); ctx.ellipse(0, 0, 35 * (1 - p * 0.3), 22, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ffe4a0'; ctx.beginPath(); ctx.ellipse(0, 5, 25, 14, 0, 0, Math.PI); ctx.fill();
        if (p > 0) {
          // Folding animation — top half closes
          ctx.fillStyle = '#fff5e0'; ctx.beginPath();
          ctx.ellipse(0, -5 * (1 - p), 35 * (1 - p * 0.3), 20 * (1 - p * 0.5), 0, 0, -Math.PI); ctx.fill();
          // Fold progress ring
          shd(ctx, '#ff7c2e', 10); ctx.strokeStyle = '#ff7c2e'; ctx.lineWidth = 3;
          ctx.beginPath(); ctx.arc(0, 0, 42, -Math.PI / 2, -Math.PI / 2 + p * Math.PI * 2); ctx.stroke(); nshd(ctx);
        }
      } else {
        // Folded dumpling
        ctx.fillStyle = '#ffe4a0'; ctx.beginPath(); ctx.ellipse(0, 0, 32, 18, 0, 0, Math.PI * 2); ctx.fill();
        // Pleats
        ctx.strokeStyle = '#d4a012'; ctx.lineWidth = 1.5;
        for (let i = -3; i <= 3; i++) { ctx.beginPath(); ctx.arc(i * 9, -5, 5, 0, Math.PI); ctx.stroke(); }
        ctx.font = '18px system-ui'; ctx.textAlign = 'center'; ctx.fillStyle = '#44ff88'; ctx.fillText('✓', 0, -28);
      }
      ctx.restore();
    });

    // Two-hand fold indicator
    if (folding) {
      ctx.save(); ctx.globalAlpha = 0.4; ctx.strokeStyle = '#ff7c2e'; ctx.lineWidth = 4;
      if (hands[0].visible && hands[1].visible) { ctx.beginPath(); ctx.moveTo(hands[0].x, hands[0].y); ctx.lineTo(hands[1].x, hands[1].y); ctx.stroke(); }
      ctx.restore();
    }

    const done = dumplings.filter(d => d.state === 'done').length;
    card(ctx, W - 200, H * 0.12, 180, 44, 10, 'rgba(0,0,0,0.5)', 'rgba(255,200,100,0.4)', 2);
    ctx.font = 'bold 16px system-ui'; ctx.textAlign = 'center'; ctx.fillStyle = '#ffd700';
    ctx.fillText(`🥟 ${done}/${dumplings.length} folded`, W - 110, H * 0.12 + 28);

    drawTimerBar(ctx, mgTime, this.duration, W / 2 - 300, H * 0.12, 600, 16);
    drawGestureHint(ctx, W, this.hint, '🥟');
    score.drawHUD(ctx, W, H);
    hands.forEach(h => drawHandCursor(ctx, h, '#ffcc88'));
    particles.draw(ctx); score.draw(ctx);

    if (dumplings.every(d => d.state === 'done')) return true;
  },

  finish({ score }): MinigameResult {
    return { score: score.roundScore, maxScore: this.maxScore, stars: score.computeStars(this.maxScore), perfectCount: perfects, combo: score.maxCombo };
  },
};
