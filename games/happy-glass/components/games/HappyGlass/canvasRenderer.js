'use client';

import { LEVELS } from './levels';

// ─── Palette ─────────────────────────────────────────────────────────────────
const C = {
  bgTop:        '#dceefb',
  bgBot:        '#b3d9f7',
  emitterBase:  '#0288d1',
  emitterLight: '#4fc3f7',
  waterDeep:    '#0277bd',
  waterMid:     '#29b6f6',
  waterShine:   '#e1f5fe',
  glassBody:    'rgba(100,181,246,0.18)',
  glassBorder:  '#1565c0',
  glassShine:   'rgba(255,255,255,0.55)',
  strokeFill:   '#fff9c4',
  strokeEdge:   '#f9a825',
  obstacleBody: '#546e7a',
  obstacleEdge: '#b0bec5',
  cursorOpen:   'rgba(255,255,255,0.9)',
  cursorPinch:  '#ff6f00',
  cursorFist:   '#b71c1c',
  hudBg:        'rgba(13,71,161,0.75)',
  hudText:      '#e3f2fd',
  starFull:     '#ffd54f',
  starEmpty:    'rgba(255,255,255,0.25)',
  overlayBg:    'rgba(13,71,161,0.88)',
  overlayText:  '#ffffff',
  overlayAccent:'#90caf9',
  cardBg:       'rgba(13,71,161,0.82)',
  cardLocked:   'rgba(30,30,60,0.72)',
  cardHover:    'rgba(41,182,246,0.30)',
  cardBorder:   '#1976d2',
  cardBorderH:  '#4fc3f7',
};

// ─── Grid constants (must match HappyGlassGame.jsx) ──────────────────────────
const CARD_W   = 140;
const CARD_H   = 96;
const CARD_GAP = 8;
const COLS     = 5;
const ROWS     = 4;

// ─── Main entry point ────────────────────────────────────────────────────────

export function renderFrame(canvas, state, gesture) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const W = canvas.width;
  const H = canvas.height;

  // Level select is a fully custom screen — skip the normal game render
  if (state.phase === 'levelSelect') {
    drawBackground(ctx, W, H);
    drawLevelSelect(ctx, W, H, state, gesture);
    if (gesture && gesture.gesture !== 'none') {
      drawCursor(ctx, gesture.smoothX, gesture.smoothY, gesture.gesture, state.thumbsUpHeld);
    }
    return;
  }

  drawBackground(ctx, W, H);

  const { phase, glass, particles, strokes, currentStroke,
          level, totalSpawned, inGlassCount, emitterX, levelConfig,
          thumbsUpHeld, resolveTimer, starsEarned } = state;

  // Obstacles
  if (levelConfig?.obstacles?.length) {
    for (const obs of levelConfig.obstacles) {
      drawObstacleShape(ctx, obs, W, H);
    }
  }

  // Emitter spout — visible in build (preview) + run + resolve
  if (phase === 'build' || phase === 'run' || phase === 'resolve') {
    drawEmitter(ctx, emitterX);
  }

  // Finalised strokes
  for (const s of strokes) {
    drawStrokeLine(ctx, s.points, C.strokeFill, C.strokeEdge, 9);
  }

  // Current in-progress stroke
  if (currentStroke && currentStroke.length >= 2) {
    drawStrokeLine(ctx, currentStroke, 'rgba(255,255,190,0.8)', '#ffb300', 7);
  }

  // Glass
  if (glass) drawGlass(ctx, glass);

  // Water particles
  for (const p of particles) {
    drawParticle(ctx, p.position.x, p.position.y);
  }

  // Hand cursor
  if (gesture && gesture.gesture !== 'none') {
    drawCursor(ctx, gesture.smoothX, gesture.smoothY, gesture.gesture, thumbsUpHeld);
  }

  // HUD — shown in build and run phases
  if (phase === 'build' || phase === 'run' || phase === 'resolve') {
    const targetFill = levelConfig?.targetFill ?? 0.55;
    drawHUD(ctx, W, H, phase, level, strokes.length, totalSpawned, inGlassCount, targetFill);
  }

  // Phase overlays
  if (phase === 'idle') {
    drawIdleOverlay(ctx, W, H);
  } else if (phase === 'build') {
    drawBuildHint(ctx, W, H, thumbsUpHeld);
  } else if (phase === 'resolve') {
    const fillRate = totalSpawned > 0 ? inGlassCount / totalSpawned : 0;
    const success  = fillRate >= (levelConfig?.targetFill ?? 0.55);
    const stars    = success ? (starsEarned ?? calcStars(strokes.length, levelConfig)) : 0;
    drawResolveOverlay(ctx, W, H, success, stars, fillRate, resolveTimer, levelConfig?.targetFill ?? 0.55);
  } else if (phase === 'complete') {
    drawCompleteOverlay(ctx, W, H);
  }
}

