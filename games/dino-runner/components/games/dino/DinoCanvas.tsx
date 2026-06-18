'use client';
import React, { forwardRef, useRef, useImperativeHandle } from 'react';
import type { GameState, Obstacle } from '@/game/dino/types';
import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  GROUND_Y,
  PLAYER_DUCK_WIDTH,
  PLAYER_DUCK_HEIGHT,
  PLAYER_RUN_WIDTH,
  PLAYER_RUN_HEIGHT,
} from '@/game/dino/constants';

export interface DinoCanvasRef {
  draw(): void;
}

interface Props {
  gameStateRef: React.MutableRefObject<GameState>;
}

const DinoCanvas = forwardRef<DinoCanvasRef, Props>(({ gameStateRef }, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useImperativeHandle(ref, () => ({
    draw() {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      renderFrame(ctx, gameStateRef.current);
    },
  }));

  return (
    <canvas
      ref={canvasRef}
      width={CANVAS_WIDTH}
      height={CANVAS_HEIGHT}
      className="w-full h-auto block"
      style={{ imageRendering: 'pixelated' }}
    />
  );
});

DinoCanvas.displayName = 'DinoCanvas';
export default DinoCanvas;

// ─────────────────────────────────────────────────────────────────────────────
// Palette
// ─────────────────────────────────────────────────────────────────────────────

interface Palette {
  sky: string;
  fg: string;
  ground: string;
  dash: string;
  cloud: string;
  star: string;
}

