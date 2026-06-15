/**
 * InputManager — gesture abstraction layer.
 *
 * Currently implemented with mouse/touch events.
 * Future: swap in a MediaPipeProvider that calls the same emit() methods
 * and all game logic continues working unchanged.
 */
import type { GestureEventType, GestureEventDataMap, GestureHandler } from '../types';
import { angleDelta, distance } from '../utils/mathUtils';

type AnySet = Set<GestureHandler<GestureEventType>>;

export class InputManager {
  private handlers = new Map<GestureEventType, AnySet>();
  private removeListeners: (() => void) | null = null;

  // Pointer tracking
  private _isDown = false;
  private prevX = 0;
  private prevY = 0;
  private prevT = 0;
  private downX = 0;
  private downY = 0;

  // Circular motion tracking
  private circleCx = 0;
  private circleCy = 0;
  private circleActive = false;
  private lastCircleAngle = 0;
  private totalRotation = 0;

  get isDown(): boolean { return this._isDown; }

  // ─── Public API ──────────────────────────────────────────────────────────

  on<T extends GestureEventType>(type: T, handler: GestureHandler<T>): () => void {
    if (!this.handlers.has(type)) this.handlers.set(type, new Set());
    (this.handlers.get(type) as Set<GestureHandler<T>>).add(handler);
    return () => (this.handlers.get(type) as Set<GestureHandler<T>>)?.delete(handler);
  }

  emit<T extends GestureEventType>(type: T, data: GestureEventDataMap[T]): void {
    this.handlers.get(type)?.forEach(h => (h as GestureHandler<T>)(data));
  }

  /** Attach mouse/touch listeners to a DOM element. Call detach() on unmount. */
  attach(el: HTMLElement): void {
    this.detach();

    const rect = () => el.getBoundingClientRect();

    const pos = (e: MouseEvent | TouchEvent) => {
      const r = rect();
      if ('touches' in e) {
        const t = e.touches[0] ?? e.changedTouches[0];
        return { x: t.clientX - r.left, y: t.clientY - r.top };
      }
      return { x: (e as MouseEvent).clientX - r.left, y: (e as MouseEvent).clientY - r.top };
    };

    const onMove = (e: MouseEvent | TouchEvent) => {
      e.preventDefault();
      const { x, y } = pos(e);
      const now = performance.now();
      const dt = Math.max(now - this.prevT, 1);
      const vx = ((x - this.prevX) / dt) * 16;
      const vy = ((y - this.prevY) / dt) * 16;
      const speed = Math.sqrt(vx * vx + vy * vy);

      this.emit('pointerMove', { x, y, vx, vy, speed });

      if (this._isDown) {
        if (vy < -4 && Math.abs(vy) > Math.abs(vx) * 1.4) {
          this.emit('swipeUp', { x, y, vx, vy, speed });
        }
        if (vy > 4 && Math.abs(vy) > Math.abs(vx) * 1.4) {
          this.emit('swipeDown', { x, y, vx, vy, speed });
        }

        if (this.circleActive) {
          const ang = Math.atan2(y - this.circleCy, x - this.circleCx);
          const delta = angleDelta(this.lastCircleAngle, ang);
          this.totalRotation += delta;
          this.lastCircleAngle = ang;
          const dist = distance(x, y, this.circleCx, this.circleCy);
          if (Math.abs(delta) > 0.01 && dist > 20) {
            this.emit('circularMotion', {
              direction: delta > 0 ? 'cw' : 'ccw',
              deltaAngle: delta,
              totalRotation: this.totalRotation,
              x, y,
              centerX: this.circleCx,
              centerY: this.circleCy,
            });
          }
        }
      }

      this.prevX = x;
      this.prevY = y;
      this.prevT = now;
    };

    const onDown = (e: MouseEvent | TouchEvent) => {
      e.preventDefault();
      const { x, y } = pos(e);
      this._isDown = true;
      this.downX = x;
      this.downY = y;
      this.prevX = x;
      this.prevY = y;
      this.prevT = performance.now();
      if (this.circleActive) {
        this.lastCircleAngle = Math.atan2(y - this.circleCy, x - this.circleCx);
        this.totalRotation = 0;
      }
      this.emit('dragStart', { x, y, startX: x, startY: y });
    };

    const onUp = (e: MouseEvent | TouchEvent) => {
      e.preventDefault();
      if (!this._isDown) return;
      this._isDown = false;
      const { x, y } = pos(e);
      this.emit('dragEnd', { x, y, startX: this.downX, startY: this.downY });
      const d = distance(x, y, this.downX, this.downY);
      if (d < 15) this.emit('tap', { x, y });
    };

    el.addEventListener('mousemove', onMove);
    el.addEventListener('mousedown', onDown);
    el.addEventListener('mouseup', onUp);
    el.addEventListener('mouseleave', onUp);
    el.addEventListener('touchmove', onMove, { passive: false });
    el.addEventListener('touchstart', onDown, { passive: false });
    el.addEventListener('touchend', onUp, { passive: false });

    this.removeListeners = () => {
      el.removeEventListener('mousemove', onMove);
      el.removeEventListener('mousedown', onDown);
      el.removeEventListener('mouseup', onUp);
      el.removeEventListener('mouseleave', onUp);
      el.removeEventListener('touchmove', onMove);
      el.removeEventListener('touchstart', onDown);
      el.removeEventListener('touchend', onUp);
    };
  }

  detach(): void {
    this.removeListeners?.();
    this.removeListeners = null;
    this._isDown = false;
  }

  /** Call before a stir-type minigame so circular motion is detected around a centre point. */
  enableCircularTracking(cx: number, cy: number): void {
    this.circleCx = cx;
    this.circleCy = cy;
    this.circleActive = true;
    this.totalRotation = 0;
  }

  disableCircularTracking(): void {
    this.circleActive = false;
    this.totalRotation = 0;
  }
}

export const inputManager = new InputManager();
