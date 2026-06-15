/** Linear interpolation */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Random float in [min, max) */
export function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

/** Random integer in [min, max] */
export function randomInt(min: number, max: number): number {
  return Math.floor(randomBetween(min, max + 1));
}

/** Pick a random element from an array */
export function randomPick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Clamp value between min and max */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/** Distance between two points */
export function distance(x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}

/** Weighted random selection — weights is an object of key → weight number */
export function weightedRandom<T extends string>(weights: Record<T, number>): T {
  const keys = Object.keys(weights) as T[];
  const total = keys.reduce((sum, k) => sum + weights[k], 0);
  let rand = Math.random() * total;
  for (const key of keys) {
    rand -= weights[key];
    if (rand <= 0) return key;
  }
  return keys[keys.length - 1];
}

/** Darken a hex color by a given factor (0–1) */
export function darkenHex(hex: string, factor: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgb(${Math.round(r * factor)}, ${Math.round(g * factor)}, ${Math.round(b * factor)})`;
}

/** Unique ID generator */
let _uidCounter = 0;
export function uid(): string {
  return `${Date.now()}-${++_uidCounter}`;
}

/** Format seconds as MM:SS */
export function formatTime(seconds: number): string {
  const s = Math.max(0, Math.ceil(seconds));
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m}:${rem.toString().padStart(2, '0')}`;
}
