interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  r: number; col: string;
  life: number; max: number;
}

export class ParticleSystem {
  private parts: Particle[] = [];

  spawn(x: number, y: number, col: string, vx: number, vy: number, r: number, life: number): void {
    this.parts.push({ x, y, vx, vy, r, col, life, max: life });
  }

  burst(x: number, y: number, col: string, n = 16): void {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = 3 + Math.random() * 8;
      this.spawn(x, y, col, Math.cos(a) * s, Math.sin(a) * s - 2, 2 + Math.random() * 5, 35 + Math.random() * 30);
    }
  }

  slice(x: number, y: number): void {
    const cols = ['#ff6b35', '#ff3333', '#55cc44', '#ffcc00', '#cc8844', '#ff88aa'];
    for (let i = 0; i < 14; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = 5 + Math.random() * 11;
      this.spawn(x, y, cols[i % cols.length], Math.cos(a) * s, Math.sin(a) * s - 4, 2 + Math.random() * 6, 40 + Math.random() * 25);
    }
  }

  steam(x: number, y: number): void {
    for (let i = 0; i < 6; i++) {
      const rx = x + (Math.random() - 0.5) * 40;
      this.spawn(rx, y, `rgba(255,200,150,${0.2 + Math.random() * 0.3})`, (Math.random() - 0.5) * 2, -2 - Math.random(), 6 + Math.random() * 10, 50 + Math.random() * 30);
    }
  }

  confetti(x: number, y: number): void {
    const cols = ['#ff7c2e', '#ffd700', '#ff3344', '#44ff88', '#4dc8ff', '#cc44ff'];
    for (let i = 0; i < 24; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = 4 + Math.random() * 10;
      this.spawn(x, y, cols[i % cols.length], Math.cos(a) * s, Math.sin(a) * s - 5, 3 + Math.random() * 6, 60 + Math.random() * 40);
    }
  }

  tick(): void {
    this.parts = this.parts.filter(p => {
      p.x += p.vx; p.y += p.vy;
      p.vy += 0.18; p.vx *= 0.94;
      p.life--;
      return p.life > 0;
    });
  }

  draw(ctx: CanvasRenderingContext2D): void {
    this.parts.forEach(p => {
      ctx.globalAlpha = p.life / p.max;
      ctx.fillStyle = p.col;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
  }

  clear(): void { this.parts = []; }
}

export const particleSystem = new ParticleSystem();
