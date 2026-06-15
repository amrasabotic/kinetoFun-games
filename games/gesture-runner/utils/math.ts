/** Clamp value between min and max */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/** Linear interpolation */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * clamp(t, 0, 1);
}

/** Random float in [min, max) */
export function rnd(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

/** Random integer in [min, max] */
export function rndInt(min: number, max: number): number {
  return Math.floor(rnd(min, max + 1));
}

/** Random choice from array */
export function rndChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Ease in-out cubic */
export function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

/** Map value from one range to another */
export function mapRange(
  value: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number
): number {
  return outMin + ((value - inMin) / (inMax - inMin)) * (outMax - outMin);
}
