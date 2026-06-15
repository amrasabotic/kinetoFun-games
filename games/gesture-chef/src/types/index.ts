export type Difficulty = 'easy' | 'medium' | 'hard';

export type Screen =
  | 'home'
  | 'recipe-select'
  | 'playing'
  | 'results'
  | 'settings';

export type MinigameType =
  | 'vegetable-chop'
  | 'stir-soup'
  | 'pancake-flip'
  | 'cake-decorate';

export interface Recipe {
  id: string;
  name: string;
  emoji: string;
  description: string;
  difficulty: Difficulty;
  minigames: MinigameType[];
  starsRequired: number;
  color: string;
  bgColor: string;
}

export interface MinigameResult {
  type: MinigameType;
  score: number;
  stars: number;
  maxScore: number;
}

export interface GameSession {
  recipeId: string;
  recipe: Recipe;
  difficulty: Difficulty;
  results: MinigameResult[];
  totalScore: number;
  starsEarned: number;
  isNewRecord: boolean;
  newUnlocks: string[];
}

export interface PlayerProgress {
  bestScore: number;
  totalStars: number;
  unlockedRecipes: string[];
  highScores: Record<string, number>;
}

export interface GameSettings {
  soundEnabled: boolean;
  musicEnabled: boolean;
  difficulty: Difficulty;
}

// ─── Input system ───────────────────────────────────────────────────────────

export type GestureEventType =
  | 'pointerMove'
  | 'swipeDown'
  | 'swipeUp'
  | 'circularMotion'
  | 'tap'
  | 'dragStart'
  | 'dragEnd';

export interface PointerMoveData {
  x: number;
  y: number;
  vx: number;
  vy: number;
  speed: number;
}

export interface SwipeData {
  x: number;
  y: number;
  vx: number;
  vy: number;
  speed: number;
}

export interface CircularMotionData {
  direction: 'cw' | 'ccw';
  deltaAngle: number;
  totalRotation: number;
  x: number;
  y: number;
  centerX: number;
  centerY: number;
}

export interface TapData {
  x: number;
  y: number;
}

export interface DragData {
  x: number;
  y: number;
  startX: number;
  startY: number;
}

export type GestureEventDataMap = {
  pointerMove: PointerMoveData;
  swipeDown: SwipeData;
  swipeUp: SwipeData;
  circularMotion: CircularMotionData;
  tap: TapData;
  dragStart: DragData;
  dragEnd: DragData;
};

export type GestureHandler<T extends GestureEventType = GestureEventType> = (
  data: GestureEventDataMap[T]
) => void;
