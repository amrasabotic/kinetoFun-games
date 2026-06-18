'use client';

// Landmark indices
const THUMB_TIP   = 4;
const THUMB_IP    = 3;
const THUMB_MCP   = 2;
const INDEX_TIP   = 8;
const INDEX_PIP   = 6;
const MIDDLE_TIP  = 12;
const MIDDLE_PIP  = 10;
const RING_TIP    = 16;
const RING_PIP    = 14;
const PINKY_TIP   = 20;
const PINKY_PIP   = 18;
const PALM_BASE   = 9; // middle finger MCP — good palm center proxy

const PINCH_THRESHOLD = 0.065; // normalized distance; tune if too sensitive
const SMOOTHING       = 0.38;

export function createGestureState() {
  return {
    gesture: 'none', // 'none' | 'open' | 'pinch' | 'fist'
    x:        0,
    y:        0,
    smoothX:  0,
    smoothY:  0,
  };
}

/**
 * Converts raw MediaPipe landmark sets into a gesture + smoothed cursor position.
 *
 * @param {Array|null} landmarkSets  - results.multiHandLandmarks (may be null/empty)
 * @param {object}     prev          - previous gesture state from createGestureState()
 * @param {number}     canvasW
 * @param {number}     canvasH
 * @returns {object} new gesture state
 */
export function processLandmarks(landmarkSets, prev, canvasW, canvasH) {
  if (!landmarkSets || landmarkSets.length === 0) {
    return { ...prev, gesture: 'none' };
  }

  const lm = landmarkSets[0];

  const thumbTip  = lm[THUMB_TIP];
  const indexTip  = lm[INDEX_TIP];
  const middleTip = lm[MIDDLE_TIP];
  const ringTip   = lm[RING_TIP];
  const pinkyTip  = lm[PINKY_TIP];
  const palmBase  = lm[PALM_BASE];

  // Cursor follows index tip; mirror X so it matches natural hand movement
  const rawX = (1 - indexTip.x) * canvasW;
  const rawY = indexTip.y * canvasH;

  // Exponential moving average for jitter reduction
  const smoothX = prev.smoothX + SMOOTHING * (rawX - prev.smoothX);
  const smoothY = prev.smoothY + SMOOTHING * (rawY - prev.smoothY);

  // Pinch: thumb-tip to index-tip distance (normalized 0..1)
  const pdx = thumbTip.x - indexTip.x;
  const pdy = thumbTip.y - indexTip.y;
  const pinchDist = Math.sqrt(pdx * pdx + pdy * pdy);

  // Fist: average distance of all fingertips from palm base
  const tips = [indexTip, middleTip, ringTip, pinkyTip];
  const avgTipDist = tips.reduce((sum, t) => {
    const dx = t.x - palmBase.x;
    const dy = t.y - palmBase.y;
    return sum + Math.sqrt(dx * dx + dy * dy);
  }, 0) / tips.length;

  let gesture;
  if (detectThumbsUp(lm)) {
    gesture = 'thumbsup';
  } else if (avgTipDist < 0.11) {
    gesture = 'fist';
  } else if (pinchDist < PINCH_THRESHOLD) {
    gesture = 'pinch';
  } else {
    gesture = 'open';
  }

  return { gesture, x: rawX, y: rawY, smoothX, smoothY };
}

/**
 * Thumbs-up: thumb extended upward, all four fingers curled inward.
 * Y increases downward in normalized landmark space.
 */
function detectThumbsUp(lm) {
  // Thumb pointing up: tip → IP → MCP each strictly higher (smaller Y)
  const thumbUp =
    lm[THUMB_TIP].y < lm[THUMB_IP].y &&
    lm[THUMB_IP].y  < lm[THUMB_MCP].y;

  // All four fingers curled: fingertip Y > PIP Y (tip lower than knuckle)
  const indexCurled  = lm[INDEX_TIP].y  > lm[INDEX_PIP].y;
  const middleCurled = lm[MIDDLE_TIP].y > lm[MIDDLE_PIP].y;
  const ringCurled   = lm[RING_TIP].y   > lm[RING_PIP].y;
  const pinkyCurled  = lm[PINKY_TIP].y  > lm[PINKY_PIP].y;

  return thumbUp && indexCurled && middleCurled && ringCurled && pinkyCurled;
}
