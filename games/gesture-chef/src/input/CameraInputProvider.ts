import { inputManager } from './InputManager';

/**
 * MediaPipe Hands-based gesture recognition provider.
 * Translates hand landmarks into cooking gestures and emits via InputManager.
 * Architecture: Camera → MediaPipe Hands → Landmark classification → InputManager → Game Logic
 */
export class CameraInputProvider {
  private _active = false;
  private handsInstance: Hands | null = null;
  private cameraInstance: Camera | null = null;
  private videoEl: HTMLVideoElement | null = null;
  private canvasEl: HTMLCanvasElement | null = null;

  // Hand tracking state
  private prevWristX = 0;
  private prevWristY = 0;
  private prevWristTs = 0;
  private isFistDown = false;
  private downWristX = 0;
  private downWristY = 0;
  private downTs = 0;
  private circleStartAngle = 0;
  private circleTotalRotation = 0;
  private lastAngle = 0;

  // Gesture thresholds
  private readonly CHOP_SPEED_THRESHOLD = 15;       // px/ms for fast wrist movement
  private readonly PINCH_DISTANCE_THRESHOLD = 0.08; // normalized distance < 0.08 is a pinch
  private readonly PLACE_DURATION_THRESHOLD = 400;  // ms
  private readonly STIR_ANGLE_THRESHOLD = 0.01;     // radians

