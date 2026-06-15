import type { DetectedGesture, HandPosition, GameSettings } from '../types/gestures';

// PoseLandmark indices
const NOSE = 0;
const L_SHOULDER = 11;
const R_SHOULDER = 12;
const L_WRIST = 15;
const R_WRIST = 16;
const L_HIP = 23;
const R_HIP = 24;

// Sensitivity maps: maps sensitivity 1-5 to threshold modifier
// Higher sensitivity = smaller threshold needed = easier to trigger
function sensitivityToThreshold(base: number, sensitivity: number): number {
  const factors = [1.6, 1.3, 1.0, 0.75, 0.55];
  return base * (factors[Math.min(4, Math.max(0, sensitivity - 1))]);
}

function sensitivityToCooldown(base: number, sensitivity: number): number {
  const factors = [1.2, 1.1, 1.0, 0.9, 0.8];
  return base * factors[Math.min(4, Math.max(0, sensitivity - 1))];
}

export class GestureAnalyzer {
  private jumpDebounce = 0;
  private slideDebounce = 0;
  private leanDebounce = 0;
  private lastLane = 0;

  analyzePose(
    landmarks: PoseLandmark[],
    settings: GameSettings
  ): DetectedGesture {
    const now = Date.now();
    const result: DetectedGesture = { jump: false, slide: false, leanLeft: false, leanRight: false };

    if (!landmarks || landmarks.length < 25) return result;

    const lShoulder = landmarks[L_SHOULDER];
    const rShoulder = landmarks[R_SHOULDER];
    const lWrist = landmarks[L_WRIST];
    const rWrist = landmarks[R_WRIST];
    const nose = landmarks[NOSE];
    const lHip = landmarks[L_HIP];
    const rHip = landmarks[R_HIP];

    // Visibility checks
    const poseVisible =
      (lShoulder.visibility ?? 0) > 0.5 &&
      (rShoulder.visibility ?? 0) > 0.5;

    if (!poseVisible) return result;

    // ---- JUMP: both wrists Y < shoulders Y ----
    const shoulderAvgY = (lShoulder.y + rShoulder.y) / 2;
    const jumpThreshold = sensitivityToThreshold(0.08, settings.jumpSensitivity);
    const jumpCooldown = sensitivityToCooldown(500, settings.jumpSensitivity);
    const lwVis = (lWrist.visibility ?? 0) > 0.4;
    const rwVis = (rWrist.visibility ?? 0) > 0.4;

    if (
      lwVis && rwVis &&
      lWrist.y < shoulderAvgY - jumpThreshold &&
      rWrist.y < shoulderAvgY - jumpThreshold &&
      now - this.jumpDebounce > jumpCooldown
    ) {
      result.jump = true;
      this.jumpDebounce = now;
    }

    // ---- SLIDE: nose Y > threshold (head dropped / crouching) ----
    const slideThreshold = sensitivityToThreshold(0.72, settings.slideSensitivity);
    const slideCooldown = sensitivityToCooldown(300, settings.slideSensitivity);
    if (
      (nose.visibility ?? 0) > 0.5 &&
      nose.y > slideThreshold &&
      now - this.slideDebounce > slideCooldown
    ) {
      result.slide = true;
      this.slideDebounce = now;
    }

    // ---- LEAN: hip center X ----
    const hipX = (lHip.x + rHip.x) / 2;
    const leanThreshold = sensitivityToThreshold(0.09, settings.leanSensitivity);
    const leanCooldown = sensitivityToCooldown(600, settings.leanSensitivity);

    if (now - this.leanDebounce > leanCooldown) {
      // Note: MediaPipe X=0 is camera-left
      // When user leans to their right → hip X decreases → move right
      // When user leans to their left → hip X increases → move left
      if (hipX > 0.5 + leanThreshold && this.lastLane !== -1) {
        result.leanLeft = true;
        this.lastLane = -1;
        this.leanDebounce = now;
      } else if (hipX < 0.5 - leanThreshold && this.lastLane !== 1) {
        result.leanRight = true;
        this.lastLane = 1;
        this.leanDebounce = now;
      } else if (Math.abs(hipX - 0.5) < leanThreshold * 0.5) {
        // Returned to center
        this.lastLane = 0;
      }
    }

    return result;
  }

  analyzeHands(
    handLandmarks: HandLandmark[][],
    handedness: Array<{ label: string; score: number; index: number }>
  ): HandPosition[] {
    if (!handLandmarks || handLandmarks.length === 0) return [];

    return handLandmarks.map((lms, i) => {
      if (!lms || lms.length < 21) {
        return { x: 0, y: 0, visible: false, isPinching: false, isPointing: false };
      }

      // Mirror X for natural feel
      const wrist = lms[0];
      const x = 1 - wrist.x;
      const y = wrist.y;

      // Pinch: thumb tip (4) and index tip (8) close together
      const thumbTip = lms[4];
      const indexTip = lms[8];
      const pinchDist = Math.hypot(
        (1 - thumbTip.x) - (1 - indexTip.x),
        thumbTip.y - indexTip.y
      );
      const isPinching = pinchDist < 0.06;

      // Pointing: index finger extended, others curled
      const indexMCP = lms[5];
      const indexPIP = lms[6];
      const middleTip = lms[12];
      const indexExtended = indexTip.y < indexMCP.y;
      const middleCurled = middleTip.y > indexPIP.y;
      const isPointing = indexExtended && middleCurled;

      return { x, y, visible: true, isPinching, isPointing };
    });
  }

  reset(): void {
    this.jumpDebounce = 0;
    this.slideDebounce = 0;
    this.leanDebounce = 0;
    this.lastLane = 0;
  }
}
