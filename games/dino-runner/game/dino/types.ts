export type GamePhase = 'idle' | 'running' | 'gameover';
export type PlayerState = 'running' | 'jumping' | 'ducking';
export type GestureState = 'jump' | 'duck' | 'none';
export type ObstacleType = 'cactus-small' | 'cactus-medium' | 'cactus-large' | 'bird';

export interface Player {
  x: number;
  y: number;
  width: number;
  height: number;
  velocityY: number;
  state: PlayerState;
  onGround: boolean;
  animFrame: number;
  animTimer: number;
  bounceOffset: number;
  bounceVelocity: number;
}

export interface Obstacle {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  type: ObstacleType;
  animFrame: number;
  animTimer: number;
}

export interface Cloud {
  id: number;
  x: number;
  y: number;
  width: number;
}

export interface GameState {
  phase: GamePhase;
  score: number;
  highScore: number;
  speed: number;
  player: Player;
  obstacles: Obstacle[];
  clouds: Cloud[];
  frameCount: number;
  nextObstacleIn: number;
  nextCloudIn: number;
  milestoneFlash: number;
  isNight: boolean;
  nextNightAt: number;
  obstacleIdCounter: number;
  cloudIdCounter: number;
}
