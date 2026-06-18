const KEY = 'dino_runner_high_score';

export function getHighScore(): number {
  if (typeof window === 'undefined') return 0;
  const v = localStorage.getItem(KEY);
  if (!v) return 0;
  const n = parseInt(v, 10);
  return isNaN(n) ? 0 : n;
}

export function saveHighScore(score: number): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(KEY, Math.floor(score).toString());
}