// ─── Background ──────────────────────────────────────────────────────────────

function drawBackground(ctx, W, H) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, C.bgTop);
  g.addColorStop(1, C.bgBot);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

// ─── Obstacle ────────────────────────────────────────────────────────────────

function drawObstacleShape(ctx, obs, W, H) {
  const x   = obs.xFrac * W;
  const y   = obs.yFrac * H;
  const ang = obs.angle ?? 0;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ang);

  let w, h;
  if (obs.type === 'platform') {
    w = obs.width;
    h = obs.height ?? 10;
  } else {
    w = obs.width ?? 10;
    h = obs.height;
  }

  // Shadow / depth
  ctx.shadowColor   = 'rgba(0,0,0,0.35)';
  ctx.shadowBlur    = 6;
  ctx.shadowOffsetY = 3;

  ctx.fillStyle = C.obstacleBody;
  ctx.beginPath();
  roundRectPath(ctx, -w / 2, -h / 2, w, h, 4);
  ctx.fill();

  ctx.shadowColor = 'transparent';

  // Highlight edge
  ctx.strokeStyle = C.obstacleEdge;
  ctx.lineWidth   = 1.5;
  ctx.stroke();

  // Shine strip
  ctx.fillStyle   = 'rgba(255,255,255,0.15)';
  ctx.fillRect(-w / 2 + 3, -h / 2 + 2, w - 6, Math.min(4, h / 3));

  ctx.restore();
}

// ─── Level Select Screen ──────────────────────────────────────────────────────

function drawLevelSelect(ctx, W, H, state, gesture) {
  const { hoveredCard, highestUnlocked, levelStars, thumbsUpHeld } = state;
  const GRID_X = Math.round((W - COLS * CARD_W - (COLS - 1) * CARD_GAP) / 2);
  const GRID_Y = 70;

  // Title
  ctx.save();
  ctx.textAlign   = 'center';
  ctx.fillStyle   = C.overlayText;
  ctx.font        = 'bold 28px sans-serif';
  ctx.fillText('Select a Level', W / 2, 44);

  // Subtitle instruction
  ctx.font      = '14px sans-serif';
  ctx.fillStyle = '#90caf9';
  ctx.fillText('Hover over a level card  •  👍 Thumbs Up to play', W / 2, 64);
  ctx.restore();

  for (let i = 0; i < LEVELS.length; i++) {
    const lvl   = LEVELS[i];
    const col   = i % COLS;
    const row   = Math.floor(i / COLS);
    const cardX = GRID_X + col * (CARD_W + CARD_GAP);
    const cardY = GRID_Y + row * (CARD_H + CARD_GAP);
    const isHovered  = hoveredCard === lvl.id;
    const isUnlocked = lvl.id <= highestUnlocked;
    const stars      = levelStars[lvl.id] ?? 0;

    drawLevelCard(ctx, cardX, cardY, lvl, isUnlocked, isHovered, stars, thumbsUpHeld);
  }
}

