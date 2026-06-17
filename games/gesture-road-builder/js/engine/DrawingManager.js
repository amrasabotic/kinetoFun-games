window.GRB = window.GRB || {};

const ROAD_THICKNESS = 10;
const MIN_SEGMENT_LEN = 6;

GRB.DrawingManager = class {
  constructor(physicsManager, inkLimit = 1200) {
    this.physics = physicsManager;
    this.inkLimit = inkLimit;
    this.inkUsed  = 0;

    this.roads   = [];  // [{points, bodies, inkLen, color}]
    this.current = null; // active road being drawn

    this.enabled = true;
    this.particles = null; // set by GameEngine
  }

  setInkLimit(limit) { this.inkLimit = limit; }

  startDraw(wx, wy) {
    if (!this.enabled) return;
    if (this.inkUsed >= this.inkLimit) return;
    this.current = { rawPoints: [{ x: wx, y: wy }], points: [], bodies: [], inkLen: 0 };
  }

  continueDraw(wx, wy) {
    if (!this.enabled || !this.current) return;
    const pts = this.current.rawPoints;
    const last = pts[pts.length - 1];
    if (!last) return;
    const d = GRB.MathUtils.dist({ x: wx, y: wy }, last);
    if (d < MIN_SEGMENT_LEN) return;

    // Check ink budget
    if (this.inkUsed + d > this.inkLimit) return;

    pts.push({ x: wx, y: wy });
    this.inkUsed += d;
    this.current.inkLen += d;

    if (this.particles) this.particles.emitDraw(wx, wy);
  }

  endDraw() {
    if (!this.current) return;
    const raw = this.current.rawPoints;
    if (raw.length < 2) { this.current = null; return; }

    const smoothed = GRB.MathUtils.smoothPath(
      GRB.MathUtils.downsample(raw, 6), 6
    );
    this.current.points = smoothed;
    this.current.bodies = this._buildPhysicsBodies(smoothed);
    this.physics.addBodies(this.current.bodies);

    this.roads.push(this.current);
    this.current = null;
  }

  _buildPhysicsBodies(points) {
    const bodies = [];
    for (let i = 0; i < points.length - 1; i++) {
      const a = points[i], b = points[i + 1];
      const dx = b.x - a.x, dy = b.y - a.y;
      const len = Math.sqrt(dx * dx + dy * dy);
      if (len < 1) continue;
      const angle = Math.atan2(dy, dx);
      const cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2;
      const body = Matter.Bodies.rectangle(cx, cy, len + 1, ROAD_THICKNESS, {
        isStatic: true,
        angle,
        friction: 0.7,
        frictionStatic: 0.9,
        restitution: 0.05,
        label: 'road',
        collisionFilter: { category: 0x0002, mask: 0xFFFF }
      });
      bodies.push(body);
    }
    return bodies;
  }

  undoLast() {
    if (this.roads.length === 0) return false;
    const road = this.roads.pop();
    this.physics.removeBodies(road.bodies);
    this.inkUsed = Math.max(0, this.inkUsed - road.inkLen);
    return true;
  }

  clearAll() {
    for (const road of this.roads) {
      this.physics.removeBodies(road.bodies);
    }
    this.roads.length = 0;
    this.inkUsed = 0;
    this.current = null;
  }

  draw(ctx, camX, camY) {
    ctx.save();
    ctx.translate(-camX, -camY);

    // Committed roads
    for (const road of this.roads) {
      this._drawRoad(ctx, road.points);
    }

    // Currently drawing road (live preview)
    if (this.current && this.current.rawPoints.length > 1) {
      this._drawRoad(ctx, this.current.rawPoints, true);
    }

    ctx.restore();
  }

  _drawRoad(ctx, pts, isPreview = false) {
    if (pts.length < 2) return;

    ctx.lineCap  = 'round';
    ctx.lineJoin = 'round';

    // Road body (dark asphalt)
    ctx.strokeStyle = isPreview ? 'rgba(80,100,120,0.6)' : '#2d3142';
    ctx.lineWidth = ROAD_THICKNESS + 4;
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.stroke();

    // Road surface
    ctx.strokeStyle = isPreview ? 'rgba(100,120,140,0.55)' : '#4a5568';
    ctx.lineWidth = ROAD_THICKNESS;
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.stroke();

    if (!isPreview) {
      // Center dashes
      ctx.strokeStyle = '#f6e05e';
      ctx.lineWidth = 2;
      ctx.setLineDash([14, 10]);
      ctx.lineDashOffset = 0;
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  getInkUsed()  { return this.inkUsed; }
  getInkLimit() { return this.inkLimit; }
  getRoadCount() { return this.roads.length; }
  isEnabled()   { return this.enabled; }
  enable()  { this.enabled = true; }
  disable() { this.enabled = false; if (this.current) this.endDraw(); }
};
