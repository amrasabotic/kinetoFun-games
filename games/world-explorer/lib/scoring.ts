export interface ScoreEvent {
  basePoints: number;
  streakMultiplier: number;
  fastBonus: number;
  total: number;
}

export function getStreakMultiplier(streak: number): number {
  if (streak >= 8) return 4;
  if (streak >= 5) return 3;
  if (streak >= 3) return 2;
  return 1;
}

export function calculateScore(
  isCorrect: boolean,
  streak: number,
  timeRemainingMs: number,
  totalTimeMs: number
): ScoreEvent {
  if (!isCorrect) {
    return { basePoints: 0, streakMultiplier: 1, fastBonus: 0, total: 0 };
  }

  const base = 10;
  const multiplier = getStreakMultiplier(streak);
  const timeFraction = timeRemainingMs / totalTimeMs;
  const fastBonus = timeFraction > 0.5 ? 5 : 0;
  const total = (base + fastBonus) * multiplier;

  return {
    basePoints: base,
    streakMultiplier: multiplier,
    fastBonus,
    total,
  };
}

export function saveHighScore(mode: string, score: number): void {
  try {
    const key = `worldexplorer_hs_${mode}`;
    const current = parseInt(localStorage.getItem(key) ?? '0', 10);
    if (score > current) {
      localStorage.setItem(key, score.toString());
    }
  } catch {}
}

export function getHighScore(mode: string): number {
  try {
    return parseInt(localStorage.getItem(`worldexplorer_hs_${mode}`) ?? '0', 10);
  } catch {
    return 0;
  }
}

export function saveProgress(questionsAnswered: number, correctAnswers: number): void {
  try {
    const data = { questionsAnswered, correctAnswers, date: Date.now() };
    localStorage.setItem('worldexplorer_progress', JSON.stringify(data));
  } catch {}
}
