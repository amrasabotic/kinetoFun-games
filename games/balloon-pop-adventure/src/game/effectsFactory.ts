import type { Effect, EffectType, Particle } from './types';
import { PARTICLE_COUNT } from '../constants/gameConfig';
import { randomBetween, uid } from '../utils/mathUtils';

// ─── Particle builders ────────────────────────────────────────────────────

function makeParticle(
  x: number,
  y: number,
  color: string,
  speedMult = 1,
  sizeMult = 1,
): Particle {
  const angle = Math.random() * Math.PI * 2;
  const speed = randomBetween(150, 380) * speedMult;
  return {
    x,
    y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed - 80, // slight upward bias
    color,
    size: randomBetween(5, 12) * sizeMult,
    opacity: 1,
    rotation: Math.random() * Math.PI * 2,
    rotationSpeed: randomBetween(-4, 4),
    gravity: 400,
    shrink: 0.96,
  };
}

function confettiParticle(x: number, y: number): Particle {
  const CONFETTI_COLORS = [
    '#FF6B6B', '#FFD700', '#4ECDC4', '#45B7D1', '#96CEB4',
    '#DDA0DD', '#A8E063', '#FF8A80', '#85C1E9', '#F7DC6F',
  ];
  const angle = Math.random() * Math.PI * 2;
  const speed = randomBetween(200, 500);
  return {
    x,
    y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed - 150,
    color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
    size: randomBetween(6, 14),
    opacity: 1,
    rotation: Math.random() * Math.PI * 2,
    rotationSpeed: randomBetween(-6, 6),
    gravity: 350,
    shrink: 0.99,
  };
}

// ─── Effect factory ───────────────────────────────────────────────────────

export function createEffect(
  type: EffectType,
  x: number,
  y: number,
  color: string,
  radius: number,
  now: number,
): Effect {
  const count = PARTICLE_COUNT[type] ?? 12;
  let particles: Particle[] = [];
  let duration = 600;

  switch (type) {
    case 'pop':
      particles = Array.from({ length: count }, () => makeParticle(x, y, color));
      duration = 600;
      break;

    case 'goldPop': {
      const starColors = ['#FFD700', '#FFF176', '#FFEE58', '#FFC107', '#FFFFFF'];
      particles = Array.from({ length: count }, () =>
        makeParticle(x, y, starColors[Math.floor(Math.random() * starColors.length)], 1.2, 1.3),
      );
      duration = 800;
      break;
    }

    case 'explosion': {
      const bombColors = ['#FF4444', '#FF8800', '#FFDD00', '#FF6666', '#CC0000'];
      particles = Array.from({ length: count }, () =>
        makeParticle(x, y, bombColors[Math.floor(Math.random() * bombColors.length)], 1.4, 1.5),
      );
      duration = 700;
      break;
    }

    case 'iceShatter': {
      const iceColors = ['#E3F2FD', '#90CAF9', '#BBDEFB', '#FFFFFF', '#B3E5FC'];
      particles = Array.from({ length: count }, () =>
        makeParticle(x, y, iceColors[Math.floor(Math.random() * iceColors.length)], 0.7, 0.9),
      );
      // Ice particles drift more sideways, less gravity
      particles.forEach(p => { p.gravity = 150; });
      duration = 750;
      break;
    }

    case 'rainbowBurst': {
      particles = Array.from({ length: count }, (_, i) => {
        const hue = (i / count) * 360;
        return makeParticle(x, y, `hsl(${hue}, 100%, 60%)`, 1.3, 1.4);
      });
      duration = 900;
      break;
    }

    case 'confetti':
      particles = Array.from({ length: count }, () => confettiParticle(x, y));
      duration = 1500;
      break;
  }

  return {
    id: uid(),
    type,
    x,
    y,
    startTime: now,
    duration,
    particles,
    color,
    radius,
    done: false,
  };
}

/** Update a single effect — mutates particles in-place for performance. Returns true when done. */
export function updateEffect(effect: Effect, dt: number): boolean {
  const elapsed = performance.now() - effect.startTime;
  if (elapsed >= effect.duration) {
    effect.done = true;
    return true;
  }

  const dtSec = dt / 1000;
  for (const p of effect.particles) {
    p.x  += p.vx * dtSec;
    p.y  += p.vy * dtSec;
    p.vy += p.gravity * dtSec;
    p.rotation += p.rotationSpeed * dtSec;
    p.opacity   = Math.max(0, p.opacity - dtSec * 1.4);
    p.size     *= p.shrink;
  }

  return false;
}
