window.GRB = window.GRB || {};

const STAR_R = 18;
const FINISH_W = 40;

GRB.LevelManager = class {
  constructor(physicsManager) {
    this.physics    = physicsManager;
    this.levelData  = null;
    this.isEndless  = false;
    this.endless    = null;
    this._endlessLoadedChunks = 0; // how many chunks are in physics

    // Static bodies
    this._platBodies = [];
    this._movingPlatBodies = [];  // [{body, x0, y0, rangeX, rangeY, speed, dir, t}]
    this._seesawBodies   = [];    // [{body, pivot, t0}]
    this._crateBodies    = [];
    this._boulderBodies  = [];

    // Collectibles
    this.stars   = [];  // [{x, y, collected, anim}]
    this.finish  = { x:0, y:0, reached:false };

    this.startX  = 0;
    this.startY  = 0;
    this.worldWidth  = 960;
    this.worldHeight = 540;
    this.bgIndex = 0;
    this.particles = null;
  }

  loadCampaign(levelId) {
    this._clear();
    this.isEndless = false;
    const data = GRB.CAMPAIGN_LEVELS.find(l => l.id === levelId);
    if (!data) return false;
    this.levelData = data;
    this.worldWidth  = data.worldWidth || 960;
    this.worldHeight = 540;
    this.bgIndex     = data.bg || 0;
    this.startX      = data.start[0];
    this.startY      = data.start[1];
    this.finish      = { x: data.finish[0], y: data.finish[1], reached: false };

    this._buildLevel(data);
    return true;
  }

  loadEndless(endlessGen) {
    this._clear();
    this.isEndless  = true;
    this.endless    = endlessGen;
    this.endlessGen = endlessGen;
    this.endlessGen.reset();
    this.endlessGen.ensureGenerated(1920);
    this.worldWidth  = this.endlessGen.getWorldWidth();
    this.worldHeight = 540;
    this.bgIndex     = 2;
    this.startX      = 100;
    this.startY      = 420;
    this.finish      = { x:99999, y:0, reached:false };
    this._buildEndless();
  }

  _buildLevel(data) {
    const PM = GRB.PhysicsManager;

    // Ground platforms
    for (const [cx, cy, w, h] of (data.platforms || [])) {
      const b = PM.makeBox(cx, cy, w, h, {
        isStatic:true, friction:0.8, frictionStatic:1, restitution:0.05,
        label:'ground', collisionFilter:{ category:0x0002, mask:0xFFFF }
      });
      this._platBodies.push(b);
      this.physics.addBody(b);
    }

    // Moving platforms
    for (const [cx, cy, w, h, rx, ry, spd] of (data.movingPlatforms || [])) {
      const b = PM.makeBox(cx, cy, w, h, {
        isStatic:true, friction:0.9, restitution:0.05, label:'moving_platform',
        collisionFilter:{ category:0x0002, mask:0xFFFF }
      });
      this.physics.addBody(b);
      this._movingPlatBodies.push({ body:b, x0:cx, y0:cy, rangeX:rx, rangeY:ry, speed:spd||1, t:Math.random()*Math.PI*2 });
    }

    // Seesaws
    for (const [cx, cy, w] of (data.seesaws || [])) {
      const plank = PM.makeBox(cx, cy, w, 12, {
        friction:0.7, restitution:0.1, label:'seesaw', density:0.003,
        collisionFilter:{ category:0x0002, mask:0xFFFF }
      });
      const pivot = PM.makeBox(cx, cy, 6, 30, {
        isStatic:true, label:'seesaw_pivot'
      });
      const c = PM.makeConstraint({
        bodyA:pivot, pointA:{x:0,y:-15},
        bodyB:plank, pointB:{x:0,y:0},
        stiffness:1, length:0
      });
      this.physics.addBodies([plank, pivot]);
      this.physics.addConstraint(c);
      this._seesawBodies.push({ plank, pivot, c, w });
    }

    // Crates
    for (const [cx, cy, w, h] of (data.crates || [])) {
      const b = PM.makeBox(cx, cy, w, h, {
        friction:0.5, restitution:0.3, density:0.004, label:'crate',
        collisionFilter:{ category:0x0002, mask:0xFFFF }
      });
      b.plugin.grb = { w, h };
      this._crateBodies.push(b);
      this.physics.addBody(b);
    }

    // Boulders
    for (const [cx, cy, r] of (data.boulders || [])) {
      const b = PM.makeCircle(cx, cy, r, {
        friction:0.4, restitution:0.4, density:0.006, label:'boulder',
        collisionFilter:{ category:0x0002, mask:0xFFFF }
      });
      this._boulderBodies.push(b);
      this.physics.addBody(b);
    }

    // Stars
    this.stars = (data.stars || []).map(([x, y]) => ({
      x, y, collected:false, anim:0
    }));

    // Invisible floor
    const floor = PM.makeBox(this.worldWidth/2, this.worldHeight+30, this.worldWidth*2, 60, {
      isStatic:true, label:'void', isSensor:true
    });
    this.physics.addBody(floor);
    this._platBodies.push(floor);
  }

  _buildEndless() {
    this._endlessLoadedChunks = 0;
    this._syncEndlessChunks();
  }

  // Call after endlessGen.ensureGenerated() to add new physics bodies
  _syncEndlessChunks() {
    const chunks = this.endlessGen.chunks;
    const newChunks = chunks.slice(this._endlessLoadedChunks);
    if (newChunks.length === 0) return;
    const PM = GRB.PhysicsManager;
    for (const chunk of newChunks) {
      for (const [cx, cy, w, h] of chunk.platforms) {
        const b = PM.makeBox(cx, cy, w, h, {
          isStatic:true, friction:0.8, frictionStatic:1, restitution:0.05,
          label:'ground', collisionFilter:{ category:0x0002, mask:0xFFFF }
        });
        this._platBodies.push(b);
        this.physics.addBody(b);
      }
      for (const [cx, cy, w, h] of chunk.crates) {
        const b = PM.makeBox(cx, cy, w, h, {
          friction:0.5, restitution:0.3, density:0.004, label:'crate',
          collisionFilter:{ category:0x0002, mask:0xFFFF }
        });
        b.plugin.grb = { w, h };
        this._crateBodies.push(b);
        this.physics.addBody(b);
      }
      for (const [cx, cy, r] of chunk.boulders) {
        const b = PM.makeCircle(cx, cy, r, {
          friction:0.4, restitution:0.4, density:0.006, label:'boulder',
          collisionFilter:{ category:0x0002, mask:0xFFFF }
        });
        this._boulderBodies.push(b);
        this.physics.addBody(b);
      }
      // Add new stars
      for (const [x, y] of chunk.stars) {
        this.stars.push({ x, y, collected: false, anim: Math.random() * Math.PI * 2 });
      }
    }
    this._endlessLoadedChunks = chunks.length;
    this.worldWidth = this.endlessGen.getWorldWidth();
  }

  update(dt) {
    // Sync new endless chunks into physics
    if (this.isEndless) this._syncEndlessChunks();
    // Animate moving platforms
    for (const mp of this._movingPlatBodies) {
      mp.t += mp.speed * dt / 1000;
      const nx = mp.x0 + Math.sin(mp.t) * mp.rangeX / 2;
      const ny = mp.y0 + Math.cos(mp.t) * mp.rangeY / 2;
      Matter.Body.setPosition(mp.body, { x:nx, y:ny });
      Matter.Body.setVelocity(mp.body, { x:0, y:0 }); // keep static
    }

    // Animate star float
    for (const s of this.stars) {
      if (!s.collected) s.anim = (s.anim + dt * 0.002) % (Math.PI * 2);
    }
  }

  checkStarCollect(vx, vy, radius = 30) {
    let collected = 0;
    for (const s of this.stars) {
      if (s.collected) continue;
      const d = GRB.MathUtils.dist2(vx, vy, s.x, s.y);
      if (d < radius + STAR_R) {
        s.collected = true;
        collected++;
        if (this.particles) this.particles.emitStar(s.x, s.y);
      }
    }
    return collected;
  }

  checkFinish(vx, vy, radius = 28) {
    if (this.finish.reached) return false;
    const d = GRB.MathUtils.dist2(vx, vy, this.finish.x, this.finish.y);
    if (d < radius + FINISH_W / 2) {
      this.finish.reached = true;
      if (this.particles) this.particles.emitFinish(this.finish.x, this.finish.y);
      return true;
    }
    return false;
  }

  getCollectedStarCount() {
    return this.stars.filter(s => s.collected).length;
  }
  getTotalStarCount() { return this.stars.length; }

  draw(ctx, camX, camY) {
    ctx.save();
    ctx.translate(-camX, -camY);

    // Background (inline - sky, hills)
    this._drawBg(ctx, camX, camY);

    // Platforms
    this._drawPlatforms(ctx);

    // Moving platforms
    for (const mp of this._movingPlatBodies) {
      this._drawPlatBody(ctx, mp.body, '#5a8a5a');
    }

    // Seesaws
    for (const sw of this._seesawBodies) {
      this._drawSeesawBody(ctx, sw.plank, sw.w);
    }

    // Crates
    for (const b of this._crateBodies) {
      this._drawCrate(ctx, b);
    }

    // Boulders
    for (const b of this._boulderBodies) {
      this._drawBoulder(ctx, b);
    }

    // Stars
    for (const s of this.stars) {
      if (!s.collected) this._drawStar(ctx, s);
    }

    // Finish flag
    if (!this.isEndless) this._drawFinish(ctx);

    ctx.restore();
  }

  _drawBg(ctx, camX, camY) {
    const W = this.worldWidth, H = this.worldHeight;
    const BG = [
      { sky:['#87ceeb','#b0e0ff'], ground:'#4a7c59' },  // day
      { sky:['#ff7b54','#ffb347'], ground:'#5a4a3a' },  // sunset
      { sky:['#0d0d2b','#1a1a4e'], ground:'#2a2a3e' },  // night
      { sky:['#1a0f2e','#3d2052'], ground:'#3d2a1e' },  // cave
    ][this.bgIndex] || { sky:['#87ceeb','#b0e0ff'], ground:'#4a7c59' };

    // Sky gradient (fixed to camera)
    ctx.save();
    ctx.translate(camX, camY);
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, BG.sky[0]);
    grad.addColorStop(1, BG.sky[1]);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 960, H);
    ctx.restore();

    // Ground fill below platforms
    ctx.fillStyle = BG.ground;
    ctx.fillRect(0, 480, W, 120);

    // Night stars
    if (this.bgIndex >= 2) {
      ctx.fillStyle = '#fff';
      const seed = 42;
      for (let i = 0; i < 80; i++) {
        const sx = ((i * 137.5 + seed) % W);
        const sy = ((i * 97.3) % 380);
        const sr = 0.5 + (i % 3) * 0.5;
        ctx.beginPath();
        ctx.arc(sx, sy, sr, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  _drawPlatforms(ctx) {
    for (const b of this._platBodies) {
      if (b.label === 'void') continue;
      this._drawPlatBody(ctx, b, '#4a7c59');
    }
  }

  _getBodySize(b) {
    // For axis-aligned static rectangles, bounds give exact half-extents.
    // Works correctly since platforms never rotate.
    return {
      w: (b.bounds.max.x - b.bounds.min.x),
      h: (b.bounds.max.y - b.bounds.min.y)
    };
  }

  _drawPlatBody(ctx, b, color) {
    const { w, h } = this._getBodySize(b);
    ctx.save();
    ctx.translate(b.position.x, b.position.y);
    ctx.rotate(b.angle);
    const grass = Math.min(8, h);

    ctx.fillStyle = '#5da060';
    ctx.beginPath(); ctx.roundRect(-w/2, -h/2, w, grass, [3,3,0,0]); ctx.fill();
    ctx.fillStyle = '#7a5c3a';
    ctx.fillRect(-w/2, -h/2 + grass, w, h - grass);
    ctx.strokeStyle = '#3d4a1e'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.roundRect(-w/2, -h/2, w, h, 2); ctx.stroke();
    ctx.restore();
  }

  _drawSeesawBody(ctx, b, w) {
    ctx.save();
    ctx.translate(b.position.x, b.position.y);
    ctx.rotate(b.angle);
    ctx.fillStyle = '#c47d2b';
    ctx.fillRect(-w/2, -6, w, 12);
    ctx.strokeStyle = '#7a4a10'; ctx.lineWidth = 2;
    ctx.strokeRect(-w/2, -6, w, 12);
    // Center pivot marker
    ctx.fillStyle = '#7a4a10';
    ctx.beginPath(); ctx.arc(0, 0, 5, 0, Math.PI*2); ctx.fill();
    ctx.restore();
  }

  _drawCrate(ctx, b) {
    const w = b.plugin?.grb?.w || 32;
    const h = b.plugin?.grb?.h || 32;
    ctx.save();
    ctx.translate(b.position.x, b.position.y);
    ctx.rotate(b.angle);
    ctx.fillStyle = '#c8973a';
    ctx.fillRect(-w/2, -h/2, w, h);
    ctx.strokeStyle = '#7a5510'; ctx.lineWidth = 2;
    ctx.strokeRect(-w/2, -h/2, w, h);
    // X cross
    ctx.beginPath();
    ctx.moveTo(-w/2+3, -h/2+3); ctx.lineTo(w/2-3, h/2-3);
    ctx.moveTo(w/2-3, -h/2+3); ctx.lineTo(-w/2+3, h/2-3);
    ctx.stroke();
    ctx.restore();
  }

  _drawBoulder(ctx, b) {
    const r = b.circleRadius;
    ctx.save();
    ctx.translate(b.position.x, b.position.y);
    ctx.rotate(b.angle);
    const g = ctx.createRadialGradient(-r*0.3, -r*0.3, r*0.1, 0, 0, r);
    g.addColorStop(0, '#888');
    g.addColorStop(1, '#444');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#333'; ctx.lineWidth = 2;
    ctx.stroke();
    // Crack lines
    ctx.strokeStyle = '#333'; ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-r*0.3, -r*0.5); ctx.lineTo(0, r*0.2);
    ctx.lineTo(r*0.4, -r*0.2);
    ctx.stroke();
    ctx.restore();
  }

  _drawStar(ctx, s) {
    const float = Math.sin(s.anim) * 4;
    const x = s.x, y = s.y + float;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(s.anim * 0.5);

    // Glow
    const glow = ctx.createRadialGradient(0, 0, 2, 0, 0, STAR_R + 6);
    glow.addColorStop(0, 'rgba(255,230,50,0.5)');
    glow.addColorStop(1, 'rgba(255,230,50,0)');
    ctx.fillStyle = glow;
    ctx.beginPath(); ctx.arc(0, 0, STAR_R + 6, 0, Math.PI * 2); ctx.fill();

    // Star shape
    ctx.fillStyle = '#fde047';
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 1.5;
    const n = 5, r1 = STAR_R, r2 = STAR_R * 0.42;
    ctx.beginPath();
    for (let i = 0; i < n * 2; i++) {
      const a = (i * Math.PI) / n - Math.PI / 2;
      const r = i % 2 === 0 ? r1 : r2;
      i === 0 ? ctx.moveTo(Math.cos(a)*r, Math.sin(a)*r)
              : ctx.lineTo(Math.cos(a)*r, Math.sin(a)*r);
    }
    ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.restore();
  }

  _drawFinish(ctx) {
    const { x, y } = this.finish;
    // Pole
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(x, y+10); ctx.lineTo(x, y-80); ctx.stroke();

    // Checkered flag
    const colors = ['#fff','#000'];
    const fw = 8, fh = 6, cols = 5, rows = 4;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        ctx.fillStyle = colors[(r + c) % 2];
        ctx.fillRect(x + c * fw, y - 80 + r * fh, fw, fh);
      }
    }
    ctx.strokeStyle = '#444'; ctx.lineWidth = 1;
    ctx.strokeRect(x, y - 80, cols * fw, rows * fh);

    // Glow ring if reached
    if (this.finish.reached) {
      ctx.strokeStyle = 'rgba(50,255,50,0.6)';
      ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(x, y, 24, 0, Math.PI * 2); ctx.stroke();
    }
  }

  _clear() {
    this.physics.reset();
    this._platBodies.length = 0;
    this._movingPlatBodies.length = 0;
    this._seesawBodies.length = 0;
    this._crateBodies.length = 0;
    this._boulderBodies.length = 0;
    this.stars.length = 0;
    this.finish = { x:0, y:0, reached:false };
    this._endlessLoadedChunks = 0;
  }
};
