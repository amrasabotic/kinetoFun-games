import type { GameState, Environment, ObstacleEntity, CoinEntity, PowerUpEntity, Particle, Lane } from '../types/game';
import { HORIZON_Y_FACTOR, PLAYER_Y_FACTOR, LANE_WIDTH_FACTOR, MAX_Z } from '../utils/constants';
import { lerp, clamp } from '../utils/math';
import { getCharacter } from '../utils/characters';

interface Projected {
  x: number;
  y: number;
  scale: number;
}

function project(lane: number, z: number, W: number, H: number): Projected {
  const VP_Y = H * HORIZON_Y_FACTOR;
  const PLAYER_Y = H * PLAYER_Y_FACTOR;
  const HALF_ROAD_TOP = W * 0.03;
  const HALF_ROAD_BOTTOM = W * (LANE_WIDTH_FACTOR * 1.7);

  const t = Math.max(0, 1 - z / MAX_Z);
  const y = VP_Y + t * (PLAYER_Y - VP_Y);
  const halfRoad = HALF_ROAD_TOP + t * (HALF_ROAD_BOTTOM - HALF_ROAD_TOP);
  const laneOffset = lane * (halfRoad * 2 / 3);
  return { x: W / 2 + laneOffset, y, scale: Math.max(0.01, t) };
}

interface EnvTheme {
  bgTop: string;
  bgBottom: string;
  roadColor: string;
  accentColor: string;
  fogColor: string;
  lineColor: string;
}

const ENV_THEMES: Record<Environment, EnvTheme> = {
  'neon-city': {
    bgTop: '#000010',
    bgBottom: '#001030',
    roadColor: '#111125',
    accentColor: '#00ffff',
    fogColor: 'rgba(0,16,48,0.6)',
    lineColor: 'rgba(0,255,255,0.3)',
  },
  jungle: {
    bgTop: '#001a00',
    bgBottom: '#003300',
    roadColor: '#1a2a10',
    accentColor: '#44ff44',
    fogColor: 'rgba(0,30,0,0.5)',
    lineColor: 'rgba(68,255,68,0.25)',
  },
  desert: {
    bgTop: '#201000',
    bgBottom: '#402000',
    roadColor: '#3a2a15',
    accentColor: '#ff8800',
    fogColor: 'rgba(40,24,0,0.5)',
    lineColor: 'rgba(255,136,0,0.3)',
  },
  snow: {
    bgTop: '#101525',
    bgBottom: '#202a40',
    roadColor: '#2a3545',
    accentColor: '#aaddff',
    fogColor: 'rgba(20,30,50,0.5)',
    lineColor: 'rgba(170,221,255,0.3)',
  },
};

function drawSky(ctx: CanvasRenderingContext2D, W: number, H: number, env: Environment): void {
  const theme = ENV_THEMES[env];
  const VP_Y = H * HORIZON_Y_FACTOR;
  const grad = ctx.createLinearGradient(0, 0, 0, VP_Y);
  grad.addColorStop(0, theme.bgTop);
  grad.addColorStop(1, theme.bgBottom);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, VP_Y);
}

