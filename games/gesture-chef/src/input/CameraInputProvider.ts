import { inputManager } from './InputManager';

/**
 * MediaPipe Hands-based gesture recognition provider.
 *
 * Fixes applied vs original:
 *   1. Uses setOptions() instead of initialize() (works with CDN v0.4)
 *   2. Appends video element to DOM (MediaPipe Camera requires it to be live)
 *   3. onFrame passes `this.videoEl` to handsInstance.send() — not a canvas
 *   4. All emitted coordinates are in screen pixels (matching MouseInputProvider)
 *   5. Mirror X so hand movement matches visual expectation (camera is mirrored)
 *   6. distFromCenter threshold in pixels, not normalized units
 */
export class CameraInputProvider {
  private _active = false;
  private handsInstance: Hands | null = null;
  private cameraInstance: Camera | null = null;
  private videoEl: HTMLVideoElement | null = null;
  private camWrap: HTMLDivElement | null = null;

  // Gesture state
  private prevX = 0;
  private prevY = 0;
  private prevTs = 0;
  private isFistDown = false;
  private downX = 0;
  private downY = 0;
  private downTs = 0;
  private lastAngle = 0;
  private circleTotalRotation = 0;

  // Thresholds — all in pixel/frame units (same frame of reference as MouseInputProvider)
  private readonly CHOP_SPEED_PX = 15;
  private readonly PINCH_DIST_NORM = 0.08; // keep in normalized space (landmark-to-landmark)
  private readonly PLACE_DURATION_MS = 400;
  private readonly PLACE_DIST_PX = 80;
  private readonly STIR_ANGLE_MIN = 0.01;
  private readonly STIR_DIST_PX = 50;

  async start(): Promise<boolean> {
    if (this._active) return true;
    try {
      // Create camera preview widget (same style as Dance Freeze / Gesture Racer)
      const wrap = document.createElement('div');
      wrap.style.cssText =
        'position:fixed;bottom:14px;right:14px;width:160px;height:120px;' +
        'border-radius:12px;overflow:hidden;border:2px solid rgba(255,255,255,.25);' +
        'z-index:500;background:#111;';

      const vid = document.createElement('video');
      vid.autoplay = true;
      vid.playsInline = true;
      vid.muted = true;
      vid.style.cssText = 'width:100%;height:100%;object-fit:cover;transform:scaleX(-1);display:block;';

      const lbl = document.createElement('div');
      lbl.textContent = '📷 HAND CAM';
      lbl.style.cssText =
        'position:absolute;top:5px;left:7px;font-size:9px;' +
        'color:rgba(255,255,255,.6);font-weight:700;letter-spacing:.5px;pointer-events:none;';

      wrap.appendChild(vid);
      wrap.appendChild(lbl);
      document.body.appendChild(wrap);

      this.videoEl = vid;
      this.camWrap = wrap;

      // Initialize MediaPipe Hands with pinned CDN (matches index.html script tag)
      const hands = new Hands({
        locateFile: (file) =>
          `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1646424915/${file}`,
      });
      hands.setOptions({
        maxNumHands: 1,
        modelComplexity: 0,
        minDetectionConfidence: 0.6,
        minTrackingConfidence: 0.5,
      });
      hands.onResults((results) => {
        if (this._active) this.processHandLandmarks(results);
      });
      this.handsInstance = hands;

      const camera = new Camera(vid, {
        onFrame: async () => {
          if (this._active && this.handsInstance && this.videoEl) {
            await this.handsInstance.send({ image: this.videoEl });
          }
        },
        width: 320,
        height: 240,
      });

      await camera.start();
      this.cameraInstance = camera;
      this._active = true;
      console.info('[CameraInputProvider] Ready');
      return true;
    } catch (err) {
      console.error('[CameraInputProvider] Failed to start:', err);
      this.stop();
      return false;
    }
  }

  stop(): void {
    this._active = false;
    this.cameraInstance?.stop();
    this.cameraInstance = null;
    this.handsInstance?.close();
    this.handsInstance = null;
    this.camWrap?.remove();
    this.camWrap = null;
    this.videoEl = null;
  }

  isActive(): boolean {
    return this._active;
  }

