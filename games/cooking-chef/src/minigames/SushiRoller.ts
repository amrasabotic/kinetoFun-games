import type { MinigameModule, MinigameContext } from '@/types/minigame';
import type { MinigameResult } from '@/types';
import { detectTwoHandFold } from '@/mediapipe/GestureDetector';
import { drawKitchenBg, drawTimerBar, drawGestureHint, drawHandCursor, card, shd, nshd, rnd } from '@/game/drawHelpers';

const FILLINGS = ['🍣', '🥒', '🥑', '🦐', '🐟'];
let rollProgress = 0;
let cutCount = 0;
let targetRolls = 3;
let phase: 'roll' | 'cut' = 'roll';
let mgTime = 0;
let perfects = 0;
let rollAnim = 0;
let cutCooldown = 0;

export const SushiRollerModule: MinigameModule = {
  id: 'sushi-roller', name: 'Sushi Roller!', icon: '🍣',
  hint: 'Roll with both hands, then cut!', duration: 14, maxScore: 420,

  init({ W, H }) {
    rollProgress = 0; cutCount = 0; targetRolls = 3; phase = 'roll';
    mgTime = this.duration; perfects = 0; rollAnim = 0; cutCooldown = 0;
  },

  update({ ctx, W, H, dt, hands, particles, score, audio }): boolean | void {
    mgTime -= dt;
    cutCooldown = Math.max(0, cutCooldown - dt);
    const cx2 = W / 2, cy = H * 0.52;

    if (phase === 'roll') {
      if (detectTwoHandFold(hands[0], hands[1])) {
        rollProgress = Math.min(1, rollProgress + dt * 0.7);
        rollAnim += 0.15;
        score.add(Math.round(dt * 30), cx2, cy - 60);
        score.addCombo(audio);
        if (Math.random() < 0.2) audio.stir();
        particles.steam(cx2 + rnd(-40, 40), cy - 60);
        if (rollProgress >= 1) { targetRolls--; rollProgress = 0; score.add(80, cx2, cy, 'ROLL! ✓'); perfects++; if (targetRolls <= 0) { phase = 'cut'; audio.success(); } }
      }
    } else {
      // Cut with swipe down
      hands.forEach(h => {
        if (!h.visible || cutCooldown > 0) return;
        if (h.vy > 10) {
          cutCount++;
          score.add(50, h.x, cy - 20, 'CUT! 🔪');
          score.addCombo(audio); audio.chop();
          particles.slice(cx2, cy); cutCooldown = 0.3;
          if (cutCount >= 6) { score.add(100, cx2, cy, 'PERFECT CUTS!'); perfects++; audio.fanfare(); particles.confetti(cx2, cy); return; }
        }
      });
    }

    // Draw
    drawKitchenBg(ctx, W, H);
    ctx.save(); ctx.translate(cx2, cy);

    if (phase === 'roll') {
      // Bamboo mat
      for (let i = -5; i <= 5; i++) { ctx.fillStyle = i % 2 === 0 ? '#6b8c3e' : '#557a2e'; ctx.fillRect(-160, i * 12 - 60, 320, 12); }
      ctx.strokeStyle = '#8B6914'; ctx.lineWidth = 2;
      for (let i = -5; i <= 5; i++) { ctx.beginPath(); ctx.moveTo(-160, i * 12 - 60); ctx.lineTo(160, i * 12 - 60); ctx.stroke(); }

      // Sushi roll progress
      const rollR = 30 + rollProgress * 20;
      ctx.fillStyle = '#2d4a1e'; ctx.beginPath(); ctx.ellipse(0, 0, rollR + 15, rollR * 0.6 + 8, rollAnim, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#f5f5f0'; ctx.beginPath(); ctx.ellipse(0, 0, rollR, rollR * 0.55, rollAnim, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ff6644'; ctx.beginPath(); ctx.ellipse(0, 0, rollR * 0.5, rollR * 0.28, 0, 0, Math.PI * 2); ctx.fill();

      // Progress ring
      shd(ctx, '#44ff88', 15); ctx.strokeStyle = '#44ff88'; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.arc(0, 0, rollR + 30, -Math.PI / 2, -Math.PI / 2 + rollProgress * Math.PI * 2); ctx.stroke(); nshd(ctx);
      ctx.font = 'bold 16px system-ui'; ctx.textAlign = 'center'; ctx.fillStyle = '#ffd700'; ctx.fillText(`Roll ${4 - targetRolls}/3`, 0, -rollR - 40);
    } else {
      // Sushi log ready to cut
      ctx.fillStyle = '#2d4a1e'; ctx.beginPath();
      (ctx as unknown as { roundRect?(x: number, y: number, w: number, h: number, r: number): void }).roundRect?.(-150, -25, 300, 50, 10);
      ctx.fill();
      ctx.fillStyle = '#f5f5f0'; ctx.beginPath();
      (ctx as unknown as { roundRect?(x: number, y: number, w: number, h: number, r: number): void }).roundRect?.(-145, -20, 290, 40, 8);
      ctx.fill();
      // Pieces already cut
      for (let i = 0; i < cutCount; i++) {
        const px = -120 + i * 40;
        ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(px, -30); ctx.lineTo(px, 30); ctx.stroke();
      }
      ctx.font = 'bold 16px system-ui'; ctx.textAlign = 'center'; ctx.fillStyle = '#ffd700';
      ctx.fillText(`Cut ${cutCount}/6 pieces`, 0, -50);
    }
    ctx.restore();

    drawTimerBar(ctx, mgTime, this.duration, W / 2 - 300, H * 0.12, 600, 16);
    drawGestureHint(ctx, W, phase === 'roll' ? 'Squeeze both hands toward center!' : 'Chop down to cut pieces!', '🍣');
    score.drawHUD(ctx, W, H);
    hands.forEach(h => drawHandCursor(ctx, h));
    particles.draw(ctx); score.draw(ctx);

    if (phase === 'cut' && cutCount >= 6) return true;
  },

  finish({ score }): MinigameResult {
    return { score: score.roundScore, maxScore: this.maxScore, stars: score.computeStars(this.maxScore), perfectCount: perfects, combo: score.maxCombo };
  },
};
