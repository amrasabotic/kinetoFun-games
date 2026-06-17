import type { HandLandmarker, HandLandmarkerResult } from '@mediapipe/tasks-vision';

export interface HandCursorData {
  detected: boolean;
  x: number; // 0–1 normalized, mirrored
  y: number; // 0–1 normalized
}

const WASM_PATH = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm';
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';

// Index finger tip is landmark 8 in MediaPipe Hands
const INDEX_TIP = 8;

const SMOOTHING = 0.25;
const TARGET_FPS = 30;

export class HandTracker {
  private landmarker: HandLandmarker | null = null;
  private videoEl: HTMLVideoElement | null = null;
  private animId = 0;
  private running = false;
  private lastFrame = 0;
  private smoothX = 0.5;
  private smoothY = 0.5;
  private onData: ((data: HandCursorData) => void) | null = null;
  private initialized = false;

  async init(
    videoEl: HTMLVideoElement,
    onData: (data: HandCursorData) => void
  ): Promise<void> {
    this.videoEl = videoEl;
    this.onData = onData;

    const { FilesetResolver, HandLandmarker } = await import('@mediapipe/tasks-vision');
    const vision = await FilesetResolver.forVisionTasks(WASM_PATH);
    this.landmarker = await HandLandmarker.createFromOptions(vision, {
      baseOptions: { modelAssetPath: MODEL_URL, delegate: 'GPU' },
      runningMode: 'VIDEO',
      numHands: 1,
    });
    this.initialized = true;
  }

  startProcessing(): void {
    if (!this.initialized || this.running) return;
    this.running = true;
    this.loop();
  }

  stopProcessing(): void {
    this.running = false;
    cancelAnimationFrame(this.animId);
    // Emit a "not detected" so cursor hides cleanly
    this.onData?.({ detected: false, x: this.smoothX, y: this.smoothY });
  }

  private loop(): void {
    if (!this.running) return;
    this.animId = requestAnimationFrame(() => this.loop());

    const now = performance.now();
    if (now - this.lastFrame < 1000 / TARGET_FPS) return;
    this.lastFrame = now;

    const video = this.videoEl!;
    if (!this.landmarker || video.readyState < 2) return;

    let result: HandLandmarkerResult;
    try {
      result = this.landmarker.detectForVideo(video, now);
    } catch { return; }

    const lms = result.landmarks?.[0];
    if (!lms || lms.length < 9) {
      this.onData?.({ detected: false, x: this.smoothX, y: this.smoothY });
      return;
    }

    const tip = lms[INDEX_TIP];
    // Mirror X so movement feels natural (like a mirror)
    this.smoothX += (1 - tip.x - this.smoothX) * SMOOTHING;
    this.smoothY += (tip.y - this.smoothY) * SMOOTHING;

    this.onData?.({
      detected: true,
      x: Math.max(0, Math.min(1, this.smoothX)),
      y: Math.max(0, Math.min(1, this.smoothY)),
    });
  }

  isInitialized(): boolean { return this.initialized; }
  isRunning(): boolean { return this.running; }
}
