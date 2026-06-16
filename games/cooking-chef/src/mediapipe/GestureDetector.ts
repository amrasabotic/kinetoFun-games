import type { HandData, NormalizedLandmark } from '@/types';

export function detectPinch(lm: NormalizedLandmark[]): boolean {
  return Math.hypot(lm[4].x - lm[8].x, lm[4].y - lm[8].y) < 0.08;
}

export function detectPalm(lm: NormalizedLandmark[]): boolean {
  let ext = 0;
  const pairs: [number, number][] = [[8, 6], [12, 10], [16, 14], [20, 18]];
  pairs.forEach(([t, b]) => { if (lm[t].y < lm[b].y) ext++; });
  return ext >= 3;
}

export function detectFist(lm: NormalizedLandmark[]): boolean {
  let cl = 0;
  const pairs: [number, number][] = [[8, 6], [12, 10], [16, 14], [20, 18]];
  pairs.forEach(([t, b]) => { if (lm[t].y > lm[b].y + 0.02) cl++; });
  return cl >= 3;
}

export function detectThumbsUp(lm: NormalizedLandmark[]): boolean {
  const thumbHigh = lm[4].y < lm[3].y && lm[4].y < lm[0].y - 0.08;
  let fingersClosed = 0;
  const pairs: [number, number][] = [[8, 6], [12, 10], [16, 14], [20, 18]];
  pairs.forEach(([t, b]) => { if (lm[t].y > lm[b].y - 0.01) fingersClosed++; });
  return thumbHigh && fingersClosed >= 3;
}

export function detectChopDown(h: HandData): boolean {
  return h.vy > 9 && h.hist.length > 3;
}

export function detectSwipeUp(h: HandData): boolean {
  return h.vy < -11;
}

export function detectSwipeLeft(h: HandData): boolean {
  return h.vx < -11 && Math.abs(h.vx) > Math.abs(h.vy) * 1.2;
}

export function detectSwipeRight(h: HandData): boolean {
  return h.vx > 11 && Math.abs(h.vx) > Math.abs(h.vy) * 1.2;
}

/** Returns cross-product of consecutive velocity vectors — positive = CCW, negative = CW */
export function stirValue(h: HandData): number {
  if (h.hist.length < 4) return 0;
  const n = h.hist.length;
  const v1x = h.hist[n - 2].x - h.hist[n - 3].x;
  const v1y = h.hist[n - 2].y - h.hist[n - 3].y;
  const v2x = h.hist[n - 1].x - h.hist[n - 2].x;
  const v2y = h.hist[n - 1].y - h.hist[n - 2].y;
  const spd = Math.hypot(v2x, v2y);
  if (spd < 1.5) return 0;
  return v1x * v2y - v1y * v2x;
}

/** True when both hands are pinching and moving toward each other */
export function detectTwoHandFold(h0: HandData, h1: HandData): boolean {
  if (!h0.visible || !h1.visible) return false;
  return h0.pinch && h1.pinch && h0.vx > 4 && h1.vx < -4;
}
