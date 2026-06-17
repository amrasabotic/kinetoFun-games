window.GRB = window.GRB || {};

const V_W = 56, V_H = 24;       // chassis size
const WHEEL_R = 14;              // wheel radius
const DRIVE_SPEED = 0.28;        // angular velocity added each frame
const MAX_WHEEL_AV = 6;
const TORQUE_FORCE = 0.006;

GRB.VehicleManager = class {
  constructor(physicsManager) {
    this.physics  = physicsManager;
    this.chassis  = null;
    this.wFront   = null;
    this.wRear    = null;
    this.constraints = [];
    this.driving  = false;
    this.startX   = 0;
    this.startY   = 0;
    this.particles = null;
    this._driveListener = null;
    this._smokeTimer = 0;
  }

  create(x, y) {
    this.startX = x;
    this.startY = y;

    const PM = GRB.PhysicsManager;

    // Chassis (category 0x0004; ignores itself and wheels 0x0008)
    const VEHICLE_MASK = 0xFFFF & ~0x0004 & ~0x0008;
    this.chassis = PM.makeBox(x, y, V_W, V_H, {
      label: 'chassis',
      friction: 0.1,
      frictionAir: 0.008,
      restitution: 0.1,
      density: 0.004,
      collisionFilter: { category: 0x0004, mask: VEHICLE_MASK }
    });

    // Wheels placed so they rest on ground when chassis is at start Y
    // Platform tops are typically at startY + 30 (startY is ~430, ground top ~460)
    // Wheel center at ground - WHEEL_R = ~446; offset from chassis = 446 - y ≈ 16
    const wheelOffY = 18; // vertical offset of wheel center below chassis center
    const wxFront = x + 20, wxRear = x - 20, wy = y + wheelOffY;
    const wheelOpts = {
      friction: 0.95,
      frictionStatic: 1.0,
      frictionAir: 0.004,
      restitution: 0.04,
      density: 0.005,
      label: 'wheel',
      collisionFilter: { category: 0x0008, mask: VEHICLE_MASK }
    };
    this.wFront = PM.makeCircle(wxFront, wy, WHEEL_R, wheelOpts);
    this.wRear  = PM.makeCircle(wxRear,  wy, WHEEL_R, { ...wheelOpts });

    this.physics.addBodies([this.chassis, this.wFront, this.wRear]);

    // Suspension: 2 constraints per wheel (triangle → lateral stability)
    const cs = Matter.Constraint;
    // Primary (main arm): from chassis lower-side to wheel center, length ~wheelOffY
    const spring = (bA, pA, bB, len, s = 0.18, d = 0.5) => cs.create({
      bodyA: bA, pointA: pA, bodyB: bB, stiffness: s, damping: d, length: len
    });

    const cFront1 = spring(this.chassis, { x:  20, y: 12 }, this.wFront, 8);
    const cFront2 = spring(this.chassis, { x:  12, y:  2 }, this.wFront, 18, 0.10, 0.35);
    const cRear1  = spring(this.chassis, { x: -20, y: 12 }, this.wRear,  8);
    const cRear2  = spring(this.chassis, { x: -12, y:  2 }, this.wRear,  18, 0.10, 0.35);

    this.constraints = [cFront1, cFront2, cRear1, cRear2];
    for (const c of this.constraints) this.physics.addConstraint(c);

    // Drive listener
    this._driveListener = () => {
      if (!this.driving) return;
      const bv = this.chassis.velocity;
      // Apply torque to rear wheel; front gets less
      const currentAV = this.wRear.angularVelocity;
      if (currentAV < MAX_WHEEL_AV) {
        GRB.PhysicsManager.setAngularVelocity(this.wRear,
          Math.min(MAX_WHEEL_AV, currentAV + DRIVE_SPEED));
      }
      GRB.PhysicsManager.setAngularVelocity(this.wFront,
        Math.min(MAX_WHEEL_AV, this.wFront.angularVelocity + DRIVE_SPEED * 0.6));
      // Extra nudge if barely moving (stuck help)
      if (this.chassis.speed < 0.3) {
        GRB.PhysicsManager.applyForce(this.chassis,
          this.chassis.position, { x: TORQUE_FORCE, y: 0 });
      }
    };
    this.physics.onBeforeUpdate(this._driveListener);
  }

  startDriving() { this.driving = true; }
  stopDriving()  { this.driving = false; }

  getPosition() {
    if (!this.chassis) return { x: this.startX, y: this.startY };
    return { x: this.chassis.position.x, y: this.chassis.position.y };
  }

  getAngle() { return this.chassis ? this.chassis.angle : 0; }

  isFlipped() {
    if (!this.chassis) return false;
    const a = Math.abs(GRB.MathUtils.normalizeAngle(this.chassis.angle));
    return a > Math.PI * 0.55;
  }

  isStuck() {
    if (!this.chassis || !this.driving) return false;
    return this.chassis.speed < 0.05;
  }

  isFallen(levelHeight) {
    return this.chassis && this.chassis.position.y > levelHeight + 60;
  }

  update(particles) {
    if (!this.chassis || !this.driving) return;

    this._smokeTimer++;
    if (particles && this._smokeTimer % 8 === 0) {
      const ex = this.chassis.position.x - 28;
      const ey = this.chassis.position.y - 12;
      particles.emitSmoke(ex, ey);
    }
    if (particles && this.chassis.speed > 1.5 && this._smokeTimer % 3 === 0) {
      particles.emitDust(
        this.wRear.position.x,
        this.wRear.position.y + WHEEL_R - 2, 2);
    }
  }

  draw(ctx, camX, camY) {
    if (!this.chassis) return;
    ctx.save();
    ctx.translate(-camX, -camY);
    this._drawWheel(ctx, this.wRear);
    this._drawWheel(ctx, this.wFront);
    this._drawChassis(ctx);
    ctx.restore();
  }

  _drawWheel(ctx, wheel) {
    const { x, y } = wheel.position;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(wheel.angle);

    // Tire
    ctx.beginPath();
    ctx.arc(0, 0, WHEEL_R, 0, Math.PI * 2);
    ctx.fillStyle = '#1a1a2a';
    ctx.fill();
    ctx.strokeStyle = '#3d3d5c';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Hub
    ctx.beginPath();
    ctx.arc(0, 0, WHEEL_R * 0.42, 0, Math.PI * 2);
    ctx.fillStyle = '#e2e8f0';
    ctx.fill();

    // Spokes
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 2;
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(a) * WHEEL_R * 0.82, Math.sin(a) * WHEEL_R * 0.82);
      ctx.stroke();
    }
    ctx.restore();
  }

  _drawChassis(ctx) {
    const { x, y } = this.chassis.position;
    const angle = this.chassis.angle;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);

    // Body shadow
    ctx.shadowColor = 'rgba(0,0,0,0.4)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 4;

    // Main body
    ctx.fillStyle = '#f6ad55';
    ctx.beginPath();
    ctx.roundRect(-V_W / 2, -V_H / 2, V_W, V_H, 5);
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    // Cabin
    ctx.fillStyle = '#ed8936';
    ctx.beginPath();
    ctx.roundRect(-V_W / 2 + 4, -V_H / 2 - 16, V_W * 0.45, 18, [5, 5, 0, 0]);
    ctx.fill();

    // Cabin window
    ctx.fillStyle = 'rgba(190,230,255,0.88)';
    ctx.beginPath();
    ctx.roundRect(-V_W / 2 + 7, -V_H / 2 - 13, V_W * 0.34, 11, 3);
    ctx.fill();

    // Stripe
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.fillRect(-V_W / 2, -V_H / 2 + 8, V_W, 4);

    // Headlight
    ctx.fillStyle = '#fef3c7';
    ctx.beginPath();
    ctx.arc(V_W / 2 - 4, 0, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  destroy() {
    if (this._driveListener) {
      this.physics.offBeforeUpdate(this._driveListener);
      this._driveListener = null;
    }
    if (this.chassis) {
      for (const c of this.constraints) this.physics.removeConstraint(c);
      this.physics.removeBodies([this.chassis, this.wFront, this.wRear]);
      this.chassis = this.wFront = this.wRear = null;
      this.constraints = [];
    }
  }

  reset(x, y) {
    this.destroy();
    this.create(x !== undefined ? x : this.startX, y !== undefined ? y : this.startY);
  }
};