function drawLevelCard(ctx, x, y, lvl, isUnlocked, isHovered, stars, thumbsUpHeld) {
  ctx.save();

  // Card background
  ctx.fillStyle = isUnlocked
    ? (isHovered ? C.cardHover : C.cardBg)
    : C.cardLocked;
  roundRectPath(ctx, x, y, CARD_W, CARD_H, 8);
  ctx.fill();

  // Border
  ctx.strokeStyle = isHovered ? C.cardBorderH : C.cardBorder;
  ctx.lineWidth   = isHovered ? 2 : 1;
  roundRectPath(ctx, x, y, CARD_W, CARD_H, 8);
  ctx.stroke();

  // Header bar (top 26px)
  ctx.fillStyle = isUnlocked ? 'rgba(21,101,192,0.6)' : 'rgba(0,0,0,0.4)';
  roundRectPath(ctx, x, y, CARD_W, 26, 8);
  ctx.fill();
  // Square off the bottom of the header
  ctx.fillRect(x, y + 14, CARD_W, 12);

  // Level number
  ctx.textAlign = 'left';
  ctx.font      = 'bold 12px sans-serif';
  ctx.fillStyle = isUnlocked ? '#e3f2fd' : '#607d8b';
  ctx.fillText(`${lvl.id}`, x + 7, y + 17);

  // Level name
  ctx.font      = '10px sans-serif';
  ctx.fillStyle = isUnlocked ? '#90caf9' : '#546e7a';
  ctx.fillText(lvl.label, x + 24, y + 17);

  // Stars (top right)
  ctx.textAlign = 'right';
  for (let s = 0; s < 3; s++) {
    ctx.fillStyle = s < stars ? C.starFull : 'rgba(255,255,255,0.2)';
    drawStar(ctx, x + CARD_W - 10 - s * 14, y + 13, 5);
  }

  if (isUnlocked) {
    // Mini preview in bottom section
    drawLevelPreview(ctx, x + 4, y + 30, CARD_W - 8, CARD_H - 34, lvl);
  } else {
    // Lock icon
    ctx.textAlign  = 'center';
    ctx.font       = '22px sans-serif';
    ctx.fillStyle  = '#546e7a';
    ctx.fillText('🔒', x + CARD_W / 2, y + CARD_H / 2 + 12);
  }

  // Hover charging ring
  if (isHovered && isUnlocked && thumbsUpHeld > 0) {
    const progress = Math.min(1, thumbsUpHeld / 18);
    ctx.strokeStyle = '#69f0ae';
    ctx.lineWidth   = 3;
    ctx.beginPath();
    roundRectPath(ctx, x + 1, y + 1, CARD_W - 2, CARD_H - 2, 7);
    // Draw partial arc around the card — use a simple opacity trick instead
    ctx.globalAlpha = progress;
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  ctx.restore();
}

// Mini-thumbnail of a level scaled to fit a card section
function drawLevelPreview(ctx, px, py, pw, ph, lvl) {
  // Clipping rect
  ctx.save();
  ctx.beginPath();
  ctx.rect(px, py, pw, ph);
  ctx.clip();

  // Background tint
  const g = ctx.createLinearGradient(px, py, px, py + ph);
  g.addColorStop(0, '#b3d9f7');
  g.addColorStop(1, '#dceefb');
  ctx.fillStyle = g;
  ctx.fillRect(px, py, pw, ph);

  const scaleX = pw / 800;
  const scaleY = ph / 560;

  // Obstacles
  for (const obs of (lvl.obstacles ?? [])) {
    const ox  = px + obs.xFrac * pw;
    const oy  = py + obs.yFrac * ph;
    const ang = obs.angle ?? 0;

    ctx.save();
    ctx.translate(ox, oy);
    ctx.rotate(ang);

    let ow, oh;
    if (obs.type === 'platform') {
      ow = (obs.width * scaleX) || 6;
      oh = ((obs.height ?? 10) * scaleY) || 2;
    } else {
      ow = ((obs.width ?? 10) * scaleX) || 2;
      oh = (obs.height * scaleY) || 6;
    }
    ctx.fillStyle = C.obstacleBody;
    ctx.fillRect(-ow / 2, -oh / 2, ow, oh);
    ctx.restore();
  }

  // Glass
  const gx = px + lvl.glass.xFrac * pw;
  const gy = py + ph - 4;
  const gw = lvl.glass.width  * scaleX;
  const gh = lvl.glass.height * scaleY;
  const t  = Math.max(1, 9 * scaleX);

  ctx.fillStyle = C.glassBorder;
  ctx.fillRect(gx - gw / 2, gy - gh, t, gh);
  ctx.fillRect(gx + gw / 2 - t, gy - gh, t, gh);
  ctx.fillRect(gx - gw / 2, gy - t, gw, t);

  // Emitter dot
  const ex = px + lvl.emitterXFrac * pw;
  const ey = py + 4;
  ctx.fillStyle = C.emitterBase;
  ctx.beginPath();
  ctx.arc(ex, ey, Math.max(2, 4 * scaleX), 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

// ─── Emitter ─────────────────────────────────────────────────────────────────

function drawEmitter(ctx, x) {
  ctx.fillStyle = C.emitterBase;
  ctx.beginPath();
  ctx.moveTo(x - 22, 0);
  ctx.lineTo(x + 22, 0);
  ctx.lineTo(x + 13, 34);
  ctx.lineTo(x - 13, 34);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = C.emitterLight;
  ctx.beginPath();
  ctx.moveTo(x - 6, 0);
  ctx.lineTo(x + 2, 0);
  ctx.lineTo(x - 2, 34);
  ctx.lineTo(x - 10, 34);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = C.waterMid;
  ctx.beginPath();
  ctx.arc(x, 42, 5, 0, Math.PI * 2);
  ctx.fill();
}

// ─── Glass ───────────────────────────────────────────────────────────────────

function drawGlass(ctx, glass) {
  const { x, y, width, height } = glass;
  const t = 9;

  ctx.fillStyle = C.glassBody;
  ctx.fillRect(x - width / 2 + t, y - height + t, width - t * 2, height - t);

  ctx.fillStyle = C.glassBorder;
  ctx.fillRect(x - width / 2, y - height, t, height);
  ctx.fillRect(x + width / 2 - t, y - height, t, height);
  ctx.fillRect(x - width / 2, y - t, width, t);

  ctx.fillStyle = C.glassShine;
  ctx.fillRect(x - width / 2 + 2, y - height + 4, 3, height - 8);

  ctx.save();
  ctx.strokeStyle = C.glassBorder;
  ctx.lineWidth = 2;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(x, y - height - 10);
  ctx.lineTo(x, y - height - 24);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
}

// ─── Water particle ──────────────────────────────────────────────────────────

function drawParticle(ctx, px, py) {
  const r = 5;

  ctx.fillStyle = C.waterMid;
  ctx.beginPath();
  ctx.arc(px, py, r, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = C.waterDeep;
  ctx.beginPath();
  ctx.arc(px, py, r * 0.55, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = C.waterShine;
  ctx.beginPath();
  ctx.arc(px - 1.5, py - 1.5, r * 0.3, 0, Math.PI * 2);
  ctx.fill();
}

// ─── Drawn stroke lines ───────────────────────────────────────────────────────

function drawStrokeLine(ctx, points, fillColor, edgeColor, thickness) {
  if (points.length < 2) return;

  ctx.strokeStyle = edgeColor;
  ctx.lineWidth   = thickness + 4;
  ctx.lineCap     = 'round';
  ctx.lineJoin    = 'round';
  ctx.globalAlpha = 0.4;
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i].x, points[i].y);
  }
  ctx.stroke();

  ctx.strokeStyle = fillColor;
  ctx.lineWidth   = thickness;
  ctx.globalAlpha = 1;
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i].x, points[i].y);
  }
  ctx.stroke();
}

