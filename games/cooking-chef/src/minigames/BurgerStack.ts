import type { MinigameModule, MinigameContext } from '@/types/minigame';
import type { MinigameResult } from '@/types';
import { drawKitchenBg, drawTimerBar, drawGestureHint, drawHandCursor, card, shd, nshd, rnd } from '@/game/drawHelpers';

const GOOD = ['🥬', '🍅', '🧀', '🥩', '🥒', '🧅', '🍄'];
const BAD  = ['🦠', '💀'];

interface Faller { emoji: string; x: number; y: number; vy: number; good: boolean; caught: boolean; missed: boolean; }

let fallers: Faller[] = [];
let plateX = 0;
let stack: string[] = [];
let missCount = 0;
let mgTime = 0;
let perfects = 0;
const PLATE_W = 180, PLATE_Y_OFF = 0.72;

export const BurgerStackModule: MinigameModule = {
  id: 'burger-stack', name: 'Burger Stack!', icon: '🍔',
  hint: 'Move your hand to catch!', duration: 12, maxScore: 480,

  init({ W, H }) {
    plateX = W / 2; stack = []; missCount = 0; mgTime = this.duration; perfects = 0;
    fallers = Array.from({ length: 14 }, (_, i) => {
      const bad = Math.random() < 0.2;
      const arr = bad ? BAD : GOOD;
      return { emoji: arr[Math.floor(Math.random() * arr.length)], x: rnd(W * 0.2, W * 0.8), y: -(i * 100 + rnd(40, 80)), vy: 2 + Math.random() * 2, good: !bad, caught: false, missed: false };
    });
  },

  update({ ctx, W, H, dt, hands, particles, score, audio }): boolean | void {
    mgTime -= dt;
    const plateY = H * PLATE_Y_OFF;
    const speed = 1 + (1 - mgTime / this.duration) * 0.8;
    const bh = hands.find(h => h.visible);
    if (bh) { plateX += (bh.x - plateX) * 0.2; }
    plateX = Math.max(W * 0.15, Math.min(W * 0.85, plateX));

    fallers.forEach(f => {
      if (f.caught || f.missed) return;
      f.y += f.vy * speed;
      if (f.y > plateY - 40 && f.y < plateY + 20 && Math.abs(f.x - plateX) < PLATE_W / 2 + 30) {
        f.caught = true;
        if (f.good) { stack.push(f.emoji); score.add(60, f.x, f.y - 30, 'CAUGHT! 🎉'); score.addCombo(audio); audio.catch_(); particles.burst(f.x, f.y, '#ffd700', 12); perfects++; }
        else { missCount++; score.breakCombo(); audio.fail(); particles.burst(f.x, f.y, '#ff3344', 10); score.add(0, f.x, f.y, 'BAD! 💀'); }
      }
      if (f.y > H + 60) { f.missed = true; if (f.good) { missCount++; score.breakCombo(); audio.miss(); } }
    });

    // Draw
    drawKitchenBg(ctx, W, H);
    fallers.forEach(f => {
      if (f.caught || f.missed) return;
      ctx.font = '40px system-ui'; ctx.textAlign = 'center'; ctx.fillText(f.emoji, f.x, f.y + 14);
      ctx.save(); ctx.globalAlpha = 0.3; ctx.fillStyle = '#000'; ctx.beginPath(); ctx.ellipse(f.x, plateY + 10, 20, 6, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    });

    ctx.save();
    shd(ctx, '#fff', 10); ctx.strokeStyle = '#fff'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.ellipse(plateX, plateY + 10, PLATE_W / 2 + 10, 18, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.beginPath(); ctx.ellipse(plateX, plateY + 10, PLATE_W / 2 + 10, 18, 0, 0, Math.PI * 2); ctx.fill();
    nshd(ctx);
    ctx.font = '36px system-ui'; ctx.textAlign = 'center'; ctx.fillText('🍞', plateX, plateY + 6);
    stack.forEach((e, i) => { ctx.font = '30px system-ui'; ctx.fillText(e, plateX + rnd(-4, 4), plateY - 10 - i * 22); });
    if (stack.length >= 4) { ctx.font = '36px system-ui'; ctx.fillText('🍞', plateX, plateY - 10 - stack.length * 22); }
    ctx.restore();

    if (missCount > 0) { ctx.font = 'bold 18px system-ui'; ctx.textAlign = 'left'; ctx.fillStyle = '#ff3344'; ctx.fillText('💀 MISSED: ' + missCount, 20, H - 24); }
    card(ctx, 20, H * 0.12, 180, 44, 10, 'rgba(0,0,0,0.5)', 'rgba(255,124,46,0.4)', 2);
    ctx.font = 'bold 16px system-ui'; ctx.textAlign = 'center'; ctx.fillStyle = '#ffd700'; ctx.fillText('🍔 Stack: ' + stack.length, 110, H * 0.12 + 28);

    drawTimerBar(ctx, mgTime, this.duration, W / 2 - 300, H * 0.12, 600, 16);
    drawGestureHint(ctx, W, this.hint, '🍔');
    score.drawHUD(ctx, W, H);
    hands.forEach(h => drawHandCursor(ctx, h));
    particles.draw(ctx); score.draw(ctx);
  },

  finish({ score }): MinigameResult {
    return { score: score.roundScore, maxScore: this.maxScore, stars: score.computeStars(this.maxScore), perfectCount: perfects, combo: score.maxCombo };
  },
};
