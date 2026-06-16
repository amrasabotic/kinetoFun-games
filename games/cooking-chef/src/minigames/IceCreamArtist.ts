import type { MinigameModule, MinigameContext } from '@/types/minigame';
import type { MinigameResult } from '@/types';
import { detectSwipeUp } from '@/mediapipe/GestureDetector';
import { drawKitchenBg, drawTimerBar, drawGestureHint, drawHandCursor, shd, nshd, rnd } from '@/game/drawHelpers';

const SCOOPS = ['🍨', '🍓', '🍫', '🍋', '🫐'];
const TOPPINGS2 = ['🍫', '🌈', '⭐', '🍒'];

interface Scoop { emoji: string; col: string; tilt: number; }

const COLS = ['#e8d0ff', '#ffd0d0', '#d0d0ff', '#ffffd0', '#d0d0ff'];

let scoops: Scoop[] = [];
let coneAngle = 0;
let swipeCooldown = 0;
let mgTime = 0;
let perfects = 0;
let maxHeight = 10;

export const IceCreamArtistModule: MinigameModule = {
  id: 'ice-cream', name: 'Ice Cream Artist!', icon: '🍦',
  hint: 'Swipe UP to add scoops!', duration: 13, maxScore: 440,

  init({ W, H }) {
    scoops = []; coneAngle = 0; swipeCooldown = 0; mgTime = this.duration; perfects = 0; maxHeight = 10;
  },

  update({ ctx, W, H, dt, hands, particles, score, audio }): boolean | void {
    mgTime -= dt;
    swipeCooldown = Math.max(0, swipeCooldown - dt);
    const cx2 = W / 2, baseY = H * 0.72;

    // Physics: tilt scoops based on combo height
    if (scoops.length > 0) {
      const wobble = Math.sin(performance.now() * 0.003) * (scoops.length * 0.5);
      coneAngle += (wobble - coneAngle) * 0.05;
      if (Math.abs(coneAngle) > 0.5) { score.breakCombo(); scoops = []; audio.fail(); particles.burst(cx2, baseY - scoops.length * 35, '#ff3344', 15); }
    }

    hands.forEach(h => {
      if (!h.visible || swipeCooldown > 0) return;
      if (detectSwipeUp(h)) {
        const idx = Math.floor(Math.random() * SCOOPS.length);
        scoops.push({ emoji: SCOOPS[idx], col: COLS[idx], tilt: rnd(-0.08, 0.08) });
        swipeCooldown = 0.5;
        score.add(60 + scoops.length * 10, cx2, baseY - scoops.length * 35 - 40, scoops.length >= 5 ? 'AMAZING! 🔥' : 'SCOOP!');
        score.addCombo(audio); audio.flip();
        particles.burst(cx2, baseY - scoops.length * 35, COLS[idx], 12);
        if (scoops.length > maxHeight) { maxHeight = scoops.length; perfects++; }
      }
    });

    // Draw
    drawKitchenBg(ctx, W, H);
    ctx.save(); ctx.translate(cx2, baseY); ctx.rotate(coneAngle);

    // Cone
    ctx.fillStyle = '#d4a012'; ctx.beginPath();
    ctx.moveTo(0, 0); ctx.lineTo(-35, -80); ctx.lineTo(35, -80); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#b8860b'; ctx.lineWidth = 2;
    for (let i = 1; i < 4; i++) { ctx.beginPath(); ctx.moveTo(-35 + i * 17.5, -80); ctx.lineTo(0, 0); ctx.stroke(); }

    // Scoops
    scoops.forEach((s, i) => {
      const sy = -80 - i * 35;
      ctx.save(); ctx.rotate(s.tilt);
      shd(ctx, s.col, 10);
      ctx.fillStyle = s.col; ctx.beginPath(); ctx.arc(0, sy, 30, 0, Math.PI * 2); ctx.fill();
      nshd(ctx);
      ctx.font = '28px system-ui'; ctx.textAlign = 'center'; ctx.fillText(s.emoji, 0, sy + 10);
      ctx.restore();
    });

    // Tilt indicator
    if (Math.abs(coneAngle) > 0.2) {
      ctx.font = 'bold 16px system-ui'; ctx.textAlign = 'center';
      ctx.fillStyle = '#ff3344'; ctx.fillText('⚠ Balancing!', 0, -80 - scoops.length * 35 - 50);
    }
    ctx.restore();

    // Height label
    if (scoops.length > 0) {
      ctx.font = 'bold 22px system-ui'; ctx.textAlign = 'center'; ctx.fillStyle = '#ffd700';
      shd(ctx, '#ffd700', 15); ctx.fillText(`🏆 ${scoops.length} scoops!`, cx2, H * 0.18); nshd(ctx);
    }

    drawTimerBar(ctx, mgTime, this.duration, W / 2 - 300, H * 0.12, 600, 16);
    drawGestureHint(ctx, W, this.hint, '🍦');
    score.drawHUD(ctx, W, H);
    hands.forEach(h => drawHandCursor(ctx, h, '#ff88cc'));
    particles.draw(ctx); score.draw(ctx);
  },

  finish({ score }): MinigameResult {
    if (scoops.length >= 8) { score.add(150, 0, 0, 'TOWER MASTER!'); }
    return { score: score.roundScore, maxScore: this.maxScore, stars: score.computeStars(this.maxScore), perfectCount: perfects, combo: score.maxCombo };
  },
};
