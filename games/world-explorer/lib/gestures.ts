export type GestureType =
  | 'NONE'
  | 'OPEN_PALM'
  | 'POINTING'
  | 'PINCH'
  | 'THUMBS_UP'
  | 'WAVE'
  | 'THREE_FINGERS'
  | 'PEACE';

export interface GestureState {
  gesture: GestureType;
  cursorX: number; // 0-1 normalized, already mirrored
  cursorY: number; // 0-1 normalized
  confidence: number;
  pinchStrength: number; // 0-1
  handPresent: boolean;
}

interface Landmark {
  x: number;
  y: number;
  z: number;
}

function dist(a: Landmark, b: Landmark): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

function isFingerExtended(tip: Landmark, pip: Landmark, mcp: Landmark): boolean {
  // Finger is extended if tip is further from wrist than pip (using y axis, top = 0)
  return tip.y < pip.y && pip.y < mcp.y + 0.02;
}

export function detectGesture(landmarks: Landmark[]): GestureState {
  if (!landmarks || landmarks.length < 21) {
    return { gesture: 'NONE', cursorX: 0.5, cursorY: 0.5, confidence: 0, pinchStrength: 0, handPresent: false };
  }

  const wrist = landmarks[0];
  const thumbTip = landmarks[4];
  const thumbIP = landmarks[3];
  const thumbMCP = landmarks[2];

  const indexTip = landmarks[8];
  const indexDIP = landmarks[7];
  const indexPIP = landmarks[6];
  const indexMCP = landmarks[5];

  const middleTip = landmarks[12];
  const middlePIP = landmarks[10];
  const middleMCP = landmarks[9];

  const ringTip = landmarks[16];
  const ringPIP = landmarks[14];
  const ringMCP = landmarks[13];

  const pinkyTip = landmarks[20];
  const pinkyPIP = landmarks[18];
  const pinkyMCP = landmarks[17];

  // Mirror X for selfie view
  const mirrorX = (v: number) => 1 - v;

  // Cursor follows index tip (mirrored)
  const cursorX = mirrorX(indexTip.x);
  const cursorY = indexTip.y;

  // Finger extension checks
  const indexExt = isFingerExtended(indexTip, indexPIP, indexMCP);
  const middleExt = isFingerExtended(middleTip, middlePIP, middleMCP);
  const ringExt = isFingerExtended(ringTip, ringPIP, ringMCP);
  const pinkyExt = isFingerExtended(pinkyTip, pinkyPIP, pinkyMCP);

  // Thumb extension (different axis)
  const thumbExt = dist(thumbTip, wrist) > dist(thumbMCP, wrist) + 0.05;

  // Pinch: thumb tip close to index tip
  const pinchDist = dist(thumbTip, indexTip);
  const pinchStrength = Math.max(0, 1 - pinchDist / 0.1);
  const isPinching = pinchDist < 0.06;

  // Count extended fingers (not thumb)
  const extendedCount = [indexExt, middleExt, ringExt, pinkyExt].filter(Boolean).length;

  let gesture: GestureType = 'NONE';

  if (isPinching && !middleExt && !ringExt && !pinkyExt) {
    gesture = 'PINCH';
  } else if (indexExt && middleExt && !ringExt && !pinkyExt && !isPinching) {
    gesture = 'PEACE';
  } else if (extendedCount === 3 && indexExt && middleExt && ringExt) {
    gesture = 'THREE_FINGERS';
  } else if (indexExt && !middleExt && !ringExt && !pinkyExt && !isPinching) {
    gesture = 'POINTING';
  } else if (extendedCount >= 4) {
    gesture = 'OPEN_PALM';
  } else if (thumbExt && !indexExt && !middleExt && !ringExt && !pinkyExt) {
    gesture = 'THUMBS_UP';
  }

  return {
    gesture,
    cursorX,
    cursorY,
    confidence: 1,
    pinchStrength,
    handPresent: true,
  };
}

// Wave detection: tracks velocity of wrist over recent frames
export class WaveDetector {
  private history: number[] = [];
  private readonly windowSize = 15;
  private lastDirection: 'left' | 'right' | null = null;
  private directionChanges = 0;
  private resetTimer: ReturnType<typeof setTimeout> | null = null;

  update(wristX: number): boolean {
    this.history.push(wristX);
    if (this.history.length > this.windowSize) {
      this.history.shift();
    }

    if (this.history.length < 6) return false;

    const recent = this.history.slice(-6);
    const velocity = recent[5] - recent[0];
    const absVel = Math.abs(velocity);

    if (absVel > 0.04) {
      const dir = velocity > 0 ? 'right' : 'left';
      if (this.lastDirection && dir !== this.lastDirection) {
        this.directionChanges++;
        if (this.resetTimer) clearTimeout(this.resetTimer);
        this.resetTimer = setTimeout(() => {
          this.directionChanges = 0;
          this.lastDirection = null;
        }, 1200);
      }
      this.lastDirection = dir;
    }

    if (this.directionChanges >= 2) {
      this.directionChanges = 0;
      this.lastDirection = null;
      return true;
    }
    return false;
  }

  reset() {
    this.history = [];
    this.lastDirection = null;
    this.directionChanges = 0;
  }
}

// Dwell tracker for hover-based selection
export class DwellTracker {
  private activeTarget: string | null = null;
  private dwellStart: number = 0;
  private readonly dwellDuration: number;

  constructor(durationMs = 1400) {
    this.dwellDuration = durationMs;
  }

  update(targetId: string | null): { completed: boolean; progress: number; targetId: string | null } {
    const now = Date.now();

    if (targetId === null) {
      this.activeTarget = null;
      return { completed: false, progress: 0, targetId: null };
    }

    if (targetId !== this.activeTarget) {
      this.activeTarget = targetId;
      this.dwellStart = now;
      return { completed: false, progress: 0, targetId };
    }

    const elapsed = now - this.dwellStart;
    const progress = Math.min(1, elapsed / this.dwellDuration);
    const completed = progress >= 1;

    if (completed) {
      this.activeTarget = null;
    }

    return { completed, progress, targetId };
  }

  reset() {
    this.activeTarget = null;
    this.dwellStart = 0;
  }
}