  async start(videoEl?: HTMLVideoElement): Promise<boolean> {
    try {
      // Create or use provided video element
      if (!videoEl) {
        videoEl = document.createElement('video');
        videoEl.style.display = 'none';
      }
      this.videoEl = videoEl;

      // Create canvas for drawing
      this.canvasEl = document.createElement('canvas');
      this.canvasEl.style.display = 'none';

      // Initialize MediaPipe Hands
      const handsInstance = new Hands({
        locateFile: (file) =>
          `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
      });

      await handsInstance.initialize();

      // Set up results callback
      handsInstance.onResults((results) => {
        if (this._active) {
          this.processHandLandmarks(results);
        }
      });

      this.handsInstance = handsInstance;

      // Initialize camera
      const camera = new Camera(videoEl, {
        onFrame: async (canvas) => {
          if (this._active && this.handsInstance) {
            await this.handsInstance.send({
              image: canvas as HTMLCanvasElement,
            });
          }
        },
      });

      await camera.start();
      this.cameraInstance = camera;
      this._active = true;

      console.info('[CameraInputProvider] Camera and MediaPipe Hands initialized successfully');
      return true;
    } catch (err) {
      console.error('[CameraInputProvider] Failed to initialize:', err);
      this.stop();
      return false;
    }
  }

  stop(): void {
    this._active = false;
    if (this.cameraInstance) {
      this.cameraInstance.stop();
      this.cameraInstance = null;
    }
    if (this.handsInstance) {
      this.handsInstance.close();
      this.handsInstance = null;
    }
    if (this.videoEl && !this.videoEl.parentElement) {
      this.videoEl.remove();
    }
    this.videoEl = null;
    this.canvasEl = null;
  }

  isActive(): boolean {
    return this._active;
  }

  /**
   * Process hand landmarks and emit cooking gestures.
   * MediaPipe provides 21 landmarks per hand: https://github.com/google/mediapipe/blob/master/mediapipe/modules/hand_landmark/hand_landmark.pbtxt
   *
   * Key landmarks:
   *   0: wrist
   *   4: thumb tip
   *   8: index finger tip (used for pinch detection)
   *   12: middle finger tip
   */
  private processHandLandmarks(results: HandsResults): void {
    if (!results.multiHandLandmarks || results.multiHandLandmarks.length === 0) {
      if (this.isFistDown) {
        this.isFistDown = false;
        inputManager.emit('drawEnd', { x: this.prevWristX, y: this.prevWristY });
      }
      return;
    }

    // Process primary hand (first detected hand)
    const landmarks = results.multiHandLandmarks[0];
    const wristLandmark = landmarks[0];
    const indexTipLandmark = landmarks[8];
    const thumbTipLandmark = landmarks[4];

    // Normalize landmarks to canvas/game coordinates (0-1 range)
    const wristX = wristLandmark.x;
    const wristY = wristLandmark.y;
    const indexTipX = indexTipLandmark.x;
    const indexTipY = indexTipLandmark.y;
    const thumbTipX = thumbTipLandmark.x;
    const thumbTipY = thumbTipLandmark.y;

    // Detect hand state: open/closed/pinch
    const isFistClosed = this.isFistClosed(landmarks);
    const isPinching = this.isPinching(indexTipX, indexTipY, thumbTipX, thumbTipY);

    const now = performance.now();

    // Always emit pointer position for cursor trail (use index tip as "cursor")
    const pointerX = indexTipX;
    const pointerY = indexTipY;
    const dt = Math.max(now - this.prevWristTs, 1);
    const vx = (pointerX - this.prevWristX) / (dt / 16);
    const vy = (pointerY - this.prevWristY) / (dt / 16);
    const speed = Math.sqrt(vx * vx + vy * vy);

    // Scale to normalized game space (0-1)
    inputManager.emit('pointerMove', {
      x: pointerX,
      y: pointerY,
      vx,
      vy,
      speed,
    });

    // Detect gesture transitions
    if (!this.isFistDown && (isFistClosed || isPinching)) {
      // Hand closed / pinch started
      this.isFistDown = true;
      this.downWristX = wristX;
      this.downWristY = wristY;
      this.downTs = now;
      this.prevWristX = wristX;
      this.prevWristY = wristY;
      this.circleStartAngle = Math.atan2(wristY - this.downWristY, wristX - this.downWristX);
      this.lastAngle = this.circleStartAngle;
      this.circleTotalRotation = 0;

      if (isPinching) {
        // Pinch started — start drawing
        inputManager.emit('drawStart', { x: wristX, y: wristY });
      }
    } else if (this.isFistDown && !isFistClosed && !isPinching) {
      // Hand opened / pinch released
      this.isFistDown = false;
      const elapsed = now - this.downTs;

      // PLACE gesture — quick tap-like motion
      const dx = wristX - this.downWristX;
      const dy = wristY - this.downWristY;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (elapsed < this.PLACE_DURATION_THRESHOLD && d < 0.15) {
        inputManager.emit('place', { x: wristX, y: wristY });
      }

      inputManager.emit('drawEnd', { x: wristX, y: wristY });
    } else if (this.isFistDown) {
      // Hand is closed — emit movement gestures

      const dx = wristX - this.prevWristX;
      const dy = wristY - this.prevWristY;
      const segmentSpeed = Math.sqrt(dx * dx + dy * dy) / (dt / 16);

      // CHOP — fast wrist movement in any direction
      if (segmentSpeed > this.CHOP_SPEED_THRESHOLD) {
        inputManager.emit('chop', {
          x: wristX,
          y: wristY,
          prevX: this.prevWristX,
          prevY: this.prevWristY,
          speed: segmentSpeed,
        });
      }

      // STIR — circular motion around stir center
      const { cx, cy, active } = inputManager.getStirCenter();
      if (active) {
        const angle = Math.atan2(wristY - cy, wristX - cx);
        const angleDelta = this.angleDelta(this.lastAngle, angle);
        this.circleTotalRotation += angleDelta;
        this.lastAngle = angle;
        const distFromCenter = Math.sqrt(
          (wristX - cx) * (wristX - cx) + (wristY - cy) * (wristY - cy)
        );

        if (Math.abs(angleDelta) > this.STIR_ANGLE_THRESHOLD && distFromCenter > 0.08) {
          inputManager.emit('stir', {
            direction: angleDelta > 0 ? 'cw' : 'ccw',
            deltaAngle: angleDelta,
            totalRotation: this.circleTotalRotation,
            x: wristX,
            y: wristY,
            centerX: cx,
            centerY: cy,
          });
        }
      }

      // FLIP — upward wrist flick (detected as fast upward movement)
      if (vy < -this.CHOP_SPEED_THRESHOLD && Math.abs(vy) > Math.abs(vx) * 1.4) {
        const elapsed = now - this.downTs;
        if (elapsed < this.PLACE_DURATION_THRESHOLD) {
          inputManager.emit('flip', { speed: Math.abs(vy) / (elapsed / 16) });
        }
      }

      // DRAW — pointer movement while pinching
      if (isPinching) {
        inputManager.emit('draw', { x: wristX, y: wristY });
      }
    }

    this.prevWristX = wristX;
    this.prevWristY = wristY;
    this.prevWristTs = now;
  }

  /**
   * Detect if the hand is in a closed fist position.
   * A fist is closed when all fingertip-to-palm distances are small.
   */
  private isFistClosed(landmarks: NormalizedLandmark[]): boolean {
    const palmBase = landmarks[0]; // wrist
    const fingerTips = [4, 8, 12, 16, 20]; // thumb, index, middle, ring, pinky
    let closedCount = 0;

    for (const tipIdx of fingerTips) {
      const tip = landmarks[tipIdx];
      const dist = Math.sqrt(
        (tip.x - palmBase.x) ** 2 + (tip.y - palmBase.y) ** 2
      );
      if (dist < 0.12) closedCount++;
    }

    return closedCount >= 3; // 3+ fingers closed = fist
  }

  /**
   * Detect if thumb and index finger are pinching.
   */
  private isPinching(
    indexTipX: number,
    indexTipY: number,
    thumbTipX: number,
    thumbTipY: number
  ): boolean {
    const dx = indexTipX - thumbTipX;
    const dy = indexTipY - thumbTipY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance < this.PINCH_DISTANCE_THRESHOLD;
  }

  /**
   * Compute signed angle delta between two angles (in radians).
   */
  private angleDelta(prev: number, curr: number): number {
    let delta = curr - prev;
    while (delta > Math.PI) delta -= 2 * Math.PI;
    while (delta < -Math.PI) delta += 2 * Math.PI;
    return delta;
  }
}

export const cameraInputProvider = new CameraInputProvider();
