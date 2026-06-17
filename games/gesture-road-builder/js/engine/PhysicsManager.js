window.GRB = window.GRB || {};

GRB.PhysicsManager = class {
  constructor() {
    const { Engine, Render, Runner, World, Events, Composite } = Matter;
    this.engine = Engine.create({ gravity: { x: 0, y: 1.8 } });
    this.world  = this.engine.world;
    this.runner = null;
    this._beforeUpdateListeners = [];
    this._collisionListeners = [];
    this._bodies = [];
    this._constraints = [];

    // Listen to engine events
    Events.on(this.engine, 'beforeUpdate', () => {
      for (const fn of this._beforeUpdateListeners) fn();
    });
    Events.on(this.engine, 'collisionStart', (ev) => {
      for (const fn of this._collisionListeners) fn(ev);
    });
  }

  step(dt) {
    Matter.Engine.update(this.engine, dt);
  }

  addBody(body) {
    Matter.Composite.add(this.world, body);
    this._bodies.push(body);
    return body;
  }

  addBodies(arr) {
    Matter.Composite.add(this.world, arr);
    this._bodies.push(...arr);
    return arr;
  }

  addConstraint(c) {
    Matter.Composite.add(this.world, c);
    this._constraints.push(c);
    return c;
  }

  removeBody(body) {
    Matter.Composite.remove(this.world, body);
    const idx = this._bodies.indexOf(body);
    if (idx >= 0) this._bodies.splice(idx, 1);
  }

  removeBodies(arr) {
    for (const b of arr) this.removeBody(b);
  }

  removeConstraint(c) {
    Matter.Composite.remove(this.world, c);
    const idx = this._constraints.indexOf(c);
    if (idx >= 0) this._constraints.splice(idx, 1);
  }

  onBeforeUpdate(fn) { this._beforeUpdateListeners.push(fn); }
  offBeforeUpdate(fn) {
    const i = this._beforeUpdateListeners.indexOf(fn);
    if (i >= 0) this._beforeUpdateListeners.splice(i, 1);
  }

  onCollision(fn) { this._collisionListeners.push(fn); }

  reset() {
    Matter.World.clear(this.world, false);
    this._bodies.length = 0;
    this._constraints.length = 0;
  }

  getEngine() { return this.engine; }
  getWorld()  { return this.world; }

  // Convenience builders (used by LevelManager / DrawingManager / VehicleManager)
  static makeBox(x, y, w, h, opts = {}) {
    return Matter.Bodies.rectangle(x, y, w, h, opts);
  }
  static makeCircle(x, y, r, opts = {}) {
    return Matter.Bodies.circle(x, y, r, opts);
  }
  static makeConstraint(opts) {
    return Matter.Constraint.create(opts);
  }
  static setStatic(body, flag) {
    Matter.Body.setStatic(body, flag);
  }
  static setVelocity(body, v) {
    Matter.Body.setVelocity(body, v);
  }
  static setAngularVelocity(body, av) {
    Matter.Body.setAngularVelocity(body, av);
  }
  static applyForce(body, pos, force) {
    Matter.Body.applyForce(body, pos, force);
  }
  static setAngle(body, angle) {
    Matter.Body.setAngle(body, angle);
  }
};