function drawRoad(ctx: CanvasRenderingContext2D, W: number, H: number, env: Environment): void {
  const theme = ENV_THEMES[env];
  const VP_Y = H * HORIZON_Y_FACTOR;
  const PLAYER_Y = H * PLAYER_Y_FACTOR;
  const HALF_TOP = W * 0.03;
  const HALF_BOTTOM = W * (LANE_WIDTH_FACTOR * 1.7);
  const ROAD_BOTTOM = H;

  // Road trapezoid
  ctx.fillStyle = theme.roadColor;
  ctx.beginPath();
  ctx.moveTo(W / 2 - HALF_TOP, VP_Y);
  ctx.lineTo(W / 2 + HALF_TOP, VP_Y);
  ctx.lineTo(W / 2 + HALF_BOTTOM, ROAD_BOTTOM);
  ctx.lineTo(W / 2 - HALF_BOTTOM, ROAD_BOTTOM);
  ctx.closePath();
  ctx.fill();

  // Lane dividers (dashed perspective lines)
  ctx.strokeStyle = theme.lineColor;
  ctx.lineWidth = 1.5;
  for (const laneDiv of [-1, 0, 1]) {
    const top = project(laneDiv, MAX_Z, W, H);
    const bottom = project(laneDiv, 0, W, H);
    ctx.setLineDash([18, 22]);
    ctx.beginPath();
    ctx.moveTo(top.x, top.y);
    ctx.lineTo(bottom.x, bottom.y);
    ctx.stroke();
  }
  ctx.setLineDash([]);

  // Road edges
  ctx.strokeStyle = theme.accentColor;
  ctx.lineWidth = 2;
  ctx.globalAlpha = 0.4;
  ctx.beginPath();
  ctx.moveTo(W / 2 - HALF_TOP, VP_Y);
  ctx.lineTo(W / 2 - HALF_BOTTOM, ROAD_BOTTOM);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(W / 2 + HALF_TOP, VP_Y);
  ctx.lineTo(W / 2 + HALF_BOTTOM, ROAD_BOTTOM);
  ctx.stroke();
  ctx.globalAlpha = 1;

  // Fog at horizon
  const fog = ctx.createLinearGradient(0, VP_Y - 30, 0, VP_Y + 60);
  fog.addColorStop(0, theme.fogColor);
  fog.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = fog;
  ctx.fillRect(0, VP_Y - 30, W, 90);
}

