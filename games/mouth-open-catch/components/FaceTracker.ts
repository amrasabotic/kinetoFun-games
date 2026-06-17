import type { FaceLandmarker, FaceLandmarkerResult, NormalizedLandmark } from '@mediapipe/tasks-vision';

export interface FaceData {
  detected: boolean;
  noseX: number;        // 0–1 normalized (flipped for mirror)
  noseY: number;        // 0–1 normalized
  mouthOpenness: number; // 0–1 calibrated
  rawMouthGap: number;  // raw pixel-space distance
  upperLipY: number;
  lowerLipY: number;
}

export interface CalibrationProgress {
  phase: 'closed' | 'open' | 'done';
  progress: number; // 0–1
  closedValue: number;
  openValue: number;
}

const WASM_PATH = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm';
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';

// MediaPipe Face Mesh landmark indices
const NOSE_TIP = 1;
const UPPER_LIP_TOP = 13;   // inner upper lip center
const LOWER_LIP_BTM = 14;   // inner lower lip center
const LEFT_EYE = 362;
const RIGHT_EYE = 133;

const CALIBRATION_DURATION_MS = 2000;
const SMOOTHING = 0.18; // lower = more smoothing

export class FaceTracker {
  private landmarker: FaceLandmarker | null = null;
  private videoEl: HTMLVideoElement | null = null;
  private lastFrame = 0;
  private animId = 0;
  private running = false;

  private smoothNoseX = 0.5;
  private smoothNoseY = 0.5;
  private smoothMouthGap = 0;

  private closedThreshold = 0.02;
  private openThreshold = 0.08;

  private calibrating = false;
  private calibPhase: 'closed' | 'open' | 'done' = 'done';
  private calibStart = 0;
  private calibSamples: number[] = [];
  private calibCallback: ((p: CalibrationProgress) => void) | null = null;
  private calibDoneCallback: ((closed: number, open: number) => void) | null = null;

  private onFaceData: ((data: FaceData) => void) | null = null;
  private active = true; // controls whether detection runs (independent of camera)

  async init(
    videoEl: HTMLVideoElement,
    onData: (data: FaceData) => void
  ): Promise<void> {
    this.videoEl = videoEl;
    this.onFaceData = onData;

    const { FilesetResolver, FaceLandmarker } = await import('@mediapipe/tasks-vision');
    const vision = await FilesetResolver.forVisionTasks(WASM_PATH);
    this.landmarker = await FaceLandmarker.createFromOptions(vision, {
      baseOptions: { modelAssetPath: MODEL_URL, delegate: 'GPU' },
      runningMode: 'VIDEO',
      numFaces: 1,
      outputFaceBlendshapes: false,
      outputFacialTransformationMatrixes: false,
    });
  }

  async startCamera(): Promise<void> {
    if (!this.videoEl) throw new Error('FaceTracker not initialized');
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
    });
    this.videoEl.srcObject = stream;
    await new Promise<void>(resolve => {
      this.videoEl!.onloadedmetadata = () => {
        this.videoEl!.play();
        resolve();
      };
    });
    this.running = true;
    this.loop();
  }

  stopCamera(): void {
    this.running = false;
    cancelAnimationFrame(this.animId);
    const stream = this.videoEl?.srcObject as MediaStream | null;
    stream?.getTracks().forEach(t => t.stop());
    if (this.videoEl) this.videoEl.srcObject = null;
  }

  setCalibration(closed: number, open: number): void {
    this.closedThreshold = closed;
    this.openThreshold = Math.max(open, closed + 0.01);
  }

  startCalibration(
    onProgress: (p: CalibrationProgress) => void,
    onDone: (closed: number, open: number) => void
  ): void {
    this.calibrating = true;
    this.calibPhase = 'closed';
    this.calibStart = performance.now();
    this.calibSamples = [];
    this.calibCallback = onProgress;
    this.calibDoneCallback = onDone;
  }

  /** Pause face detection without stopping the camera stream. */
  suspendDetection(): void { this.active = false; }

  /** Resume face detection after a suspendDetection() call. */
  resumeDetection(): void { this.active = true; }

  private loop(): void {
    if (!this.running) return;
    this.animId = requestAnimationFrame(() => this.loop());

    if (!this.active) return; // suspended — keep loop alive but skip detection

    const now = performance.now();
    if (now - this.lastFrame < 33) return; // ~30fps for detection
    this.lastFrame = now;

    const video = this.videoEl!;
    if (!this.landmarker || video.readyState < 2) return;

    let result: FaceLandmarkerResult;
    try {
      result = this.landmarker.detectForVideo(video, now);
    } catch { return; }

    const lms = result.faceLandmarks?.[0];
    if (!lms || lms.length < 15) {
      this.onFaceData?.({ detected: false, noseX: 0.5, noseY: 0.5, mouthOpenness: 0, rawMouthGap: 0, upperLipY: 0, lowerLipY: 0 });
      return;
    }

    const nose = lms[NOSE_TIP];
    const upperLip = lms[UPPER_LIP_TOP];
    const lowerLip = lms[LOWER_LIP_BTM];
    const leftEye = lms[LEFT_EYE];
    const rightEye = lms[RIGHT_EYE];

    // Face scale (inter-eye distance) for normalization
    const eyeDist = Math.hypot(rightEye.x - leftEye.x, rightEye.y - leftEye.y);
    const rawGap = Math.abs(lowerLip.y - upperLip.y) / Math.max(eyeDist, 0.01);

    // Smooth values
    this.smoothNoseX += (1 - nose.x - this.smoothNoseX) * SMOOTHING; // mirror flip
    this.smoothNoseY += (nose.y - this.smoothNoseY) * SMOOTHING;
    this.smoothMouthGap += (rawGap - this.smoothMouthGap) * SMOOTHING * 2;

    const openness = Math.max(0, Math.min(1,
      (this.smoothMouthGap - this.closedThreshold) /
      Math.max(this.openThreshold - this.closedThreshold, 0.001)
    ));

    this.onFaceData?.({
      detected: true,
      noseX: Math.max(0, Math.min(1, this.smoothNoseX)),
      noseY: Math.max(0, Math.min(1, this.smoothNoseY)),
      mouthOpenness: openness,
      rawMouthGap: this.smoothMouthGap,
      upperLipY: upperLip.y,
      lowerLipY: lowerLip.y,
    });

    if (this.calibrating) this.updateCalibration(this.smoothMouthGap, now);
  }

  private updateCalibration(gap: number, now: number): void {
    const elapsed = now - this.calibStart;
    const progress = Math.min(1, elapsed / CALIBRATION_DURATION_MS);

    this.calibSamples.push(gap);

    this.calibCallback?.({
      phase: this.calibPhase,
      progress,
      closedValue: this.closedThreshold,
      openValue: this.openThreshold,
    });

    if (progress >= 1) {
      const avg = this.calibSamples.reduce((a, b) => a + b, 0) / this.calibSamples.length;

      if (this.calibPhase === 'closed') {
        this.closedThreshold = avg + 0.005;
        this.calibPhase = 'open';
        this.calibStart = now;
        this.calibSamples = [];
      } else if (this.calibPhase === 'open') {
        this.openThreshold = Math.max(avg * 0.85, this.closedThreshold + 0.01);
        this.calibPhase = 'done';
        this.calibrating = false;
        this.calibDoneCallback?.(this.closedThreshold, this.openThreshold);
      }
    }
  }

  isRunning(): boolean { return this.running; }
  getClosedThreshold(): number { return this.closedThreshold; }
  getOpenThreshold(): number { return this.openThreshold; }
}
