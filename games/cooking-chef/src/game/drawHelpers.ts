import type { HandData } from '@/types';

export function rnd(a: number, b: number): number { return a + Math.random() * (b - a); }

export function txt(ctx: CanvasRenderingContext2D, s: string, x: number, y: number, font: string, col: string, align: CanvasTextAlign = 'center'): void {
  ctx.fillStyle = col; ctx.font = font; ctx.textAlign = align; ctx.fillText(s, x, y);
}

export function card(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number, fill?: string | null, stroke?: string | null, lw?: number): void {
  ctx.beginPath();
  (ctx as unknown as { roundRect?(x: number, y: number, w: number, h: number, r: number): void }).roundRect?.(x, y, w, h, r);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw ?? 2; ctx.stroke(); }
}

export function shd(ctx: CanvasRenderingContext2D, col: string, blur: number): void { ctx.shadowColor = col; ctx.shadowBlur = blur; }
export function nshd(ctx: CanvasRenderingContext2D): void { ctx.shadowBlur = 0; ctx.shadowColor = 'transparent'; }

export function drawTimerBar(ctx: CanvasRenderingContext2D, t: number, max: number, x: number, y: number, w: number, h = 14): void {
  const p = Math.max(0, t / max);
  card(ctx, x, y, w, h, h / 2, 'rgba(0,0,0,0.4)');
  const col = p > 0.5 ? '#44ff88' : p > 0.25 ? '#ffcc00' : '#ff3344';
  card(ctx, x, y, w * p, h, h / 2, col);
  card(ctx, x, y, w, h, h / 2, null, 'rgba(255,255,255,0.15)', 1.5);
}

const BG_FLOATERS = Array.from({ length: 18 }, () => ({
  x: Math.random() * 3000,
  y: Math.random() * 1200,
  vy: -(0.3 + Math.random() * 0.6),
  ico: ['🍅', '🥕', '🧅', '🌽', '🍋', '🍓', '🥑', '🍔', '🍕', '🥞', '🍜', '🧁'][Math.floor(Math.random() * 12)],
  sz: 20 + Math.random() * 20,
  a: 0.04 + Math.random() * 0.1,
}));

export function drawKitchenBg(ctx: CanvasRenderingContext2D, W: number, H: number): void {
  const grd = ctx.createLinearGradient(0, 0, 0, H);
  grd.addColorStop(0, '#080400'); grd.addColorStop(0.65, '#180c00'); grd.addColorStop(1, '#2a1400');
  ctx.fillStyle = grd; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#3a1e0a'; ctx.fillRect(0, H * 0.84, W, H * 0.16);
  ctx.fillStyle = '#5a3218'; ctx.fillRect(0, H * 0.84, W, 10);
  ctx.strokeStyle = 'rgba(255,140,40,0.06)'; ctx.lineWidth = 1;
  for (let x = 0; x < W; x += 64) { ctx.beginPath(); ctx.moveTo(x, H * 0.84); ctx.lineTo(x, H); ctx.stroke(); }
  BG_FLOATERS.forEach(f => {
    f.y += f.vy; if (f.y < -40) { f.y = H + 40; f.x = Math.random() * W; }
    ctx.globalAlpha = f.a; ctx.font = f.sz + 'px system-ui'; ctx.textAlign = 'center'; ctx.fillText(f.ico, f.x % W, f.y);
  });
  ctx.globalAlpha = 1;
}

export function drawHandCursor(ctx: CanvasRenderingContext2D, h: HandData, _col = '#fff'): void {
  if (!h.visible) return;
  const col = h.pinch ? '#ff7c2e' : h.palm ? '#44ff88' : '#ffffff';
  const pulse = 0.78 + 0.22 * Math.sin(performance.now() * 0.008);
  ctx.save();
  shd(ctx, col, 16);
  ctx.strokeStyle = col; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.arc(h.x, h.y, 22 * pulse, 0, Math.PI * 2); ctx.stroke();
  if (h.pinch) { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(h.x, h.y, 7, 0, Math.PI * 2); ctx.fill(); }
  nshd(ctx); ctx.restore();
}

export function drawGestureHint(ctx: CanvasRenderingContext2D, W: number, text: string, icon = '👋'): void {
  card(ctx, W / 2 - 220, 12, 440, 44, 10, 'rgba(0,0,0,0.55)');
  ctx.font = 'bold 16px system-ui'; ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(255,200,100,0.9)';
  ctx.fillText(icon + ' ' + text, W / 2, 39);
}
