// ─── Core game types ───────────────────────────────────────────────────────

export type BalloonType = 'regular' | 'golden' | 'bomb' | 'freeze' | 'rainbow';
export type GameMode = 'classic' | 'endless' | 'party';
export type GamePhase =
  | 'menu'
  | 'modeSelect'
  | 'settings'
  | 'countdown'
  | 'playing'
  | 'paused'
  | 'end';
export type DifficultyLevel = 'easy' | 'medium' | 'hard';
export type PlayerID = 1 | 2;

// ─── Balloon ───────────────────────────────────────────────────────────────

export interface Balloon {
  id: string;
  x: number;
  y: number;
  radius: number;
  /** Slightly larger than radius for forgiving touch targets */
  hitboxRadius: number;
  type: BalloonType;
  color: string;
  baseSpeed: number;       // px/s at normal speed
  wobblePhase: number;     // current radian angle for horizontal sway
  wobbleSpeed: number;     // rad/s
  wobbleAmount: number;    // horizontal amplitude in px
  opacity: number;
  popped: boolean;
  popTime: number | null;  // performance.now() when popped
  spawnTime: number;
  poppedByPlayer: PlayerID | null;
}

// ─── Hand tracking ─────────────────────────────────────────────────────────

export interface HandCursor {
  x: number;
  y: number;
  playerId: PlayerID;
  active: boolean;
  prevX: number;
  prevY: number;
}

// ─── Visual effects ────────────────────────────────────────────────────────

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  opacity: number;
  rotation: number;
  rotationSpeed: number;
  gravity: number;
  shrink: number;  // size multiplied each frame
}

export type EffectType =
  | 'pop'
  | 'goldPop'
  | 'explosion'
  | 'iceShatter'
  | 'rainbowBurst'
  | 'confetti';

export interface Effect {
  id: string;
  type: EffectType;
  x: number;
  y: number;
  startTime: number;
  duration: number;
  particles: Particle[];
  color: string;
  radius: number;
  done: boolean;
}

// ─── Power-ups ─────────────────────────────────────────────────────────────

export interface PowerUpState {
  freezeActive: boolean;
  freezeEndTime: number;
  comboActive: boolean;
  comboEndTime: number;
}

// ─── Scoring ───────────────────────────────────────────────────────────────

export interface Scores {
  p1: number;
  p2: number;
}

// ─── Game configuration ────────────────────────────────────────────────────

export interface GameConfig {
  mode: GameMode;
  playerCount: 1 | 2;
  duration: number | null; // null = endless
}

// ─── Difficulty ────────────────────────────────────────────────────────────

export interface SpawnWeights {
  regular: number;
  golden: number;
  bomb: number;
  freeze: number;
  rainbow: number;
}

export interface DifficultyParams {
  spawnRate: number;    // ms between balloon spawns
  speed: number;        // base px/s
  weights: SpawnWeights;
}

// ─── Persistence ───────────────────────────────────────────────────────────

export interface HighScoreEntry {
  score: number;
  date: string;
}

export interface HighScores {
  classic: HighScoreEntry | null;
  endless: HighScoreEntry | null;
  party: HighScoreEntry | null;
}

export interface Settings {
  soundEnabled: boolean;
  musicEnabled: boolean;
}

// ─── Rendering snapshot ────────────────────────────────────────────────────

export interface RenderState {
  balloons: Balloon[];
  effects: Effect[];
  handCursors: HandCursor[];
  powerUps: PowerUpState;
  screenShakeOffset: { x: number; y: number };
  comboMultiplier: number;
  gamePhase: GamePhase;
}

// ─── MediaPipe (CDN globals) ────────────────────────────────────────────────

export interface MPLandmark {
  x: number; // normalized 0–1
  y: number; // normalized 0–1
  z: number;
}

export interface MPHandsResults {
  multiHandLandmarks: MPLandmark[][];
  multiHandedness: Array<{ label: 'Left' | 'Right'; score: number }>;
}