function palette(isNight: boolean): Palette {
  if (isNight) {
    return {
      sky: '#16213e',
      fg: '#c8c8e8',
      ground: '#8888b0',
      dash: '#6666aa',
      cloud: '#2a2a4a',
      star: 'rgba(255,255,255,0.85)',
    };
  }
  return {
    sky: '#f7f7f7',
    fg: '#535353',
    ground: '#949494',
    dash: '#b8b8b8',
    cloud: '#e0e0e0',
    star: 'transparent',
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Main render
// ─────────────────────────────────────────────────────────────────────────────

function renderFrame(ctx: CanvasRenderingContext2D, s: GameState): void {
  const pal = palette(s.isNight);

  // Sky
  ctx.fillStyle = pal.sky;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  // Milestone flash
  if (s.milestoneFlash > 0) {
    const a = (s.milestoneFlash / 30) * (s.isNight ? 0.07 : 0.1);
    ctx.fillStyle = s.isNight
      ? `rgba(200,200,255,${a})`
      : `rgba(60,60,60,${a})`;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  }

  // Stars (night only)
  if (s.isNight) drawStars(ctx, s.frameCount, pal.star);

  // Clouds
  ctx.fillStyle = pal.cloud;
  for (const c of s.clouds) drawCloud(ctx, c.x, c.y, c.width);

  // Ground line
  ctx.fillStyle = pal.fg;
  ctx.fillRect(0, GROUND_Y, CANVAS_WIDTH, 2);

  // Ground dashes (scrolling)
  ctx.fillStyle = pal.dash;
  const dashOff = (s.frameCount * s.speed * 0.5) % 60;
  for (let i = -1; i < CANVAS_WIDTH / 60 + 1; i++) {
    ctx.fillRect(i * 60 - dashOff, GROUND_Y + 5, 22, 2);
  }

  // Obstacles
  for (const obs of s.obstacles) {
    ctx.fillStyle = pal.fg;
    drawObstacle(ctx, obs, pal.fg);
  }

  // Player
  const px = s.player.x;
  const py = s.player.y - s.player.bounceOffset;
  ctx.fillStyle = pal.fg;
  if (s.player.state === 'ducking') {
    drawDinoDuck(ctx, px, py, s.player.animFrame, pal.fg);
  } else {
    drawDinoRun(ctx, px, py, s.player.animFrame, pal.fg, s.player.state === 'jumping');
  }

  // Score (top-right, Chrome Dino style)
  ctx.fillStyle = pal.fg;
  ctx.font = 'bold 18px "Courier New", monospace';
  ctx.textAlign = 'right';
  const hi = `HI ${pad5(s.highScore)}`;
  const sc = pad5(s.score);
  ctx.fillText(`${hi}  ${sc}`, CANVAS_WIDTH - 20, 34);
  ctx.textAlign = 'left';
}

function pad5(n: number): string {
  return String(Math.floor(n)).padStart(5, '0');
}

// ─────────────────────────────────────────────────────────────────────────────
// Dino — running / jumping
// Origin: top-left of bounding box (PLAYER_RUN_WIDTH × PLAYER_RUN_HEIGHT)
// ─────────────────────────────────────────────────────────────────────────────
function drawDinoRun(
  ctx: CanvasRenderingContext2D,
  ox: number,
  oy: number,
  frame: number,
  color: string,
  jumping: boolean,
): void {
  ctx.fillStyle = color;

  // Tail (extends left)
  ctx.fillRect(ox - 9, oy + 28, 12, 8);
  ctx.fillRect(ox - 15, oy + 34, 8, 6);

  // Body
  ctx.fillRect(ox, oy + 18, PLAYER_RUN_WIDTH, 26);

  // Head
  ctx.fillRect(ox + 22, oy, 22, 20);

  // Neck join
  ctx.fillRect(ox + 18, oy + 14, 8, 8);

  // Eye white
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(ox + 30, oy + 3, 8, 8);
  // Pupil
  ctx.fillStyle = '#111111';
  ctx.fillRect(ox + 32, oy + 5, 4, 4);
  ctx.fillStyle = color;

  // Jaw
  ctx.fillRect(ox + 40, oy + 13, 6, 5);

  // Arm stub
  ctx.fillRect(ox + 10, oy + 28, 12, 6);

  // Legs
  if (jumping) {
    // Both legs tucked
    ctx.fillRect(ox + 8, oy + 44, 12, 10);
    ctx.fillRect(ox + 24, oy + 44, 12, 10);
  } else if (frame === 0) {
    ctx.fillRect(ox + 8, oy + 44, 12, 14);   // left forward
    ctx.fillRect(ox + 24, oy + 40, 12, 10);  // right back
  } else {
    ctx.fillRect(ox + 8, oy + 40, 12, 10);   // left back
    ctx.fillRect(ox + 24, oy + 44, 12, 14);  // right forward
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Dino — ducking
// Origin: top-left of bounding box (PLAYER_DUCK_WIDTH × PLAYER_DUCK_HEIGHT)
// ─────────────────────────────────────────────────────────────────────────────
function drawDinoDuck(
  ctx: CanvasRenderingContext2D,
  ox: number,
  oy: number,
  frame: number,
  color: string,
): void {
  ctx.fillStyle = color;

  // Tail
  ctx.fillRect(ox - 10, oy + 8, 12, 8);

  // Body (wide and low)
  ctx.fillRect(ox, oy + 4, PLAYER_DUCK_WIDTH - 8, 22);

  // Head (forward / low)
  ctx.fillRect(ox + 36, oy - 2, 22, 18);

  // Neck
  ctx.fillRect(ox + 32, oy + 8, 8, 6);

  // Eye
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(ox + 46, oy + 2, 8, 8);
  ctx.fillStyle = '#111111';
  ctx.fillRect(ox + 48, oy + 4, 4, 4);
  ctx.fillStyle = color;

  // Jaw
  ctx.fillRect(ox + 56, oy + 10, 6, 5);

  // Legs (running, shorter)
  if (frame === 0) {
    ctx.fillRect(ox + 8, oy + 26, 12, 10);
    ctx.fillRect(ox + 24, oy + 22, 12, 8);
  } else {
    ctx.fillRect(ox + 8, oy + 22, 12, 8);
    ctx.fillRect(ox + 24, oy + 26, 12, 10);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Obstacles
// ─────────────────────────────────────────────────────────────────────────────
function drawObstacle(ctx: CanvasRenderingContext2D, obs: Obstacle, color: string): void {
  ctx.fillStyle = color;
  switch (obs.type) {
    case 'cactus-small':  drawCactusSmall(ctx, obs.x, obs.y);  break;
    case 'cactus-medium': drawCactusMedium(ctx, obs.x, obs.y); break;
    case 'cactus-large':  drawCactusLarge(ctx, obs.x, obs.y);  break;
    case 'bird':          drawBird(ctx, obs.x, obs.y, obs.animFrame, color); break;
  }
}

// Cactus small  (20 × 40)
function drawCactusSmall(ctx: CanvasRenderingContext2D, ox: number, oy: number): void {
  ctx.fillRect(ox + 6,  oy,      8,  40); // stem
  ctx.fillRect(ox,      oy + 16, 10, 6);  // left arm top
  ctx.fillRect(ox,      oy + 8,  6,  14); // left arm vert
  ctx.fillRect(ox + 10, oy + 12, 10, 6);  // right arm top
  ctx.fillRect(ox + 14, oy + 4,  6,  14); // right arm vert
}

// Cactus medium (25 × 55)
function drawCactusMedium(ctx: CanvasRenderingContext2D, ox: number, oy: number): void {
  ctx.fillRect(ox + 8,  oy,      9,  55); // stem
  ctx.fillRect(ox,      oy + 18, 12, 7);  // left arm top
  ctx.fillRect(ox,      oy + 9,  7,  16); // left arm vert
  ctx.fillRect(ox + 13, oy + 14, 12, 7);  // right arm top
  ctx.fillRect(ox + 17, oy + 5,  7,  16); // right arm vert
}

// Cactus large = two medium cacti close together (52 × 55)
function drawCactusLarge(ctx: CanvasRenderingContext2D, ox: number, oy: number): void {
  drawCactusMedium(ctx, ox, oy);
  // Second cactus slightly shorter, offset right
  ctx.fillRect(ox + 28, oy + 8,  8,  47); // stem
  ctx.fillRect(ox + 22, oy + 22, 10, 6);  // left arm
  ctx.fillRect(ox + 22, oy + 14, 6,  14);
  ctx.fillRect(ox + 34, oy + 18, 10, 6);  // right arm
  ctx.fillRect(ox + 36, oy + 10, 6,  14);
}

// Bird (46 × 32)
function drawBird(
  ctx: CanvasRenderingContext2D,
  ox: number,
  oy: number,
  frame: number,
  color: string,
): void {
  ctx.fillStyle = color;

  // Body
  ctx.fillRect(ox + 6,  oy + 8, 32, 16);
  // Head
  ctx.fillRect(ox + 32, oy + 4, 14, 18);

  // Eye
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(ox + 38, oy + 7, 6, 6);
  ctx.fillStyle = '#111111';
  ctx.fillRect(ox + 40, oy + 9, 3, 3);
  ctx.fillStyle = color;

  // Beak
  ctx.fillRect(ox + 44, oy + 14, 8, 5);

  // Wings — two frames
  if (frame === 0) {
    ctx.fillRect(ox + 4, oy,      26, 8); // upper
    ctx.fillRect(ox + 4, oy + 24, 26, 8); // lower
  } else {
    ctx.fillRect(ox + 2, oy + 4,  26, 8);
    ctx.fillRect(ox + 2, oy + 20, 26, 8);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Clouds
// ─────────────────────────────────────────────────────────────────────────────
function drawCloud(ctx: CanvasRenderingContext2D, ox: number, oy: number, w: number): void {
  const h = Math.round(w * 0.38);
  // Base rectangle
  ctx.fillRect(ox + Math.round(w * 0.12), oy + Math.round(h * 0.55), Math.round(w * 0.76), Math.round(h * 0.45));
  // Bumps
  fillCircle(ctx, ox + Math.round(w * 0.25), oy + Math.round(h * 0.5), Math.round(w * 0.13));
  fillCircle(ctx, ox + Math.round(w * 0.5),  oy + Math.round(h * 0.2), Math.round(w * 0.18));
  fillCircle(ctx, ox + Math.round(w * 0.75), oy + Math.round(h * 0.45), Math.round(w * 0.13));
}

function fillCircle(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number): void {
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
}

// ─────────────────────────────────────────────────────────────────────────────
// Stars
// ─────────────────────────────────────────────────────────────────────────────
function drawStars(ctx: CanvasRenderingContext2D, frame: number, color: string): void {
  ctx.fillStyle = color;
  for (let i = 0; i < 22; i++) {
    const x = (i * 139 + 43) % CANVAS_WIDTH;
    const y = (i * 73  + 22) % (GROUND_Y - 70);
    if (Math.sin(frame * 0.04 + i * 1.3) > 0.1) {
      ctx.fillRect(x, y, 2, 2);
    }
  }
}
