export type GamePhase = 'idle' | 'countdown' | 'play' | 'paused' | 'dead' | 'gameover';
export type Lane = -1 | 0 | 1;
export type Environment = 'neon-city' | 'jungle' | 'desert' | 'snow';
export type CharacterId = 'starter' | 'explorer' | 'robot' | 'ninja';
export type PowerUpType = 'magnet' | 'shield' | 'speed' | 'double-coins';
export type ObstacleType = 'cone' | 'crate' | 'barrier' | 'ball' | 'low-block' | 'high-arch';

export interface PlayerState {
  lane: Lane;
  targetLane: Lane;
  laneTransitionProgress: number;
  x: number; // pixel x (derived from lane)
  y: number; // 0 = ground, positive = above ground (in game units)
  isJumping: boolean;
  jumpVelocity: number;
  isSliding: boolean;
  slideDuration: number;
  hasShield: boolean;
  characterId: CharacterId;
}

export interface ObstacleEntity {
  id: string;
  type: ObstacleType;
  lane: Lane;
  z: number; // depth: 800=far, 0=player
  width: number;
  height: number; // visual height in game units
  requiresSlide: boolean; // true = player must slide to avoid
  requiresJump: boolean; // true = player must jump to avoid
  active: boolean;
}

export interface CoinEntity {
  id: string;
  lane: Lane;
  z: number;
  collected: boolean;
  active: boolean;
}

export interface PowerUpEntity {
  id: string;
  type: PowerUpType;
  lane: Lane;
  z: number;
  collected: boolean;
  active: boolean;
}

export interface Particle {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number; // 0-1 remaining
  maxLife: number;
  color: string;
  size: number;
  active: boolean;
}

export interface ActivePowerUps {
  magnet: number; // seconds remaining, 0=inactive
  shield: boolean;
  speed: number; // seconds remaining
  doubleCoins: number; // seconds remaining
}

export interface GameState {
  phase: GamePhase;
  score: number;
  coins: number;
  distance: number;
  speed: number; // units per second
  time: number; // elapsed seconds
  player: PlayerState;
  obstacles: ObstacleEntity[];
  coinEntities: CoinEntity[];
  powerUpEntities: PowerUpEntity[];
  particles: Particle[];
  activePowerUps: ActivePowerUps;
  environment: Environment;
  countdownValue: number; // 3,2,1,0="GO!"
  countdownTimer: number;
  difficulty: number; // 1-10 scale
  lastObstacleZ: Record<Lane, number>; // last spawned z per lane
  spawnTimers: {
    obstacle: number;
    coin: number;
    powerUp: number;
  };
  environmentDistance: number; // distance in current environment
  nextParticleId: number;
  nextEntityId: number;
  highScore: number;
  finalScore?: number;
}

export interface GestureInput {
  jump: boolean;
  slide: boolean;
  leanLeft: boolean;
  leanRight: boolean;
  timestamp: number;
}

export interface EnvironmentTheme {
  bgTop: string;
  bgBottom: string;
  roadColor: string;
  accentColor: string;
  fogColor: string;
  lineColor: string;
}

export interface CalibrationStatus {
  cameraReady: boolean;
  poseReady: boolean;
  handsReady: boolean;
  positionOk: boolean;
  stableFrames: number;
  isReady: boolean;
}