function drawEnvDetails(ctx: CanvasRenderingContext2D, W: number, H: number, env: Environment, distance: number): void {
  const VP_Y = H * HORIZON_Y_FACTOR;
  const ROAD_HALF = W * (LANE_WIDTH_FACTOR * 1.7);
  const theme = ENV_THEMES[env];

  // Draw side scenery at several Z depths
  const depths = [600, 400, 200, 100];
  depths.forEach((z, di) => {
    const t = 1 - z / MAX_Z;
    const y = VP_Y + t * (H * PLAYER_Y_FACTOR - VP_Y);
    const sideX = W / 2 + ROAD_HALF + W * 0.02;
    const scale = t * 0.9 + 0.1;
    const scrollOffset = (distance * 0.2 * (1 - z / MAX_Z)) % (W * 0.35);

    ctx.save();
    ctx.translate(-scrollOffset, 0);

    switch (env) {
      case 'neon-city':
        // Buildings
        for (let i = -2; i <= 3; i++) {
          const bx = sideX + i * W * 0.3;
          const bh = (60 + ((i * 37 + di * 19) % 80)) * scale;
          const bw = 40 * scale;
          ctx.fillStyle = `rgba(0,10,30,${0.8 * scale})`;
          ctx.fillRect(bx - bw / 2, y - bh, bw, bh);
          // Window lights
          ctx.fillStyle = theme.accentColor;
          ctx.globalAlpha = 0.6 * scale;
          for (let wy = y - bh + 8 * scale; wy < y - 4 * scale; wy += 10 * scale) {
            for (let wx = bx - bw / 2 + 5 * scale; wx < bx + bw / 2 - 5 * scale; wx += 12 * scale) {
              ctx.fillRect(wx, wy, 4 * scale, 4 * scale);
            }
          }
          ctx.globalAlpha = 1;

          // Mirror left side
          const lbx = W - bx;
          ctx.fillStyle = `rgba(0,10,30,${0.8 * scale})`;
          ctx.fillRect(lbx - bw / 2, y - bh, bw, bh);
        }
        break;

      case 'jungle':
        // Trees
        for (let i = -1; i <= 4; i++) {
          const tx = sideX + i * W * 0.25;
          const th = (70 + ((i * 41 + di * 23) % 50)) * scale;
          ctx.fillStyle = `rgba(0,40,0,${0.9 * scale})`;
          ctx.beginPath();
          ctx.moveTo(tx, y);
          ctx.lineTo(tx - 18 * scale, y - th * 0.4);
          ctx.lineTo(tx - 12 * scale, y - th * 0.4);
          ctx.lineTo(tx - 22 * scale, y - th * 0.7);
          ctx.lineTo(tx - 10 * scale, y - th * 0.7);
          ctx.lineTo(tx, y - th);
          ctx.lineTo(tx + 10 * scale, y - th * 0.7);
          ctx.lineTo(tx + 22 * scale, y - th * 0.7);
          ctx.lineTo(tx + 12 * scale, y - th * 0.4);
          ctx.lineTo(tx + 18 * scale, y - th * 0.4);
          ctx.closePath();
          ctx.fill();

          const ltx = W - tx;
          ctx.fillStyle = `rgba(0,50,0,${0.9 * scale})`;
          ctx.beginPath();
          ctx.moveTo(ltx, y);
          ctx.lineTo(ltx - 18 * scale, y - th * 0.4);
          ctx.lineTo(ltx - 12 * scale, y - th * 0.4);
          ctx.lineTo(ltx - 22 * scale, y - th * 0.7);
          ctx.lineTo(ltx - 10 * scale, y - th * 0.7);
          ctx.lineTo(ltx, y - th);
          ctx.lineTo(ltx + 10 * scale, y - th * 0.7);
          ctx.lineTo(ltx + 22 * scale, y - th * 0.7);
          ctx.lineTo(ltx + 12 * scale, y - th * 0.4);
          ctx.lineTo(ltx + 18 * scale, y - th * 0.4);
          ctx.closePath();
          ctx.fill();
        }
        break;

      case 'desert':
        // Sand dunes
        ctx.fillStyle = `rgba(60,35,0,${0.7 * scale})`;
        ctx.beginPath();
        ctx.moveTo(sideX, y);
        for (let i = 0; i <= 5; i++) {
          const dx = sideX + i * W * 0.2;
          const dy = y - (20 + ((i * 31 + di * 17) % 30)) * scale;
          ctx.quadraticCurveTo(dx - W * 0.1, y, dx, dy);
        }
        ctx.lineTo(W, y);
        ctx.closePath();
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(0, y);
        for (let i = 0; i <= 5; i++) {
          const dx = W - sideX - i * W * 0.2;
          const dy = y - (20 + ((i * 29 + di * 13) % 30)) * scale;
          ctx.quadraticCurveTo(dx + W * 0.1, y, dx, dy);
        }
        ctx.lineTo(0, y);
        ctx.closePath();
        ctx.fill();
        break;

      case 'snow':
        // Icebergs / snowy peaks
        ctx.fillStyle = `rgba(200,220,255,${0.4 * scale})`;
        for (let i = -1; i <= 4; i++) {
          const px = sideX + i * W * 0.28;
          const ph = (50 + ((i * 43 + di * 17) % 60)) * scale;
          ctx.beginPath();
          ctx.moveTo(px - 25 * scale, y);
          ctx.lineTo(px, y - ph);
          ctx.lineTo(px + 25 * scale, y);
          ctx.closePath();
          ctx.fill();

          const rpx = W - px;
          ctx.beginPath();
          ctx.moveTo(rpx - 25 * scale, y);
          ctx.lineTo(rpx, y - ph);
          ctx.lineTo(rpx + 25 * scale, y);
          ctx.closePath();
          ctx.fill();
        }
        break;
    }

    ctx.restore();
  });
}