  private processHandLandmarks(results: HandsResults): void {
    const W = window.innerWidth;
    const H = window.innerHeight;

    if (!results.multiHandLandmarks || results.multiHandLandmarks.length === 0) {
      if (this.isFistDown) {
        this.isFistDown = false;
        inputManager.emit('drawEnd', { x: this.prevX, y: this.prevY });
      }
      return;
    }

    const lm = results.multiHandLandmarks[0];
    const wrist = lm[0];
    const indexTip = lm[8];
    const thumbTip = lm[4];

    // Convert to screen pixels, mirror X so gestures match visual feedback
    const px = (x: number) => (1 - x) * W;
    const py = (y: number) => y * H;

    const wristX = px(wrist.x);
    const wristY = py(wrist.y);
    const indexX = px(indexTip.x);
    const indexY = py(indexTip.y);

    // Use normalized space for pinch (distance between fingertips within camera frame)
    const isFist = this.detectFist(lm);
    const isPinch = this.detectPinch(indexTip.x, indexTip.y, thumbTip.x, thumbTip.y);

    const now = performance.now();
    const dt = Math.max(now - this.prevTs, 1);
    // velocity in px/frame (same formula as MouseInputProvider)
    const vx = ((indexX - this.prevX) / dt) * 16;
    const vy = ((indexY - this.prevY) / dt) * 16;
    const speed = Math.sqrt(vx * vx + vy * vy);

    inputManager.emit('pointerMove', { x: indexX, y: indexY, vx, vy, speed });

    if (!this.isFistDown && (isFist || isPinch)) {
      this.isFistDown = true;
      this.downX = wristX; this.downY = wristY; this.downTs = now;
      this.prevX = wristX; this.prevY = wristY;
      this.lastAngle = Math.atan2(0, 0);
      this.circleTotalRotation = 0;
      if (isPinch) inputManager.emit('drawStart', { x: wristX, y: wristY });

    } else if (this.isFistDown && !isFist && !isPinch) {
      this.isFistDown = false;
      const elapsed = now - this.downTs;
      const dx = wristX - this.downX;
      const dy = wristY - this.downY;
      const d = Math.sqrt(dx * dx + dy * dy);

      if (elapsed < this.PLACE_DURATION_MS && d < this.PLACE_DIST_PX) {
        inputManager.emit('place', { x: wristX, y: wristY });
      }
      inputManager.emit('drawEnd', { x: wristX, y: wristY });

    } else if (this.isFistDown) {
      const dx = wristX - this.prevX;
      const dy = wristY - this.prevY;
      const segSpeed = Math.sqrt(dx * dx + dy * dy) / (dt / 16);

      if (segSpeed > this.CHOP_SPEED_PX) {
        inputManager.emit('chop', {
          x: wristX, y: wristY,
          prevX: this.prevX, prevY: this.prevY,
          speed: segSpeed,
        });
      }

      // Stir — circular motion around the configured pot centre (pixel coords)
      const { cx, cy, active } = inputManager.getStirCenter();
      if (active) {
        const angle = Math.atan2(wristY - cy, wristX - cx);
        const delta = this.angleDelta(this.lastAngle, angle);
        this.circleTotalRotation += delta;
        this.lastAngle = angle;
        const distFromCenter = Math.sqrt((wristX - cx) ** 2 + (wristY - cy) ** 2);
        if (Math.abs(delta) > this.STIR_ANGLE_MIN && distFromCenter > this.STIR_DIST_PX) {
          inputManager.emit('stir', {
            direction: delta > 0 ? 'cw' : 'ccw',
            deltaAngle: delta,
            totalRotation: this.circleTotalRotation,
            x: wristX, y: wristY,
            centerX: cx, centerY: cy,
          });
        }
      }

      // Flip — fast upward flick
      if (vy < -this.CHOP_SPEED_PX && Math.abs(vy) > Math.abs(vx) * 1.4) {
        const elapsed = now - this.downTs;
        if (elapsed < this.PLACE_DURATION_MS) {
          inputManager.emit('flip', { speed: Math.abs(vy) / (elapsed / 16) });
        }
      }

      if (isPinch) inputManager.emit('draw', { x: wristX, y: wristY });
    }

    this.prevX = wristX;
    this.prevY = wristY;
    this.prevTs = now;
  }

  private detectFist(lm: NormalizedLandmark[]): boolean {
    const palm = lm[0];
    let closed = 0;
    for (const tipIdx of [4, 8, 12, 16, 20]) {
      const tip = lm[tipIdx];
      const d = Math.sqrt((tip.x - palm.x) ** 2 + (tip.y - palm.y) ** 2);
      if (d < 0.12) closed++;
    }
    return closed >= 3;
  }

  private detectPinch(ix: number, iy: number, tx: number, ty: number): boolean {
    return Math.sqrt((ix - tx) ** 2 + (iy - ty) ** 2) < this.PINCH_DIST_NORM;
  }

  private angleDelta(prev: number, curr: number): number {
    let d = curr - prev;
    while (d > Math.PI) d -= 2 * Math.PI;
    while (d < -Math.PI) d += 2 * Math.PI;
    return d;
  }
}

export const cameraInputProvider = new CameraInputProvider();
