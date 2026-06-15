import type { Balloon, BalloonType, DifficultyParams } from './types';
import {
  BALLOON_MIN_RADIUS,
  BALLOON_MAX_RADIUS,
  HITBOX_MULTIPLIER,
  WOBBLE_AMOUNT,
  WOBBLE_SPEED,
  BALLOON_COLORS,
} from '../constants/gameConfig';
import { randomBetween, weightedRandom, uid } from '../utils/mathUtils';

const BALLOON_COLORS_BY_TYPE: Partial<Record<BalloonType, string>> = {
  golden:  '#FFD700',
  bomb:    '#1a1a1a',
  freeze:  '#90D5FF',
  rainbow: '#FF69B4', // base color; shader overrides
};

export function createBalloon(
  canvasWidth: number,
  canvasHeight: number,
  difficultyParams: DifficultyParams,
  now: number,
): Balloon {
  const type = weightedRandom<BalloonType>(difficultyParams.weights as Record<BalloonType, number>);

  const radius = randomBetween(
    BALLOON_MIN_RADIUS * canvasHeight,
    BALLOON_MAX_RADIUS * canvasHeight,
  );

  // Spawn at a random x, just below the bottom of the screen
  const margin = radius * 2;
  const x = randomBetween(margin, canvasWidth - margin);
  const y = canvasHeight + radius * 2;

  const color = BALLOON_COLORS_BY_TYPE[type] ?? randomColor();

  // Vary speed slightly per balloon for natural feel
  const speedVariance = randomBetween(0.85, 1.15);
  const baseSpeed = difficultyParams.speed * speedVariance;

  return {
    id: uid(),
    x,
    y,
    radius,
    hitboxRadius: radius * HITBOX_MULTIPLIER,
    type,
    color,
    baseSpeed,
    wobblePhase: randomBetween(0, Math.PI * 2),
    wobbleSpeed: WOBBLE_SPEED * randomBetween(0.8, 1.2),
    wobbleAmount: WOBBLE_AMOUNT * randomBetween(0.7, 1.3),
    opacity: 1,
    popped: false,
    popTime: null,
    spawnTime: now,
    poppedByPlayer: null,
  };
}

function randomColor(): string {
  return BALLOON_COLORS[Math.floor(Math.random() * BALLOON_COLORS.length)];
}
