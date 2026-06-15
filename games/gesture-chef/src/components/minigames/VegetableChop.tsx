import React, { useRef, useEffect, useCallback } from 'react';
import type { MinigameComponentProps } from './types';
import { DIFFICULTY_SETTINGS } from '../../constants/gameConfig';
import { randomBetween, randomInt, segmentIntersectsCircle } from '../../utils/mathUtils';
import { audioManager } from '../../utils/audio';

const VEGETABLES = [
  { emoji: '🥕', color: '#FF8C42', name: 'carrot' },
  { emoji: '🥒', color: '#7ABA78', name: 'cucumber' },
  { emoji: '🍅', color: '#FF4444', name: 'tomato' },
  { emoji: '🍄', color: '#C67C52', name: 'mushroom' },
  { emoji: '🥔', color: '#C8A96E', name: 'potato' },
  { emoji: '🧅', color: '#FFBF69', name: 'onion' },
  { emoji: '🥦', color: '#5A9E5A', name: 'broccoli' },
];

interface Veg {
  id: number;
  emoji: string;
  color: string;
  x: number; y: number;       // canvas pixels
  size: number;
  chopped: boolean;
  choppedAt: number;
  halves: { x: number; y: number; vx: number; vy: number; angle: number }[];
}

interface Particle {
  x: number; y: number; vx: number; vy: number;
  color: string; size: number; life: number; maxLife: number;
}

interface ScorePop {
  x: number; y: number; text: string; life: number; maxLife: number;
}

interface GameRef {
  vegetables: Veg[];
  particles: Particle[];
  scorePops: ScorePop[];
  nextId: number;
  spawnTimer: number;
  spawnInterval: number;
  combo: number;
  comboTimer: number;
  totalScore: number;
  mouseX: number; mouseY: number;
  prevX: number; prevY: number;
  isDown: boolean;
  lastTime: number;
  width: number; height: number;
  hasChopped: boolean;
}

