import type { Balloon, Effect, HandCursor, PowerUpState } from './types';
import { PLAYER_COLORS, POP_DURATION } from '../constants/gameConfig';
import { darkenHex } from '../utils/mathUtils';

// ─── Main render entry point (game canvas only — cursors on overlay) ──────

export function renderFrame(
  ctx: CanvasRenderingContext2D,
  balloons: Balloon[],
  effects: Effect[],
  powerUps: PowerUpState,
  shakeOffset: { x: number; y: number },
  comboMultiplier: number,
  now: number,
): void {
  const { width, height } = ctx.canvas;

  ctx.save();
  ctx.translate(shakeOffset.x, shakeOffset.y);
  ctx.clearRect(-Math.abs(shakeOffset.x) - 10, -Math.abs(shakeOffset.y) - 10, width + 20, height + 20);

  drawBackground(ctx, width, height, now);

  for (const balloon of balloons) {
    drawBalloon(ctx, balloon, now);
  }

  for (const effect of effects) {
    if (!effect.done) drawEffect(ctx, effect, now);
  }

  if (powerUps.freezeActive) {
    const remaining = Math.max(0, powerUps.freezeEndTime - now) / 5000;
    drawFrostOverlay(ctx, width, height, remaining);
  }

  if (powerUps.comboActive && comboMultiplier > 1) {
    drawComboAura(ctx, width, height, now);
  }

  ctx.restore();
}

// ─── Background ───────────────────────────────────────────────────────────

