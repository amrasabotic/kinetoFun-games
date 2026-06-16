import type { MinigameModule, MinigameContext } from '@/types/minigame';
import type { MinigameResult } from '@/types';
import { drawKitchenBg, drawTimerBar, drawGestureHint, drawHandCursor, card, shd, nshd } from '@/game/drawHelpers';

const DECO_ITEMS = [
  { emoji: '🍓', col: '#ff3355' }, { emoji: '🍫', col: '#884422' },
  { emoji: '🌸', col: '#ff88cc' }, { emoji: '🕯', col: '#ffcc00' },
  { emoji: '🫐', col: '#4444ff' }, { emoji: '🍒', col: '#cc0022' },
];

interface Palette { emoji: string; col: string; x: number; y: number; }
interface Placed { emoji: string; x: number; y: number; }
interface HeldItem { emoji: string; col: string; handIdx: number; }

let palette: Palette[] = [];
let placed: Placed[] = [];
let heldItem: HeldItem | null = null;
let placedCount = 0;
let mgTime = 0;

export const DecorateCakeModule: MinigameModule = {
  id: 'decorate-cake', name: 'Decorate the Cake!', icon: '🧁',
  hint: 'Pinch to grab, release to place!', duration: 15, maxScore: 500,

  init({ W, H }) {
    palette = DECO_ITEMS.map((d, i) => ({ ...d, x: W * 0.08, y: H * 0.26 + i * 72 }));
    placed = []; heldItem = null; placedCount = 0; mgTime = this.duration;
  },

  update({ ctx, W, H, dt, hands, particles, score, audio }): boolean | void {
    mgTime -= dt;
    const cakeX = W / 2, cakeY = H * 0.52, cakeW = 260, cakeH = 140;

    hands.forEach((h, hi) => {
      if (!h.visible) return;
      if (heldItem && heldItem.handIdx === hi) {
        if (!h.pinch) {
          if (h.x > cakeX - cakeW / 2 && h.x < cakeX + cakeW / 2 && h.y > cakeY - cakeH / 2 && h.y < cakeY + cakeH / 2) {
            placed.push({ emoji: heldItem.emoji, x: h.x, y: h.y });
            placedCount++;
            score.add(75, h.x, h.y, 'PLACED! 🎂'); score.addCombo(audio); audio.place();
            particles.burst(h.x, h.y, heldItem.col, 14);
          }
          heldItem = null;
        }
      } else if (!heldItem) {
        if (h.pinch && !h.lastPinch) {
          palette.forEach(p => { if (Math.hypot(h.x - p.x, h.y - p.y) < 40) { heldItem = { ...p, handIdx: hi }; audio.catch_(); } });
        }
      }
    });

    // Draw
    drawKitchenBg(ctx, W, H);
    ctx.save();
    ctx.fillStyle = '#e0d0c0'; ctx.beginPath(); ctx.ellipse(cakeX, cakeY + cakeH / 2 + 14, cakeW / 2 + 20, 18, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#c8b8a8'; ctx.beginPath(); ctx.ellipse(cakeX, cakeY + cakeH / 2 + 14, cakeW / 2 + 20, 18, 0, 0, Math.PI); ctx.fill();
    const cakeGrd = ctx.createLinearGradient(cakeX - cakeW / 2, cakeY - cakeH / 2, cakeX + cakeW / 2, cakeY + cakeH / 2);
    cakeGrd.addColorStop(0, '#fff5e0'); cakeGrd.addColorStop(1, '#ffe0b0');
    ctx.fillStyle = cakeGrd; ctx.beginPath();
    (ctx as unknown as { roundRect?(x: number, y: number, w: number, h: number, r: number): void }).roundRect?.(cakeX - cakeW / 2, cakeY - cakeH / 2, cakeW, cakeH, 20);
    ctx.fill();
    ctx.fillStyle = '#fff';
    for (let i = 0; i < 8; i++) { const dx = -cakeW / 2 + i * (cakeW / 7); ctx.beginPath(); ctx.arc(cakeX + dx, cakeY - cakeH / 2 + 8, 12, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.beginPath(); ctx.ellipse(cakeX, cakeY - cakeH / 2, cakeW / 2, 22, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,190,100,0.4)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(cakeX - cakeW / 2, cakeY); ctx.lineTo(cakeX + cakeW / 2, cakeY); ctx.stroke();

    placed.forEach(p => { ctx.font = '28px system-ui'; ctx.textAlign = 'center'; ctx.fillText(p.emoji, p.x, p.y + 10); });

    // Glow when over cake
    hands.forEach(h => {
      if (!h.visible) return;
      if (h.x > cakeX - cakeW / 2 && h.x < cakeX + cakeW / 2 && h.y > cakeY - cakeH / 2 && h.y < cakeY + cakeH / 2) {
        shd(ctx, '#ffd700', 20); ctx.strokeStyle = 'rgba(255,215,0,0.6)'; ctx.lineWidth = 3;
        ctx.beginPath();
        (ctx as unknown as { roundRect?(x: number, y: number, w: number, h: number, r: number): void }).roundRect?.(cakeX - cakeW / 2, cakeY - cakeH / 2, cakeW, cakeH, 20);
        ctx.stroke(); nshd(ctx);
      }
    });
    ctx.restore();

    palette.forEach(p => {
      const hov = hands.some(h => h.visible && Math.hypot(h.x - p.x, h.y - p.y) < 40);
      card(ctx, p.x - 36, p.y - 36, 72, 72, 12, hov ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.4)', hov ? p.col : 'rgba(255,255,255,0.2)', 2);
      ctx.font = '30px system-ui'; ctx.textAlign = 'center'; ctx.fillText(p.emoji, p.x, p.y + 10);
    });

    if (heldItem) {
      const h = hands[heldItem.handIdx];
      if (h?.visible) { ctx.save(); ctx.globalAlpha = 0.85; ctx.font = '36px system-ui'; ctx.textAlign = 'center'; ctx.fillText(heldItem.emoji, h.x, h.y - 20); ctx.restore(); }
    }

    card(ctx, W - 200, H * 0.12, 180, 48, 12, 'rgba(0,0,0,0.5)', 'rgba(255,200,100,0.4)', 2);
    ctx.font = 'bold 18px system-ui'; ctx.textAlign = 'center'; ctx.fillStyle = '#ffd700';
    ctx.fillText('🎂 ' + placedCount + ' placed', W - 110, H * 0.12 + 30);

    drawTimerBar(ctx, mgTime, this.duration, W / 2 - 300, H * 0.12, 600, 16);
    drawGestureHint(ctx, W, this.hint, '🧁');
    score.drawHUD(ctx, W, H);
    hands.forEach(h => drawHandCursor(ctx, h, heldItem ? '#ff7c2e' : '#fff'));
    particles.draw(ctx); score.draw(ctx);
  },

  finish({ score }): MinigameResult {
    return { score: score.roundScore, maxScore: this.maxScore, stars: score.computeStars(this.maxScore), perfectCount: placedCount, combo: score.maxCombo };
  },
};