export const VegetableChop: React.FC<MinigameComponentProps> = ({
  difficulty, paused, onScore, onCombo,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gRef = useRef<GameRef>({
    vegetables: [], particles: [], scorePops: [],
    nextId: 0, spawnTimer: 0, spawnInterval: 0,
    combo: 1, comboTimer: 0, totalScore: 0,
    mouseX: 0, mouseY: 0, prevX: 0, prevY: 0,
    isDown: false, lastTime: 0, width: 0, height: 0,
    hasChopped: false,
  });
  const rafRef = useRef<number>(0);
  const pausedRef = useRef(paused);

  useEffect(() => { pausedRef.current = paused; }, [paused]);

  const cfg = DIFFICULTY_SETTINGS[difficulty];

  const spawnVeg = useCallback(() => {
    const g = gRef.current;
    if (g.vegetables.filter(v => !v.chopped).length >= 7) return;
    const type = VEGETABLES[randomInt(0, VEGETABLES.length - 1)];
    const size = Math.round(cfg.targetSize * randomBetween(44, 58));
    const margin = size + 10;
    g.vegetables.push({
      id: g.nextId++,
      emoji: type.emoji,
      color: type.color,
      x: randomBetween(margin, g.width - margin),
      y: randomBetween(margin + 60, g.height - margin - 40),
      size,
      chopped: false,
      choppedAt: 0,
      halves: [],
    });
  }, [cfg.targetSize]);

  const chopVeg = useCallback((veg: Veg, mx: number, my: number) => {
    const g = gRef.current;
    if (veg.chopped) return;
    veg.chopped = true;
    veg.choppedAt = performance.now();
    g.hasChopped = true;

    // Compute chop direction perpendicular to mouse velocity
    const dx = mx - g.prevX; const dy = my - g.prevY;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const px = -dy / len; const py = dx / len; // perpendicular

    veg.halves = [
      { x: veg.x + px * 8,  y: veg.y + py * 8,  vx: px * 3 - 2, vy: py * 3 - 4, angle: -0.4 },
      { x: veg.x - px * 8,  y: veg.y - py * 8,  vx: -px * 3 + 2, vy: -py * 3 - 4, angle: 0.4 },
    ];

    // Juice particles
    for (let i = 0; i < 12; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = randomBetween(2, 7);
      g.particles.push({
        x: veg.x, y: veg.y,
        vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - 2,
        color: veg.color, size: randomBetween(4, 10),
        life: 1, maxLife: randomBetween(0.5, 1.0),
      });
    }

    audioManager.chop();

    // Combo
    const now = performance.now();
    if (now - g.comboTimer < 1800) {
      g.combo = Math.min(g.combo + 1, 8);
    } else {
      g.combo = 1;
    }
    g.comboTimer = now;
    if (g.combo > 1) audioManager.combo(g.combo);
    onCombo(g.combo);

    const pts = 10 * g.combo;
    g.totalScore += pts;
    onScore(pts);

    g.scorePops.push({
      x: veg.x, y: veg.y - veg.size,
      text: g.combo > 1 ? `+${pts} ×${g.combo}!` : `+${pts}`,
      life: 1, maxLife: 1.2,
    });
  }, [onScore, onCombo]);

  // Canvas setup + game loop
  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    const g = gRef.current;

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      g.width = canvas.width;
      g.height = canvas.height;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const cfg = DIFFICULTY_SETTINGS[difficulty];
    g.spawnInterval = Math.round(2200 / cfg.speedMultiplier);

    // Spawn initial vegetables
    for (let i = 0; i < 4; i++) {
      setTimeout(() => spawnVeg(), i * 300);
    }

    const loop = (timestamp: number) => {
      const dt = Math.min(timestamp - (g.lastTime || timestamp), 50);
      g.lastTime = timestamp;

      if (!pausedRef.current) {
        // Spawn logic
        g.spawnTimer += dt;
        if (g.spawnTimer >= g.spawnInterval) {
          g.spawnTimer = 0;
          spawnVeg();
        }

        // Check chop on mouse move
        if (g.isDown) {
          for (const veg of g.vegetables) {
            if (!veg.chopped && segmentIntersectsCircle(
              g.prevX, g.prevY, g.mouseX, g.mouseY,
              veg.x, veg.y, veg.size * 0.55
            )) {
              chopVeg(veg, g.mouseX, g.mouseY);
            }
          }
        }
        g.prevX = g.mouseX;
        g.prevY = g.mouseY;

        // Update particles
        for (const p of g.particles) {
          p.x += p.vx; p.y += p.vy;
          p.vy += 0.25; // gravity
          p.life -= dt / (p.maxLife * 1000);
        }
        // Update half-vegetable physics
        const now2 = performance.now();
        for (const veg of g.vegetables) {
          if (!veg.chopped) continue;
          const age = (now2 - veg.choppedAt) / 1000;
          for (const h of veg.halves) {
            h.x += h.vx;
            h.y += h.vy;
            h.vy += 0.3;
            h.angle += 0.08;
          }
          // clean up old halves
          if (age > 1.5) veg.halves = [];
        }
        // Prune particles and old vegetables
        g.particles = g.particles.filter(p => p.life > 0);
        const now3 = performance.now();
        g.vegetables = g.vegetables.filter(
          v => !v.chopped || (now3 - v.choppedAt) < 2000
        );
        g.scorePops = g.scorePops.filter(s => s.life > 0);
        for (const s of g.scorePops) s.life -= dt / (s.maxLife * 1000);

        // Combo timer decay
        if (now3 - g.comboTimer > 2000 && g.combo > 1) {
          g.combo = 1;
          onCombo(1);
        }
      }

      // ─── Draw ───────────────────────────────────────────────────────────
      const W = g.width; const H = g.height;

      // Background: kitchen counter
      ctx.fillStyle = '#F4E6CC';
      ctx.fillRect(0, 0, W, H);

      // Wooden board
      const bx = W * 0.06; const by = H * 0.1;
      const bw = W * 0.88; const bh = H * 0.82;
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(bx, by, bw, bh, 24);
      ctx.fillStyle = '#D4A866';
      ctx.fill();
      ctx.strokeStyle = '#B8894A';
      ctx.lineWidth = 4;
      ctx.stroke();
      ctx.restore();

      // Wood grain lines
      ctx.save();
      ctx.globalAlpha = 0.15;
      ctx.strokeStyle = '#8B5E2A';
      ctx.lineWidth = 1.5;
      for (let i = 0; i < 8; i++) {
        const y = by + (bh / 8) * i + 12;
        ctx.beginPath();
        ctx.moveTo(bx + 20, y);
        ctx.lineTo(bx + bw - 20, y + randomBetween(-3, 3));
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      ctx.restore();

      // Particles
      for (const p of g.particles) {
        ctx.save();
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Vegetables
      ctx.save();
      for (const veg of g.vegetables) {
        if (veg.chopped) {
          // Draw flying halves
          for (let i = 0; i < veg.halves.length; i++) {
            const h = veg.halves[i];
            ctx.save();
            ctx.translate(h.x, h.y);
            ctx.rotate(h.angle);
            ctx.font = `${veg.size * 0.7}px serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.globalAlpha = Math.max(0, 1 - (performance.now() - veg.choppedAt) / 1200);
            ctx.fillText(veg.emoji, 0, 0);
            ctx.restore();
          }
        } else {
          // Floating bob animation
          const bob = Math.sin(performance.now() / 500 + veg.id) * 3;
          ctx.save();
          ctx.translate(veg.x, veg.y + bob);
          ctx.font = `${veg.size}px serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          // Shadow
          ctx.shadowColor = 'rgba(0,0,0,0.2)';
          ctx.shadowBlur = 8;
          ctx.shadowOffsetY = 4;
          ctx.fillText(veg.emoji, 0, 0);
          ctx.restore();
        }
      }
      ctx.restore();

      // Score pops
      ctx.save();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (const s of g.scorePops) {
        const progress = 1 - s.life / s.maxLife;
        const yOff = -progress * 60;
        ctx.globalAlpha = Math.min(1, s.life * 3);
        ctx.font = `bold ${Math.round(22 + progress * 8)}px Nunito, sans-serif`;
        ctx.fillStyle = '#FFD700';
        ctx.shadowColor = 'rgba(0,0,0,0.4)';
        ctx.shadowBlur = 4;
        ctx.fillText(s.text, s.x, s.y + yOff);
      }
      ctx.restore();

      // Cursor slash trail hint
      if (g.isDown) {
        ctx.save();
        ctx.strokeStyle = 'rgba(255,255,255,0.75)';
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.shadowColor = '#fff';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.moveTo(g.prevX, g.prevY);
        ctx.lineTo(g.mouseX, g.mouseY);
        ctx.stroke();
        ctx.restore();
      }

      // Gesture hint — animated drag guide until first chop
      if (!g.hasChopped) {
        const hintAlpha = 0.55 + Math.sin(timestamp / 400) * 0.25;
        const hintProgress = ((timestamp / 1200) % 1);
        const targetVeg = g.vegetables.find(v => !v.chopped);
        if (targetVeg) {
          const startX = targetVeg.x - targetVeg.size * 0.6;
          const endX = targetVeg.x + targetVeg.size * 0.6;
          const hx = startX + (endX - startX) * hintProgress;
          const hy = targetVeg.y;
          ctx.save();
          ctx.globalAlpha = hintAlpha * 0.5;
          ctx.strokeStyle = 'rgba(255,255,255,0.9)';
          ctx.lineWidth = 6;
          ctx.lineCap = 'round';
          ctx.setLineDash([8, 8]);
          ctx.lineDashOffset = -timestamp / 40;
          ctx.beginPath();
          ctx.moveTo(startX, hy);
          ctx.lineTo(endX, hy);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.restore();
          ctx.save();
          ctx.globalAlpha = hintAlpha;
          ctx.fillStyle = 'rgba(255,255,255,0.95)';
          ctx.shadowColor = '#FF6B35';
          ctx.shadowBlur = 12;
          ctx.beginPath();
          ctx.arc(hx, hy, 10, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
          ctx.save();
          ctx.globalAlpha = hintAlpha * 0.8;
          ctx.fillStyle = '#fff';
          ctx.font = 'bold 14px Nunito, sans-serif';
          ctx.textAlign = 'center';
          ctx.shadowColor = 'rgba(0,0,0,0.5)';
          ctx.shadowBlur = 6;
          ctx.fillText('Hold & drag to chop!', targetVeg.x, targetVeg.y + targetVeg.size * 0.75);
          ctx.restore();
        }
      }

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);

    // Mouse/touch events on canvas
    const getPos = (e: MouseEvent | TouchEvent) => {
      const rect = canvas.getBoundingClientRect();
      if ('touches' in e) {
        const t = e.touches[0] ?? e.changedTouches[0];
        return { x: t.clientX - rect.left, y: t.clientY - rect.top };
      }
      return { x: (e as MouseEvent).clientX - rect.left, y: (e as MouseEvent).clientY - rect.top };
    };

    const onMove = (e: MouseEvent | TouchEvent) => {
      e.preventDefault();
      const { x, y } = getPos(e);
      g.prevX = g.mouseX; g.prevY = g.mouseY;
      g.mouseX = x; g.mouseY = y;
    };
    const onDown = (e: MouseEvent | TouchEvent) => {
      e.preventDefault();
      const { x, y } = getPos(e);
      g.isDown = true;
      g.mouseX = x; g.mouseY = y;
      g.prevX = x; g.prevY = y;
    };
    const onUp = (e: MouseEvent | TouchEvent) => {
      e.preventDefault();
      g.isDown = false;
    };

    canvas.addEventListener('mousemove', onMove);
    canvas.addEventListener('mousedown', onDown);
    canvas.addEventListener('mouseup', onUp);
    canvas.addEventListener('mouseleave', onUp);
    canvas.addEventListener('touchmove', onMove, { passive: false });
    canvas.addEventListener('touchstart', onDown, { passive: false });
    canvas.addEventListener('touchend', onUp, { passive: false });

    return () => {
      cancelAnimationFrame(rafRef.current);
      ro.disconnect();
      canvas.removeEventListener('mousemove', onMove);
      canvas.removeEventListener('mousedown', onDown);
      canvas.removeEventListener('mouseup', onUp);
      canvas.removeEventListener('mouseleave', onUp);
      canvas.removeEventListener('touchmove', onMove);
      canvas.removeEventListener('touchstart', onDown);
      canvas.removeEventListener('touchend', onUp);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [difficulty]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: '100%', height: '100%', display: 'block', cursor: 'crosshair', touchAction: 'none' }}
    />
  );
};