// ─── Hand cursor ─────────────────────────────────────────────────────────────

function drawCursor(ctx, x, y, gesture, thumbsUpHeld) {
  ctx.save();

  if (gesture === 'thumbsup') {
    const progress = Math.min(1, (thumbsUpHeld || 0) / 18);
    ctx.strokeStyle = '#69f0ae';
    ctx.lineWidth   = 4;
    ctx.beginPath();
    ctx.arc(x, y, 18, -Math.PI / 2, -Math.PI / 2 + progress * Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#69f0ae';
    ctx.beginPath();
    ctx.arc(x, y, 7, 0, Math.PI * 2);
    ctx.fill();
  } else if (gesture === 'pinch') {
    ctx.fillStyle = C.cursorPinch;
    ctx.beginPath();
    ctx.arc(x, y, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = C.cursorPinch;
    ctx.lineWidth   = 2;
    ctx.globalAlpha = 0.45;
    ctx.beginPath();
    ctx.arc(x, y, 17, 0, Math.PI * 2);
    ctx.stroke();
  } else if (gesture === 'fist') {
    ctx.fillStyle = C.cursorFist;
    ctx.beginPath();
    ctx.arc(x, y, 14, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.strokeStyle = C.cursorOpen;
    ctx.lineWidth   = 3;
    ctx.beginPath();
    ctx.arc(x, y, 16, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = C.cursorOpen;
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// ─── HUD ─────────────────────────────────────────────────────────────────────

function drawHUD(ctx, W, H, phase, level, strokeCount, totalSpawned, inGlass, targetFill) {
  const fillPct = totalSpawned > 0 ? Math.min(1, inGlass / totalSpawned) : 0;
  const needed  = Math.round(targetFill * 100);
  const current = Math.round(fillPct * 100);

  ctx.save();

  ctx.fillStyle = C.hudBg;
  roundRectPath(ctx, 12, 12, 94, 36, 8);
  ctx.fill();
  ctx.fillStyle = C.hudText;
  ctx.font      = 'bold 14px sans-serif';
  ctx.fillText(`LEVEL  ${level}`, 20, 34);

  const cx = W / 2;
  if (phase === 'build') {
    ctx.fillStyle = C.hudBg;
    roundRectPath(ctx, cx - 64, 12, 128, 36, 8);
    ctx.fill();
    ctx.fillStyle = '#ffe082';
    ctx.font      = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('✏  BUILD PHASE', cx, 34);
    ctx.textAlign = 'left';
  } else {
    ctx.fillStyle = C.hudBg;
    roundRectPath(ctx, cx - 68, 12, 136, 36, 8);
    ctx.fill();
    ctx.fillStyle = fillPct >= targetFill ? '#a5d6a7' : C.hudText;
    ctx.font      = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`FILL  ${current}% / ${needed}%`, cx, 34);
    ctx.textAlign = 'left';
  }

  ctx.fillStyle = C.hudBg;
  roundRectPath(ctx, W - 102, 12, 90, 36, 8);
  ctx.fill();
  ctx.fillStyle = C.hudText;
  ctx.font      = 'bold 14px sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(`✏ ${strokeCount}`, W - 20, 34);
  ctx.textAlign = 'left';

  ctx.restore();
}

// ─── Overlays ────────────────────────────────────────────────────────────────

function drawIdleOverlay(ctx, W, H) {
  ctx.save();
  ctx.fillStyle = C.overlayBg;
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = C.overlayText;
  ctx.font      = 'bold 44px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('💧 Happy Glass', W / 2, H / 2 - 70);

  ctx.font      = '20px sans-serif';
  ctx.fillStyle = C.overlayAccent;
  ctx.fillText('Show your hand to the camera', W / 2, H / 2 - 14);

  ctx.font      = 'bold 22px sans-serif';
  ctx.fillStyle = '#69f0ae';
  ctx.fillText('👍  Thumbs Up  to start', W / 2, H / 2 + 28);

  ctx.font      = '15px sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.fillText('Draw lines with PINCH • Release water with a second Thumbs Up', W / 2, H / 2 + 80);

  ctx.restore();
}

function drawBuildHint(ctx, W, H, thumbsUpHeld) {
  ctx.save();

  ctx.fillStyle = 'rgba(13,71,161,0.8)';
  roundRectPath(ctx, W / 2 - 220, H - 48, 440, 38, 8);
  ctx.fill();

  ctx.textAlign = 'center';
  ctx.font      = '15px sans-serif';
  ctx.fillStyle = '#ffe082';
  ctx.fillText('PINCH to draw lines', W / 2 - 90, H - 23);

  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.fillText('|', W / 2, H - 23);

  const progress = Math.min(1, (thumbsUpHeld || 0) / 18);
  ctx.fillStyle = progress > 0 ? '#69f0ae' : C.overlayAccent;
  ctx.fillText(
    progress > 0
      ? `👍 Hold to launch water… ${Math.round(progress * 100)}%`
      : '👍 Thumbs Up to launch water',
    W / 2 + 90,
    H - 23,
  );

  ctx.restore();
}

function drawResolveOverlay(ctx, W, H, success, stars, fillRate, resolveTimer, targetFill) {
  const alpha = Math.min(1, (resolveTimer || 0) / 20) * 0.88;
  ctx.save();
  ctx.fillStyle = success
    ? `rgba(13,71,161,${alpha})`
    : `rgba(80,20,20,${alpha})`;
  ctx.fillRect(0, 0, W, H);

  if (alpha < 0.3) { ctx.restore(); return; }

  ctx.fillStyle = 'rgba(255,255,255,0.1)';
  roundRectPath(ctx, W / 2 - 170, H / 2 - 120, 340, 220, 18);
  ctx.fill();

  ctx.textAlign = 'center';

  if (success) {
    ctx.fillStyle = C.overlayText;
    ctx.font      = 'bold 34px sans-serif';
    ctx.fillText('Level Complete! 🎉', W / 2, H / 2 - 66);

    drawStars(ctx, W / 2, H / 2 - 14, stars);

    ctx.font      = '17px sans-serif';
    ctx.fillStyle = '#a5d6a7';
    ctx.fillText(`${Math.round(fillRate * 100)}% of water captured`, W / 2, H / 2 + 48);

    ctx.font      = '14px sans-serif';
    ctx.fillStyle = C.overlayAccent;
    ctx.fillText('Returning to level select…', W / 2, H / 2 + 78);
  } else {
    ctx.fillStyle = '#ff8a80';
    ctx.font      = 'bold 32px sans-serif';
    ctx.fillText('Not enough water! 💦', W / 2, H / 2 - 60);

    ctx.font      = '19px sans-serif';
    ctx.fillStyle = C.overlayText;
    ctx.fillText(
      `${Math.round(fillRate * 100)}% captured — need ${Math.round((targetFill ?? 0.55) * 100)}%`,
      W / 2, H / 2 - 10,
    );

    ctx.font      = '16px sans-serif';
    ctx.fillStyle = C.overlayAccent;
    ctx.fillText('Retrying level…', W / 2, H / 2 + 36);
  }

  ctx.restore();
}

function drawCompleteOverlay(ctx, W, H) {
  ctx.save();
  ctx.fillStyle = C.overlayBg;
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = C.overlayText;
  ctx.font      = 'bold 42px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('🏆  You Won!', W / 2, H / 2 - 55);

  ctx.font      = '22px sans-serif';
  ctx.fillStyle = C.overlayAccent;
  ctx.fillText('All 20 levels cleared!', W / 2, H / 2 + 8);

  ctx.font      = 'bold 18px sans-serif';
  ctx.fillStyle = '#69f0ae';
  ctx.fillText('👍  Thumbs Up  to level select', W / 2, H / 2 + 54);

  ctx.restore();
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function drawStars(ctx, cx, cy, filled) {
  const total  = 3;
  const size   = 28;
  const gap    = 68;
  const startX = cx - gap;

  for (let i = 0; i < total; i++) {
    const sx = startX + i * gap;
    ctx.fillStyle = i < filled ? C.starFull : C.starEmpty;
    drawStar(ctx, sx, cy, size);
  }
}

function drawStar(ctx, cx, cy, r) {
  const spikes = 5;
  const inner  = r * 0.42;
  ctx.beginPath();
  for (let i = 0; i < spikes * 2; i++) {
    const angle  = (i * Math.PI) / spikes - Math.PI / 2;
    const radius = i % 2 === 0 ? r : inner;
    const x      = cx + Math.cos(angle) * radius;
    const y      = cy + Math.sin(angle) * radius;
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
}

// Shared rounded-rect path builder — does NOT call fill/stroke itself
function roundRectPath(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

export function calcStars(strokeCount, levelConfig) {
  const max = levelConfig?.maxStrokes ?? 6;
  if (strokeCount <= Math.ceil(max / 3))       return 3;
  if (strokeCount <= Math.ceil((max * 2) / 3)) return 2;
  return 1;
}