function drawObstacle(ctx: CanvasRenderingContext2D, ob: ObstacleEntity, W: number, H: number, env: Environment): void {
  if (!ob.active) return;
  const { x, y, scale } = project(ob.lane, ob.z, W, H);
  const theme = ENV_THEMES[env];
  const s = scale;

  ctx.save();
  ctx.translate(x, y);

  switch (ob.type) {
    case 'cone': {
      // Orange traffic cone
      const cw = 22 * s;
      const ch = 36 * s;
      ctx.fillStyle = '#ff6600';
      ctx.beginPath();
      ctx.moveTo(0, -ch);
      ctx.lineTo(-cw / 2, 0);
      ctx.lineTo(cw / 2, 0);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-cw / 2, -ch * 0.35, cw, ch * 0.1);
      ctx.fillRect(-cw / 2, -ch * 0.65, cw * 0.8, ch * 0.1);
      // Base
      ctx.fillStyle = '#cc4400';
      ctx.fillRect(-cw * 0.7, -4 * s, cw * 1.4, 4 * s);
      break;
    }
    case 'crate': {
      const cw = 38 * s;
      const ch = 38 * s;
      ctx.fillStyle = '#8b5e3c';
      ctx.fillRect(-cw / 2, -ch, cw, ch);
      ctx.strokeStyle = '#5a3a1a';
      ctx.lineWidth = 2 * s;
      ctx.strokeRect(-cw / 2, -ch, cw, ch);
      // Cross lines
      ctx.beginPath();
      ctx.moveTo(-cw / 2, -ch / 2);
      ctx.lineTo(cw / 2, -ch / 2);
      ctx.moveTo(0, -ch);
      ctx.lineTo(0, 0);
      ctx.stroke();
      break;
    }
    case 'barrier': {
      const bw = 60 * s;
      const bh = 28 * s;
      // Jersey barrier
      ctx.fillStyle = '#888888';
      ctx.beginPath();
      ctx.moveTo(-bw / 2, 0);
      ctx.lineTo(-bw / 2 + 6 * s, -bh * 0.4);
      ctx.lineTo(-bw / 2 + 3 * s, -bh);
      ctx.lineTo(bw / 2 - 3 * s, -bh);
      ctx.lineTo(bw / 2 - 6 * s, -bh * 0.4);
      ctx.lineTo(bw / 2, 0);
      ctx.closePath();
      ctx.fill();
      // Stripe
      ctx.fillStyle = '#ff4444';
      ctx.fillRect(-bw * 0.4, -bh * 0.7, bw * 0.8, bh * 0.12);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-bw * 0.4, -bh * 0.55, bw * 0.8, bh * 0.1);
      break;
    }
    case 'ball': {
      const r = 20 * s;
      ctx.fillStyle = '#ff2222';
      ctx.beginPath();
      ctx.arc(0, -r, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5 * s;
      ctx.beginPath();
      ctx.arc(0, -r, r, 0, Math.PI * 2);
      ctx.stroke();
      // Pentagon lines suggestion
      ctx.beginPath();
      ctx.arc(0, -r, r * 0.5, 0, Math.PI * 2);
      ctx.stroke();
      break;
    }
    case 'low-block': {
      // Low block — player must jump
      const bw = 55 * s;
      const bh = 18 * s;
      ctx.fillStyle = '#444488';
      ctx.fillRect(-bw / 2, -bh, bw, bh);
      ctx.strokeStyle = '#8888ff';
      ctx.lineWidth = 2 * s;
      ctx.strokeRect(-bw / 2, -bh, bw, bh);
      // Arrow up indicator
      ctx.fillStyle = '#aaaaff';
      ctx.beginPath();
      ctx.moveTo(0, -bh - 12 * s);
      ctx.lineTo(-8 * s, -bh - 4 * s);
      ctx.lineTo(8 * s, -bh - 4 * s);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case 'high-arch': {
      // Arch overhead — player must slide
      const aw = 70 * s;
      const ah = 70 * s;
      const pillarW = 10 * s;
      ctx.strokeStyle = '#aa4400';
      ctx.lineWidth = pillarW;
      ctx.beginPath();
      // Left pillar
      ctx.moveTo(-aw / 2, 0);
      ctx.lineTo(-aw / 2, -ah * 0.5);
      // Arch
      ctx.arc(0, -ah * 0.5, aw / 2, Math.PI, 0);
      // Right pillar
      ctx.lineTo(aw / 2, 0);
      ctx.stroke();
      // Down arrows
      ctx.fillStyle = '#ff8800';
      ctx.beginPath();
      ctx.moveTo(0, -ah * 0.12);
      ctx.lineTo(-8 * s, -ah * 0.25);
      ctx.lineTo(8 * s, -ah * 0.25);
      ctx.closePath();
      ctx.fill();
      break;
    }
  }

  ctx.restore();
}

