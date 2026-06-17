window.GRB = window.GRB || {};

GRB.ParticleSystem = class {
  constructor() {
    this.particles = [];
  }

  emitDust(x, y, count = 6) {
    const R = GRB.MathUtils.randomRange;
    for (let i = 0; i < count; i++) {
      this.particles.push({
        type: 'dust',
        x, y,
        vx: R(-1.5, 1.5),
        vy: R(-2.5, -0.5),
        alpha: R(0.4, 0.8),
        size: R(4, 10),
        life: 1,
        decay: R(0.025, 0.045),
        color: `hsl(${R(25,45)},${R(30,60)}%,${R(50,70)}%)`
      });
    }
  }

  emitSpark(x, y, count = 8) {
    const R = GRB.MathUtils.randomRange;
    for (let i = 0; i < count; i++) {
      const angle = R(0, Math.PI * 2);
      const speed = R(1.5, 4);
      this.particles.push({
        type: 'spark',
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        alpha: 1,
        size: R(2, 5),
        life: 1,
        decay: R(0.04, 0.08),
        color: `hsl(${R(40,60)},100%,${R(60,80)}%)`
      });
    }
  }

  emitStar(x, y) {
    const R = GRB.MathUtils.randomRange;
    for (let i = 0; i < 12; i++) {
      const angle = R(0, Math.PI * 2);
      const speed = R(2, 6);
      this.particles.push({
        type: 'star',
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1,
        alpha: 1,
        size: R(4, 8),
        life: 1,
        decay: R(0.02, 0.04),
        color: `hsl(${R(40,60)},100%,${R(65,80)}%)`
      });
    }
    // Big flash
    this.particles.push({
      type: 'flash',
      x, y, vx: 0, vy: 0,
      alpha: 0.9, size: 30, life: 1, decay: 0.08,
      color: '#fff'
    });
  }

  emitFinish(x, y) {
    const R = GRB.MathUtils.randomRange;
    for (let i = 0; i < 30; i++) {
      const angle = R(0, Math.PI * 2);
      const speed = R(3, 9);
      const hue = R(0, 360);
      this.particles.push({
        type: 'confetti',
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 3,
        alpha: 1,
        size: R(5, 11),
        life: 1,
        decay: R(0.012, 0.025),
        color: `hsl(${hue},90%,65%)`,
        rot: R(0, Math.PI * 2),
        rotSpeed: R(-0.2, 0.2)
      });
    }
  }

  emitSmoke(x, y) {
    const R = GRB.MathUtils.randomRange;
    this.particles.push({
      type: 'smoke',
      x, y,
      vx: R(-0.5, 0.5),
      vy: R(-1, -0.3),
      alpha: R(0.2, 0.45),
      size: R(8, 18),
      life: 1,
      decay: R(0.012, 0.025),
      color: '#aaa'
    });
  }

  emitDraw(x, y) {
    const R = GRB.MathUtils.randomRange;
    this.particles.push({
      type: 'draw',
      x: x + R(-4, 4), y: y + R(-4, 4),
      vx: R(-0.4, 0.4), vy: R(-0.8, -0.2),
      alpha: 0.7, size: R(3, 6), life: 1, decay: 0.06,
      color: '#00e5ff'
    });
  }

  update() {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.08; // gravity
      p.life -= p.decay;
      p.alpha = p.life * (p.type === 'spark' ? 1.2 : 1);
      if (p.rot !== undefined) p.rot += p.rotSpeed;
      if (p.life <= 0) this.particles.splice(i, 1);
    }
  }

  draw(ctx, offsetX = 0, offsetY = 0) {
    ctx.save();
    ctx.translate(-offsetX, -offsetY);
    for (const p of this.particles) {
      ctx.globalAlpha = Math.max(0, Math.min(1, p.alpha));
      ctx.fillStyle = p.color;

      if (p.type === 'confetti' && p.rot !== undefined) {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        ctx.restore();
      } else if (p.type === 'flash') {
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
        g.addColorStop(0, 'rgba(255,255,255,0.9)');
        g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  clear() { this.particles.length = 0; }
};
