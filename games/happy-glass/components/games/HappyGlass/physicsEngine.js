'use client';

const PARTICLE_RADIUS  = 5;
const GLASS_THICKNESS  = 9;
export const MAX_PARTICLES = 240;

/**
 * Self-contained physics world. Call load() once (async, imports matter-js),
 * then all other methods are synchronous.
 */
export class PhysicsWorld {
  constructor() {
    this.M        = null;
    this.engine   = null;
    this.world    = null;
    this.particles = [];
    this.glass    = null;
    this.canvasW  = 0;
    this.canvasH  = 0;
  }

  /** Import matter-js once. Must be awaited before anything else. */
  async load() {
    const mod = await import('matter-js');
    // matter-js ships as CJS; Next.js bundles it with a .default wrapper
    this.M = mod.default ?? mod;
  }

  /** (Re)create the engine + static world boundaries. Safe to call multiple times. */
  initLevel(canvasW, canvasH) {
    if (!this.M) return;
    const { Engine, World, Bodies } = this.M;

    if (this.engine) {
      World.clear(this.world, false);
      Engine.clear(this.engine);
    }

    this.canvasW   = canvasW;
    this.canvasH   = canvasH;
    this.particles = [];
    this.glass     = null;

    this.engine = Engine.create({ gravity: { x: 0, y: 2 } });
    this.world  = this.engine.world;

    const opts  = { isStatic: true, friction: 0.3, restitution: 0.05, label: 'wall' };
    const floor = Bodies.rectangle(canvasW / 2, canvasH + 25, canvasW + 200, 50, opts);
    const wallL = Bodies.rectangle(-25, canvasH / 2, 50, canvasH * 2, opts);
    const wallR = Bodies.rectangle(canvasW + 25, canvasH / 2, 50, canvasH * 2, opts);

    World.add(this.world, [floor, wallL, wallR]);
  }

  /**
   * Place a U-shaped glass container.
   * @param {number} gx  center X
   * @param {number} gy  bottom Y of the opening (top of the floor piece)
   * @param {number} gw  outer width
   * @param {number} gh  inner height
   */
  setGlass(gx, gy, gw, gh) {
    if (!this.M) return null;
    const { World, Bodies } = this.M;
    const t    = GLASS_THICKNESS;
    const opts = { isStatic: true, friction: 0.35, restitution: 0.1, label: 'glass' };

    const leftWall  = Bodies.rectangle(gx - gw / 2 + t / 2, gy - gh / 2, t, gh, opts);
    const rightWall = Bodies.rectangle(gx + gw / 2 - t / 2, gy - gh / 2, t, gh, opts);
    const bottom    = Bodies.rectangle(gx, gy - t / 2,       gw, t, opts);

    World.add(this.world, [leftWall, rightWall, bottom]);

    this.glass = {
      x: gx, y: gy, width: gw, height: gh,
      bodies: [leftWall, rightWall, bottom],
    };
    return this.glass;
  }

  spawnParticle(x, y) {
    if (!this.M || !this.world) return null;
    if (this.particles.length >= MAX_PARTICLES) return null;

    const { World, Bodies, Body } = this.M;
    const p = Bodies.circle(x, y, PARTICLE_RADIUS, {
      restitution: 0.25,
      friction:    0.08,
      density:     0.001,
      label:       'water',
      frictionAir: 0.01,
    });
    Body.setVelocity(p, { x: (Math.random() - 0.5) * 1.2, y: 0.5 });
    World.add(this.world, p);
    this.particles.push(p);
    return p;
  }

  /**
   * Convert a stroke (array of {x,y}) into static segment bodies.
   * Simplified with a minimum segment length to avoid too-thin slivers.
   */
  addStroke(points) {
    if (!this.M || !this.world || points.length < 2) return [];
    const { World, Bodies } = this.M;

    const bodies = [];
    for (let i = 0; i < points.length - 1; i++) {
      const p1 = points[i];
      const p2 = points[i + 1];
      const cx  = (p1.x + p2.x) / 2;
      const cy  = (p1.y + p2.y) / 2;
      const dx  = p2.x - p1.x;
      const dy  = p2.y - p1.y;
      const len = Math.sqrt(dx * dx + dy * dy);
      if (len < 4) continue;

      const seg = Bodies.rectangle(cx, cy, len + 2, 11, {
        isStatic:    true,
        angle:       Math.atan2(dy, dx),
        friction:    0.6,
        restitution: 0.05,
        label:       'stroke',
      });
      bodies.push(seg);
    }
    World.add(this.world, bodies);
    return bodies;
  }

  /**
   * Instantiate static obstacle bodies from level config data.
   * Each entry: { type:'platform'|'barrier', xFrac, yFrac, width?, height?, angle? }
   * Coordinates are fractions of canvasW / canvasH.
   */
  addObstacles(obstacles, canvasW, canvasH) {
    if (!this.M || !this.world || !obstacles?.length) return [];
    const { World, Bodies } = this.M;

    const bodies = [];
    for (const obs of obstacles) {
      const x     = obs.xFrac * canvasW;
      const y     = obs.yFrac * canvasH;
      const angle = obs.angle ?? 0;
      const opts  = { isStatic: true, friction: 0.4, restitution: 0.08, label: 'obstacle' };

      let body;
      if (obs.type === 'platform') {
        body = Bodies.rectangle(x, y, obs.width, obs.height ?? 10, { ...opts, angle });
      } else if (obs.type === 'barrier') {
        body = Bodies.rectangle(x, y, obs.width ?? 10, obs.height, { ...opts, angle });
      }
      if (body) bodies.push(body);
    }
    World.add(this.world, bodies);
    return bodies;
  }

  removeStroke(bodies) {
    if (!this.M || !this.world || !bodies?.length) return;
    this.M.World.remove(this.world, bodies);
  }

  step() {
    if (!this.M || !this.engine) return;
    this.M.Engine.update(this.engine, 1000 / 60);
  }

  countInGlass() {
    if (!this.glass) return 0;
    const { x, y, width, height } = this.glass;
    const t     = GLASS_THICKNESS;
    const left  = x - width / 2 + t;
    const right = x + width / 2 - t;
    const top   = y - height + t;
    const bot   = y - t;

    return this.particles.filter(p => {
      const px = p.position.x;
      const py = p.position.y;
      return px > left && px < right && py > top && py < bot;
    }).length;
  }

  pruneOffscreen() {
    if (!this.M || !this.world) return;
    const dead  = this.particles.filter(p => p.position.y > this.canvasH + 80);
    if (dead.length > 0) {
      this.M.World.remove(this.world, dead);
      this.particles = this.particles.filter(p => p.position.y <= this.canvasH + 80);
    }
  }

  destroy() {
    if (this.M && this.engine) {
      this.M.World.clear(this.world, false);
      this.M.Engine.clear(this.engine);
    }
    this.engine    = null;
    this.world     = null;
    this.particles = [];
    this.glass     = null;
  }
}