function drawCoin(ctx: CanvasRenderingContext2D, coin: CoinEntity, W: number, H: number, time: number): void {
  if (!coin.active || coin.collected) return;
  const { x, y, scale } = project(coin.lane, coin.z, W, H);
  const r = 10 * scale;
  // Squish spin
  const spinPhase = time * 3 + coin.z * 0.01;
  const squishX = Math.abs(Math.cos(spinPhase));

  ctx.save();
  ctx.translate(x, y - r);
  ctx.scale(squishX, 1);

  const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
  grad.addColorStop(0, '#fff380');
  grad.addColorStop(0.5, '#ffe04d');
  grad.addColorStop(1, '#cc8800');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#aa6600';
  ctx.lineWidth = 1.5 * scale;
  ctx.stroke();

  // $ symbol
  if (r > 5) {
    ctx.fillStyle = '#aa6600';
    ctx.font = `bold ${r * 1.2}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('$', 0, 0);
  }

  ctx.restore();
}

function drawPowerUpItem(ctx: CanvasRenderingContext2D, pu: PowerUpEntity, W: number, H: number, time: number): void {
  if (!pu.active || pu.collected) return;
  const { x, y, scale } = project(pu.lane, pu.z, W, H);
  const r = 14 * scale;
  const bob = Math.sin(time * 2 + pu.z * 0.01) * 4 * scale;

  ctx.save();
  ctx.translate(x, y - r * 1.5 + bob);

  const colors: Record<string, string> = {
    magnet: '#ff4444',
    shield: '#00ccff',
    speed: '#00ff88',
    'double-coins': '#ffe04d',
  };
  const color = colors[pu.type] ?? '#ffffff';

  // Glow
  ctx.shadowColor = color;
  ctx.shadowBlur = 12 * scale;

  ctx.fillStyle = color;
  ctx.globalAlpha = 0.85;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.shadowBlur = 0;

  // Icon
  ctx.fillStyle = '#000000';
  ctx.font = `bold ${r * 1.3}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const icons: Record<string, string> = { magnet: 'M', shield: 'S', speed: 'V', 'double-coins': 'X' };
  ctx.fillText(icons[pu.type] ?? '?', 0, 0);

  ctx.restore();
}

function drawPlayer(ctx: CanvasRenderingContext2D, state: GameState, W: number, H: number): void {
  const p = state.player;
  const char = getCharacter(p.characterId);

  const lerpLane = lerp(p.lane, p.targetLane, p.laneTransitionProgress);
  const groundY = H * PLAYER_Y_FACTOR;
  const jumpOffset = p.y * 60; // convert game units to pixels

  const px = W / 2 + lerpLane * W * LANE_WIDTH_FACTOR * 1.2;
  const py = groundY - jumpOffset;

  const bodyH = p.isSliding ? 28 : 48;
  const bodyW = 22;
  const headR = p.isSliding ? 10 : 13;
  const legH = p.isSliding ? 8 : 20;

  ctx.save();
  ctx.translate(px, py);

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.beginPath();
  ctx.ellipse(0, 2, bodyW * 0.6, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Legs
  ctx.strokeStyle = char.color;
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';

  if (!p.isSliding) {
    // Running leg animation
    const legPhase = (Date.now() / 120) % (Math.PI * 2);
    ctx.beginPath();
    ctx.moveTo(-5, -10);
    ctx.lineTo(-8 + Math.sin(legPhase) * 10, -10 + legH);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(5, -10);
    ctx.lineTo(8 + Math.sin(legPhase + Math.PI) * 10, -10 + legH);
    ctx.stroke();
  } else {
    // Slide legs horizontal
    ctx.beginPath();
    ctx.moveTo(-bodyW / 2, 0);
    ctx.lineTo(bodyW / 2, -8);
    ctx.stroke();
  }

  // Body
  ctx.fillStyle = char.color;
  if (p.isSliding) {
    // Crouched body
    ctx.fillRect(-bodyW / 2, -bodyH, bodyW, bodyH);
  } else {
    ctx.fillRect(-bodyW / 2, -bodyH - legH + 10, bodyW, bodyH);
  }

  // Torso accent
  ctx.fillStyle = char.accentColor;
  ctx.fillRect(-8, -bodyH - legH + 20, 16, 8);

  // Arms
  ctx.strokeStyle = char.color;
  ctx.lineWidth = 4;
  if (!p.isSliding) {
    const armPhase = (Date.now() / 120) % (Math.PI * 2);
    ctx.beginPath();
    ctx.moveTo(-bodyW / 2, -bodyH - legH + 24);
    ctx.lineTo(-bodyW / 2 - 12 + Math.sin(armPhase + Math.PI) * 8, -bodyH - legH + 38);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(bodyW / 2, -bodyH - legH + 24);
    ctx.lineTo(bodyW / 2 + 12 + Math.sin(armPhase) * 8, -bodyH - legH + 38);
    ctx.stroke();
  }

  // Head
  const headY = p.isSliding ? -bodyH - headR + 5 : -bodyH - legH - headR + 10;
  ctx.fillStyle = char.accentColor;
  ctx.beginPath();
  ctx.arc(0, headY, headR, 0, Math.PI * 2);
  ctx.fill();

  // Eyes
  ctx.fillStyle = '#000000';
  ctx.beginPath();
  ctx.arc(-headR * 0.35, headY - 2, 2.5, 0, Math.PI * 2);
  ctx.arc(headR * 0.35, headY - 2, 2.5, 0, Math.PI * 2);
  ctx.fill();

  // Shield aura
  if (state.activePowerUps.shield) {
    ctx.strokeStyle = '#00ccff';
    ctx.lineWidth = 3;
    ctx.globalAlpha = 0.6 + Math.sin(Date.now() / 200) * 0.2;
    ctx.beginPath();
    ctx.arc(0, headY - 10, headR + bodyH * 0.6, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  ctx.restore();
}

function drawParticles(ctx: CanvasRenderingContext2D, particles: Particle[]): void {
  for (const p of particles) {
    if (!p.active) continue;
    ctx.globalAlpha = clamp(p.life, 0, 1);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawCountdown(ctx: CanvasRenderingContext2D, W: number, H: number, value: number): void {
  const text = value > 0 ? String(value) : 'GO!';
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `bold ${value > 0 ? 140 : 110}px sans-serif`;
  // Glow
  ctx.shadowColor = value > 0 ? '#00ffcc' : '#00ff88';
  ctx.shadowBlur = 30;
  ctx.fillStyle = value > 0 ? '#ffffff' : '#00ff88';
  ctx.fillText(text, W / 2, H / 2);
  ctx.restore();
}

function drawGameOver(ctx: CanvasRenderingContext2D, W: number, H: number): void {
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 80px sans-serif';
  ctx.shadowColor = '#ff3333';
  ctx.shadowBlur = 30;
  ctx.fillStyle = '#ff3333';
  ctx.fillText('GAME OVER', W / 2, H / 2);
  ctx.restore();
}

export function drawScene(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  W: number,
  H: number,
  time: number
): void {
  ctx.clearRect(0, 0, W, H);

  // Sky
  drawSky(ctx, W, H, state.environment);

  // Environment details (side scenery)
  drawEnvDetails(ctx, W, H, state.environment, state.distance);

  // Road
  drawRoad(ctx, W, H, state.environment);

  // Sort and draw coins, power-ups, obstacles by Z (far to near)
  const allEntities: Array<{ z: number; draw: () => void }> = [];

  state.coinEntities.forEach((c) => {
    if (!c.active || c.collected) return;
    allEntities.push({ z: c.z, draw: () => drawCoin(ctx, c, W, H, time) });
  });

  state.powerUpEntities.forEach((p) => {
    if (!p.active || p.collected) return;
    allEntities.push({ z: p.z, draw: () => drawPowerUpItem(ctx, p, W, H, time) });
  });

  state.obstacles.forEach((ob) => {
    if (!ob.active) return;
    allEntities.push({ z: ob.z, draw: () => drawObstacle(ctx, ob, W, H, state.environment) });
  });

  // Draw far-to-near
  allEntities.sort((a, b) => b.z - a.z);
  allEntities.forEach((e) => e.draw());

  // Player
  drawPlayer(ctx, state, W, H);

  // Particles
  drawParticles(ctx, state.particles);

  // Overlays
  if (state.phase === 'countdown' && state.countdownValue > 0) {
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(0, 0, W, H);
    drawCountdown(ctx, W, H, state.countdownValue);
  } else if (state.phase === 'countdown' && state.countdownValue === 0) {
    drawCountdown(ctx, W, H, 0);
  }

  if (state.phase === 'dead' || state.phase === 'gameover') {
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, 0, W, H);
    drawGameOver(ctx, W, H);
  }
}
