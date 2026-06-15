import type { SpawnWeights } from '../game/types';

// ─── Timing ────────────────────────────────────────────────────────────────

export const DURATION_CLASSIC = 60;   // seconds
export const DURATION_PARTY   = 90;   // seconds
export const COUNTDOWN_BEATS  = [3, 2, 1];

// ─── Difficulty thresholds (seconds elapsed in game) ──────────────────────

export const DIFFICULTY_MEDIUM_AT = 30;  // seconds
export const DIFFICULTY_HARD_AT   = 60;  // seconds

// ─── Balloon sizes (as fraction of canvas height) ─────────────────────────

export const BALLOON_MIN_RADIUS = 0.045;  // × canvasH
export const BALLOON_MAX_RADIUS = 0.07;

/** Hitbox multiplier: bigger = easier to pop (accessibility) */
export const HITBOX_MULTIPLIER = 1.45;

// ─── Spawn rates (ms between spawns per difficulty) ───────────────────────

export const SPAWN_RATE: Record<string, number> = {
  easy:   1600,
  medium: 1050,
  hard:   680,
};

// ─── Balloon speeds (canvas heights per second) ───────────────────────────

export const BALLOON_SPEED: Record<string, number> = {
  easy:   0.10,
  medium: 0.155,
  hard:   0.22,
};

// ─── Balloon type spawn weights per difficulty ────────────────────────────

export const SPAWN_WEIGHTS: Record<string, SpawnWeights> = {
  easy: {
    regular: 80,
    golden:  10,
    bomb:     5,
    freeze:   3,
    rainbow:  2,
  },
  medium: {
    regular: 64,
    golden:  13,
    bomb:    13,
    freeze:   6,
    rainbow:  4,
  },
  hard: {
    regular: 53,
    golden:  12,
    bomb:    19,
    freeze:   9,
    rainbow:  7,
  },
};

// ─── Points ───────────────────────────────────────────────────────────────

export const POINTS: Record<string, number> = {
  regular:  1,
  golden:   5,
  bomb:    -3,
  freeze:   0,
  rainbow:  0,
};

// ─── Power-up durations ───────────────────────────────────────────────────

export const FREEZE_DURATION          = 5000;  // ms
export const FREEZE_SPEED_MULTIPLIER  = 0.45;
export const COMBO_DURATION           = 10_000; // ms
export const COMBO_MULTIPLIER         = 2;

// ─── Wobble ───────────────────────────────────────────────────────────────

export const WOBBLE_AMOUNT = 18;   // px
export const WOBBLE_SPEED  = 0.9;  // rad/s

// ─── Cursors ──────────────────────────────────────────────────────────────

export const CURSOR_SMOOTHING = 0.72; // lerp factor: 0 = no smooth, 1 = frozen
export const CURSOR_RADIUS    = 22;   // px

// ─── Screen shake ─────────────────────────────────────────────────────────

export const SHAKE_DURATION  = 450;  // ms
export const SHAKE_INTENSITY = 9;    // px

// ─── Pop animation ────────────────────────────────────────────────────────

export const POP_DURATION = 350;  // ms — balloon stays visible while animating
export const PARTICLE_COUNT: Record<string, number> = {
  pop:         12,
  goldPop:     20,
  explosion:   18,
  iceShatter:  14,
  rainbowBurst: 24,
  confetti:    30,
};

// ─── Balloon colors (regular) ─────────────────────────────────────────────

export const BALLOON_COLORS = [
  '#FF6B6B', // coral red
  '#4ECDC4', // teal
  '#45B7D1', // sky blue
  '#96CEB4', // mint
  '#FFEAA7', // warm yellow
  '#DDA0DD', // plum
  '#FF8A80', // salmon
  '#A8E063', // lime
  '#F7DC6F', // gold-ish
  '#85C1E9', // steel blue
  '#F0B27A', // peach
  '#BB8FCE', // lavender
];

// ─── Player colors ────────────────────────────────────────────────────────

export const PLAYER_COLORS: Record<number, string> = {
  1: '#00D2FF', // cyan-blue
  2: '#FF6B35', // orange
};

export const PLAYER_NAMES: Record<number, string> = {
  1: 'Player 1',
  2: 'Player 2',
};
