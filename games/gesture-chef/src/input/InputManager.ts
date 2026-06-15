import type { GestureEventType, GestureEventDataMap, GestureHandler } from '../types';

type AnySet = Set<GestureHandler<GestureEventType>>;

/**
 * Pure event bus for high-level cooking gestures.
 *
 * Game logic ONLY subscribes here — never to DOM events directly.
 * Input providers emit into this bus:
 *   - MouseInputProvider  (current fallback)
 *   - CameraInputProvider (MediaPipe, when implemented)
 *
 * Swapping input sources requires zero changes to game code.
 */
export class InputManager {
  private handlers = new Map<GestureEventType, AnySet>();

  // Stir centre — configured by StirTheSoup before entering the stir phase.
  // MouseInputProvider reads this to know where to measure circular motion from.
  private stirCx = 0;
  private stirCy = 0;
  private stirActive = false;

  on<T extends GestureEventType>(type: T, handler: GestureHandler<T>): () => void {
    if (!this.handlers.has(type)) this.handlers.set(type, new Set());
    (this.handlers.get(type) as Set<GestureHandler<T>>).add(handler);
    return () => (this.handlers.get(type) as Set<GestureHandler<T>>)?.delete(handler);
  }

  emit<T extends GestureEventType>(type: T, data: GestureEventDataMap[T]): void {
    this.handlers.get(type)?.forEach(h => (h as GestureHandler<T>)(data));
  }

  /** Call when entering the stir phase; coordinates must be relative to the attached element. */
  enableCircularTracking(cx: number, cy: number): void {
    this.stirCx = cx;
    this.stirCy = cy;
    this.stirActive = true;
  }

  disableCircularTracking(): void {
    this.stirActive = false;
  }

  getStirCenter(): { cx: number; cy: number; active: boolean } {
    return { cx: this.stirCx, cy: this.stirCy, active: this.stirActive };
  }
}

export const inputManager = new InputManager();
