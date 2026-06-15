import type { DifficultyLevel, DifficultyParams } from './types';
import {
  DIFFICULTY_MEDIUM_AT,
  DIFFICULTY_HARD_AT,
  SPAWN_RATE,
  BALLOON_SPEED,
  SPAWN_WEIGHTS,
} from '../constants/gameConfig';

/** Returns the difficulty level based on elapsed game time (seconds) */
export function getDifficultyLevel(elapsedSeconds: number): DifficultyLevel {
  if (elapsedSeconds >= DIFFICULTY_HARD_AT) return 'hard';
  if (elapsedSeconds >= DIFFICULTY_MEDIUM_AT) return 'medium';
  return 'easy';
}

/** Returns interpolated difficulty parameters for smooth progression */
export function getDifficultyParams(
  elapsedSeconds: number,
  canvasHeight: number,
): DifficultyParams {
  const level = getDifficultyLevel(elapsedSeconds);

  // Within a phase, smoothly interpolate toward the next phase
  let t = 0;
  if (level === 'easy') {
    t = elapsedSeconds / DIFFICULTY_MEDIUM_AT;
  } else if (level === 'medium') {
    t = (elapsedSeconds - DIFFICULTY_MEDIUM_AT) / (DIFFICULTY_HARD_AT - DIFFICULTY_MEDIUM_AT);
  } else {
    // In hard mode, keep increasing slightly past 60s
    t = Math.min(1, (elapsedSeconds - DIFFICULTY_HARD_AT) / 60);
  }

  const nextLevel: DifficultyLevel = level === 'easy' ? 'medium' : level === 'medium' ? 'hard' : 'hard';

  const spawnRate = lerp(SPAWN_RATE[level], SPAWN_RATE[nextLevel], t);
  const speedFraction = lerp(BALLOON_SPEED[level], BALLOON_SPEED[nextLevel], t);
  const speed = speedFraction * canvasHeight; // convert to px/s

  // Interpolate weights
  const wA = SPAWN_WEIGHTS[level];
  const wB = SPAWN_WEIGHTS[nextLevel];
  const weights = {
    regular: lerp(wA.regular, wB.regular, t),
    golden:  lerp(wA.golden,  wB.golden,  t),
    bomb:    lerp(wA.bomb,    wB.bomb,    t),
    freeze:  lerp(wA.freeze,  wB.freeze,  t),
    rainbow: lerp(wA.rainbow, wB.rainbow, t),
  };

  return { spawnRate, speed, weights };
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * Math.max(0, Math.min(1, t));
}