function drawBackground(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  now: number,
): void {
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  const pulse = Math.sin(now / 8000) * 0.05;
  grad.addColorStop(0,   `hsl(240, 70%, ${12 + pulse * 100}%)`);
  grad.addColorStop(0.5, `hsl(260, 60%, ${18 + pulse * 100}%)`);
  grad.addColorStop(1,   `hsl(280, 50%, ${10 + pulse * 100}%)`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
  drawStars(ctx, w, h, now);
}

const STARS = Array.from({ length: 60 }, () => ({
  x: Math.random(),
  y: Math.random(),
  size: Math.random() * 2 + 0.5,
  phase: Math.random() * Math.PI * 2,
}));

function drawStars(ctx: CanvasRenderingContext2D, w: number, h: number, now: number): void {
  for (const star of STARS) {
    const opacity = 0.3 + 0.4 * Math.sin(now / 1500 + star.phase);
    ctx.beginPath();
    ctx.arc(star.x * w, star.y * h * 0.6, star.size, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
    ctx.fill();
  }
}

// ─── Balloon drawing ──────────────────────────────────────────────────────

export function drawBalloon(
  ctx: CanvasRenderingContext2D,
  balloon: Balloon,
  now: number,
): void {
  const popProgress = balloon.popped && balloon.popTime !== null
    ? Math.min(1, (now - balloon.popTime) / POP_DURATION)
    : 0;

  if (balloon.popped && popProgress >= 1) return;

  ctx.save();

  if (balloon.popped) {
    const scale = 1 + popProgress * 0.6;
    const opacity = 1 - popProgress;
    ctx.globalAlpha = opacity;
    ctx.translate(balloon.x, balloon.y);
    ctx.scale(scale, scale);
    ctx.translate(-balloon.x, -balloon.y);
  }

  switch (balloon.type) {
    case 'regular':  drawRegularBalloon(ctx, balloon, now); break;
    case 'golden':   drawGoldenBalloon(ctx, balloon, now);  break;
    case 'bomb':     drawBombBalloon(ctx, balloon, now);    break;
    case 'freeze':   drawFreezeBalloon(ctx, balloon, now);  break;
    case 'rainbow':  drawRainbowBalloon(ctx, balloon, now); break;
  }

  ctx.restore();
}

function drawBalloonBody(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, r: number,
  fillStyle: CanvasGradient | string,
): void {
  ctx.beginPath();
  ctx.ellipse(x, y, r * 0.82, r, 0, 0, Math.PI * 2);
  ctx.fillStyle = fillStyle;
  ctx.fill();

  ctx.beginPath();
  ctx.ellipse(x - r * 0.22, y - r * 0.28, r * 0.22, r * 0.14, -0.4, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(x - r * 0.08, y + r);
  ctx.lineTo(x + r * 0.08, y + r);
  ctx.lineTo(x, y + r + r * 0.14);
  ctx.closePath();
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(x, y + r + r * 0.14);
  ctx.bezierCurveTo(x + r * 0.3, y + r + r * 0.5, x - r * 0.2, y + r + r, x + r * 0.1, y + r + r * 1.6);
  ctx.strokeStyle = 'rgba(200,200,200,0.55)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

function drawRegularBalloon(ctx: CanvasRenderingContext2D, b: Balloon, _now: number): void {
  const { x, y, radius: r, color } = b;
  const grad = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, 0, x, y, r * 1.1);
  grad.addColorStop(0, 'rgba(255,255,255,0.5)');
  grad.addColorStop(0.3, color);
  grad.addColorStop(1, darkenHex(color, 0.55));
  drawBalloonBody(ctx, x, y, r, grad);
}

function drawGoldenBalloon(ctx: CanvasRenderingContext2D, b: Balloon, now: number): void {
  const { x, y, radius: r } = b;
  const glow = ctx.createRadialGradient(x, y, r * 0.5, x, y, r * 1.6);
  glow.addColorStop(0, 'rgba(255,215,0,0.25)');
  glow.addColorStop(1, 'rgba(255,215,0,0)');
  ctx.beginPath();
  ctx.arc(x, y, r * 1.6, 0, Math.PI * 2);
  ctx.fillStyle = glow;
  ctx.fill();

  const grad = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, 0, x, y, r * 1.1);
  grad.addColorStop(0, '#FFFDE7');
  grad.addColorStop(0.3, '#FFD700');
  grad.addColorStop(1, '#B8860B');
  drawBalloonBody(ctx, x, y, r, grad);

  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2 + now / 800;
    const sx = x + Math.cos(angle) * (r * 1.25);
    const sy = y + Math.sin(angle) * (r * 1.25);
    const scale = 0.6 + 0.4 * Math.sin(now / 300 + i);
    drawSparkle(ctx, sx, sy, r * 0.12 * scale, '#FFD700');
  }
}

function drawBombBalloon(ctx: CanvasRenderingContext2D, b: Balloon, now: number): void {
  const { x, y, radius: r } = b;
  const pulseRadius = r * (1.4 + 0.15 * Math.sin(now / 350));
  const aura = ctx.createRadialGradient(x, y, r * 0.5, x, y, pulseRadius);
  aura.addColorStop(0, 'rgba(255,0,0,0.15)');
  aura.addColorStop(1, 'rgba(255,0,0,0)');
  ctx.beginPath();
  ctx.arc(x, y, pulseRadius, 0, Math.PI * 2);
  ctx.fillStyle = aura;
  ctx.fill();

  const grad = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, 0, x, y, r * 1.1);
  grad.addColorStop(0, '#555');
  grad.addColorStop(0.4, '#222');
  grad.addColorStop(1, '#000');
  drawBalloonBody(ctx, x, y, r, grad);

  ctx.save();
  ctx.font = `bold ${r * 0.8}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#FF3333';
  ctx.fillText('!', x, y - r * 0.05);
  ctx.restore();
}

function drawFreezeBalloon(ctx: CanvasRenderingContext2D, b: Balloon, now: number): void {
  const { x, y, radius: r } = b;
  const aura = ctx.createRadialGradient(x, y, r * 0.5, x, y, r * 1.5);
  aura.addColorStop(0, 'rgba(144,213,255,0.2)');
  aura.addColorStop(1, 'rgba(144,213,255,0)');
  ctx.beginPath();
  ctx.arc(x, y, r * 1.5, 0, Math.PI * 2);
  ctx.fillStyle = aura;
  ctx.fill();

  const grad = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, 0, x, y, r * 1.1);
  grad.addColorStop(0, '#E3F2FD');
  grad.addColorStop(0.4, '#90D5FF');
  grad.addColorStop(1, '#1565C0');
  drawBalloonBody(ctx, x, y, r, grad);

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(now / 2000);
  drawSnowflake(ctx, 0, 0, r * 0.45);
  ctx.restore();
}

function drawRainbowBalloon(ctx: CanvasRenderingContext2D, b: Balloon, now: number): void {
  const { x, y, radius: r } = b;
  const glowSize = r * (1.5 + 0.2 * Math.sin(now / 400));
  const glow = ctx.createRadialGradient(x, y, r * 0.5, x, y, glowSize);
  glow.addColorStop(0, 'rgba(255,255,255,0.3)');
  glow.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.beginPath();
  ctx.arc(x, y, glowSize, 0, Math.PI * 2);
  ctx.fillStyle = glow;
  ctx.fill();

  const offset = now / 1500;
  const grad = ctx.createLinearGradient(x - r, y - r, x + r, y + r);
  for (let i = 0; i <= 6; i++) {
    const hue = ((offset + i / 6) % 1) * 360;
    grad.addColorStop(i / 6, `hsl(${hue}, 100%, 60%)`);
  }
  drawBalloonBody(ctx, x, y, r, grad);

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(now / 1000);
  drawSparkle(ctx, 0, 0, r * 0.3, '#FFFFFF');
  ctx.restore();
}

// ─── Helper shapes ────────────────────────────────────────────────────────

function drawSparkle(
  ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string,
): void {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = size * 0.3;
  ctx.lineCap = 'round';
  for (let i = 0; i < 4; i++) {
    const angle = (i / 4) * Math.PI;
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(angle) * size, y + Math.sin(angle) * size);
    ctx.lineTo(x - Math.cos(angle) * size, y - Math.sin(angle) * size);
    ctx.stroke();
  }
  ctx.restore();
}

function drawSnowflake(ctx: CanvasRenderingContext2D, x: number, y: number, size: number): void {
  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.lineWidth = size * 0.12;
  ctx.lineCap = 'round';
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(angle) * size, y + Math.sin(angle) * size);
    ctx.stroke();
    const bx = x + Math.cos(angle) * size * 0.55;
    const by = y + Math.sin(angle) * size * 0.55;
    for (const da of [-Math.PI / 4, Math.PI / 4]) {
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.lineTo(bx + Math.cos(angle + da) * size * 0.28, by + Math.sin(angle + da) * size * 0.28);
      ctx.stroke();
    }
  }
}

// ─── Effects rendering ────────────────────────────────────────────────────

function drawEffect(ctx: CanvasRenderingContext2D, effect: Effect, now: number): void {
  const elapsed = now - effect.startTime;

  ctx.save();
  for (const p of effect.particles) {
    if (p.opacity <= 0 || p.size <= 0.5) continue;
    ctx.save();
    ctx.globalAlpha = p.opacity;
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rotation);
    ctx.fillStyle = p.color;
    ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
    ctx.restore();
  }

  if (effect.type === 'pop' || effect.type === 'goldPop' || effect.type === 'explosion') {
    const ringProgress = Math.min(1, elapsed / (effect.duration * 0.5));
    const ringRadius = effect.radius * ringProgress * 1.8;
    const ringOpacity = 1 - ringProgress;
    ctx.beginPath();
    ctx.arc(effect.x, effect.y, ringRadius, 0, Math.PI * 2);
    ctx.strokeStyle =
      effect.type === 'explosion' ? `rgba(255, 100, 0, ${ringOpacity})` :
      effect.type === 'goldPop'   ? `rgba(255, 215, 0, ${ringOpacity})` :
                                    `rgba(255, 255, 255, ${ringOpacity * 0.7})`;
    ctx.lineWidth = 3;
    ctx.stroke();
  }

  ctx.restore();
}

// ─── Frost overlay ────────────────────────────────────────────────────────

function drawFrostOverlay(
  ctx: CanvasRenderingContext2D, w: number, h: number, intensityFraction: number,
): void {
  const opacity = intensityFraction * 0.35;
  const grad = ctx.createRadialGradient(w / 2, h / 2, h * 0.3, w / 2, h / 2, h * 0.8);
  grad.addColorStop(0, 'rgba(144, 213, 255, 0)');
  grad.addColorStop(1, `rgba(144, 213, 255, ${opacity})`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  const corners = [[0, 0], [w, 0], [0, h], [w, h]] as const;
  for (const [cx, cy] of corners) {
    const cGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, h * 0.4);
    cGrad.addColorStop(0, `rgba(200, 235, 255, ${intensityFraction * 0.4})`);
    cGrad.addColorStop(1, 'rgba(200, 235, 255, 0)');
    ctx.fillStyle = cGrad;
    ctx.fillRect(0, 0, w, h);
  }
}

// ─── Combo aura ───────────────────────────────────────────────────────────

function drawComboAura(ctx: CanvasRenderingContext2D, w: number, h: number, now: number): void {
  const hue = (now / 30) % 360;
  const pulse = 0.12 + 0.06 * Math.sin(now / 300);
  const grad = ctx.createRadialGradient(w / 2, h / 2, h * 0.35, w / 2, h / 2, h * 0.75);
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(1, `hsla(${hue}, 100%, 60%, ${pulse})`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
}

// ─── Hand cursor with dwell ring (drawn on overlay canvas) ────────────────

export function drawCursor(
  ctx: CanvasRenderingContext2D,
  cursor: HandCursor,
  now: number,
  dwellProgress: number,  // 0–1; ring fills as user hovers over a button
): void {
  const { x, y, playerId } = cursor;
  const color = PLAYER_COLORS[playerId];
  const r = 22;
  const pulse = 0.85 + 0.15 * Math.sin(now / 250 + playerId);

  ctx.save();

  // Outer glow ring
  ctx.beginPath();
  ctx.arc(x, y, r * 1.8 * pulse, 0, Math.PI * 2);
  ctx.globalAlpha = 0.25;
  ctx.strokeStyle = color;
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.globalAlpha = 1;

  // Main fill circle
  ctx.beginPath();
  ctx.arc(x, y, r * pulse, 0, Math.PI * 2);
  ctx.fillStyle = hexToRgba(color, 0.35);
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.stroke();

  // Center dot
  ctx.beginPath();
  ctx.arc(x, y, 4, 0, Math.PI * 2);
  ctx.fillStyle = '#FFFFFF';
  ctx.fill();

  // Player label
  ctx.font = 'bold 14px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = color;
  ctx.fillText(`P${playerId}`, x, y + r + 14);

  // Dwell progress ring — fills up as the user holds still over a button
  if (dwellProgress > 0) {
    const ringR = 36;
    const startAngle = -Math.PI / 2;
    const endAngle = startAngle + dwellProgress * Math.PI * 2;

    // Background track
    ctx.beginPath();
    ctx.arc(x, y, ringR, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.18)';
    ctx.lineWidth = 5;
    ctx.stroke();

    // Filled arc
    ctx.beginPath();
    ctx.arc(x, y, ringR, startAngle, endAngle);
    ctx.strokeStyle = color;
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.stroke();

    // Flash at completion
    if (dwellProgress >= 0.95) {
      ctx.beginPath();
      ctx.arc(x, y, ringR + 8, 0, Math.PI * 2);
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 3;
      ctx.globalAlpha = 0.7;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }

  ctx.restore();
}

// ─── Score popup text ─────────────────────────────────────────────────────

export function drawScorePopup(
  ctx: CanvasRenderingContext2D,
  text: string, x: number, y: number, color: string, age: number,
): void {
  const opacity = Math.max(0, 1 - age / 800);
  const offsetY = -(age / 800) * 60;
  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.font = 'bold 36px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = color;
  ctx.strokeStyle = 'rgba(0,0,0,0.6)';
  ctx.lineWidth = 4;
  ctx.strokeText(text, x, y + offsetY);
  ctx.fillText(text, x, y + offsetY);
  ctx.restore();
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}
