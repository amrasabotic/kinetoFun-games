export type GameScreen =
  | 'loading'
  | 'calibrate'
  | 'menu'
  | 'world-map'
  | 'daily'
  | 'party-setup'
  | 'howto'
  | 'settings'
  | 'achievements'
  | 'leaderboard'
  | 'countdown'
  | 'play'
  | 'transition'
  | 'results'
  | 'boss-intro';

export type GameMode = 'story' | 'endless' | 'daily' | 'party';

export type MinigameId =
  | 'veg-chop'
  | 'stir-soup'
  | 'flip-pancake'
  | 'decorate-cake'
  | 'burger-stack'
  | 'pizza-master'
  | 'sushi-roller'
  | 'ice-cream'
  | 'smoothie-frenzy'
  | 'bbq-grill'
  | 'dumpling-dash'
  | 'ultimate-showdown';

export type AchievementId =
  | 'slice-master'
  | 'soup-legend'
  | 'pancake-pro'
  | 'cake-artist'
  | 'combo-king'
  | 'no-miss-champion'
  | 'speed-chef'
  | 'ultimate-chef'
  | 'daily-streak-7'
  | 'party-winner';

export interface NormalizedLandmark {
  x: number;
  y: number;
  z: number;
}

export interface HandData {
  x: number;       // screen px, smoothed
  y: number;       // screen px, smoothed
  vx: number;      // velocity px/frame
  vy: number;      // velocity px/frame
  visible: boolean;
  lm: NormalizedLandmark[] | null;
  hist: Array<{ x: number; y: number; t: number }>;
  pinch: boolean;
  lastPinch: boolean;
  palm: boolean;
  fist: boolean;
  thumbUp: boolean;
}

export interface MinigameResult {
  score: number;
  maxScore: number;
  stars: 0 | 1 | 2 | 3;
  perfectCount: number;
  combo: number;
}

export interface GameSession {
  mode: GameMode;
  totalScore: number;
  stars: number;
  maxCombo: number;
  minigameResults: MinigameResult[];
  completedAt: string;
}

export type GameAction =
  | { type: 'MP_READY' }
  | { type: 'CALIBRATION_DONE' }
  | { type: 'START_GAME'; mode: GameMode; sequence: MinigameId[] }
  | { type: 'MINIGAME_COMPLETE'; result: MinigameResult }
  | { type: 'TRANSITION_DONE' }
  | { type: 'SESSION_COMPLETE'; session: GameSession }
  | { type: 'NAVIGATE'; screen: GameScreen }
  | { type: 'PARTY_NEXT_PLAYER' }
  | { type: 'PARTY_PLAYER_DONE'; score: number; stars: number }
  | { type: 'SET_PARTY_NAMES'; names: string[] };

export interface GameState {
  screen: GameScreen;
  mpReady: boolean;
  mode: GameMode;
  sequence: MinigameId[];
  mgIndex: number;
  mgResults: MinigameResult[];
  session: GameSession | null;
  partyPlayers: Array<{ name: string; score: number; stars: number }>;
  partyCurrentIdx: number;
  partyRound: number;
}
