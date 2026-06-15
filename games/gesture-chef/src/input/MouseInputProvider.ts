import { inputManager } from './InputManager';
import { angleDelta, distance } from '../utils/mathUtils';

/**
 * Translates DOM mouse / touch events into high-level cooking gestures and
 * emits them through InputManager.
 *
 * This is the ONLY place in the codebase that reads DOM pointer events.
 * Mini-games must NOT add their own mouse/touch listeners.
 *
 * When camera + MediaPipe is ready, CameraInputProvider becomes the source and
 * this class is detached — zero changes required in game code.
 *
 * Architecture:  Mouse/Touch → MouseInputProvider → InputManager → Game Logic
 */
export class MouseInputProvider {
  private removeListeners: (() => void) | null = null;
  private isDown = false;
  private prevX = 0;
  private prevY = 0;
  private prevT = 0;
  private downX = 0;
  private downY = 0;
  private downT = 0;
  private lastCircleAngle = 0;
  private totalRotation = 0;

  /**
   * Attach to a game container element.
   * All emitted coordinates are relative to this element's bounding rect.
   * Call detach() on component unmount.
   */
  attach(el: HTMLElement): void {
    this.detach(); // remove any previous listeners

    const getRect = () => el.getBoundingClientRect();

    const pos = (e: MouseEvent | TouchEvent): { x: number; y: number } => {
      const r = getRect();
      if ('touches' in e) {
        const t = e.touches[0] ?? e.changedTouches[0];
        return { x: t.clientX - r.left, y: t.clientY - r.top };
      }
      return { x: (e as MouseEvent).clientX - r.left, y: (e as MouseEvent).clientY - r.top };
    };

    const onDown = (e: MouseEvent | TouchEvent) => {
      e.preventDefault();
      const { x, y } = pos(e);
      this.isDown = true;
      this.downX = x; this.downY = y; this.downT = performance.now();
      this.prevX = x; this.prevY = y; this.prevT = this.downT;

      const { cx, cy } = inputManager.getStirCenter();
      this.lastCircleAngle = Math.atan2(y - cy, x - cx);
      this.totalRotation = 0;

      inputManager.emit('drawStart', { x, y });
    };

    const onMove = (e: MouseEvent | TouchEvent) => {
      e.preventDefault();
      const { x, y } = pos(e);
      const now = performance.now();
      const dt = Math.max(now - this.prevT, 1);
      const vx = ((x - this.prevX) / dt) * 16;
      const vy = ((y - this.prevY) / dt) * 16;
      const speed = Math.sqrt(vx * vx + vy * vy);

      // Always emit position for cursor-trail rendering
      inputManager.emit('pointerMove', { x, y, vx, vy, speed });

      if (this.isDown) {
        // CHOP — a cutting stroke segment (VegetableChop subscribes)
        inputManager.emit('chop', { x, y, prevX: this.prevX, prevY: this.prevY, speed });

        // DRAW — frosting continuation (CakeDecoration subscribes)
        inputManager.emit('draw', { x, y });

        // STIR — circular motion around the configured pot centre (StirTheSoup subscribes)
        const { cx, cy, active } = inputManager.getStirCenter();
        if (active) {
          const ang = Math.atan2(y - cy, x - cx);
          const delta = angleDelta(this.lastCircleAngle, ang);
          this.totalRotation += delta;
          this.lastCircleAngle = ang;
          const dist = distance(x, y, cx, cy);
          if (Math.abs(delta) > 0.01 && dist > 20) {
            inputManager.emit('stir', {
              direction: delta > 0 ? 'cw' : 'ccw',
              deltaAngle: delta,
              totalRotation: this.totalRotation,
              x, y,
              centerX: cx,
              centerY: cy,
            });
          }
        }
      }

      this.prevX = x; this.prevY = y; this.prevT = now;
    };

    const onUp = (e: MouseEvent | TouchEvent) => {
      e.preventDefault();
      if (!this.isDown) return;
      this.isDown = false;
      const { x, y } = pos(e);

      const elapsed = performance.now() - this.downT;
      const dx = x - this.downX;
      const dy = y - this.downY;
      const d = Math.sqrt(dx * dx + dy * dy);

      // PLACE — quick tap with small displacement (CakeDecoration subscribes)
      if (elapsed < 400 && d < 20) {
        inputManager.emit('place', { x, y });
      }

      // FLIP — fast upward swipe (PancakeFlip subscribes)
      const diffY = this.downY - y; // positive = pointer moved upward
      const diffX = Math.abs(x - this.downX);
      if (elapsed < 400 && diffY > 40 && diffY > diffX * 1.2) {
        inputManager.emit('flip', { speed: diffY / elapsed });
      }

      // Always signal end of drag (frosting, stir tracking)
      inputManager.emit('drawEnd', { x, y });
    };

    el.addEventListener('mousedown',  onDown);
    el.addEventListener('mousemove',  onMove);
    el.addEventListener('mouseup',    onUp);
    el.addEventListener('mouseleave', onUp);
    el.addEventListener('touchstart', onDown, { passive: false });
    el.addEventListener('touchmove',  onMove, { passive: false });
    el.addEventListener('touchend',   onUp,   { passive: false });

    this.removeListeners = () => {
      el.removeEventListener('mousedown',  onDown);
      el.removeEventListener('mousemove',  onMove);
      el.removeEventListener('mouseup',    onUp);
      el.removeEventListener('mouseleave', onUp);
      el.removeEventListener('touchstart', onDown);
      el.removeEventListener('touchmove',  onMove);
      el.removeEventListener('touchend',   onUp);
    };
  }

  detach(): void {
    this.removeListeners?.();
    this.removeListeners = null;
    this.isDown = false;
  }
}

export const mouseInputProvider = new MouseInputProvider();
