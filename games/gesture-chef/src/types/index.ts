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
  cameraEnabled: boolean;
}

// ─── Input system — gesture-first, camera-ready ─────────────────────────────

/**
 * High-level cooking gesture events.
 * ALL game logic depends on these — no mini-game reads DOM events directly.
 * Input providers (MouseInputProvider, CameraInputProvider) emit into this bus.
 *
 * Architecture:  Camera / Mouse → Provider → InputManager → Game Logic
 */
export type GestureEventType =
  | 'chop'        // cutting stroke segment         → VegetableChop
  | 'stir'        // circular-motion frame update   → StirTheSoup
  | 'flip'        // upward swipe gesture           → PancakeFlip
  | 'place'       // tap / click to place item      → CakeDecoration
  | 'drawStart'   // pointer pressed — start stroke → CakeDecoration frosting
  | 'draw'        // pointer moved while pressed    → CakeDecoration frosting
  | 'drawEnd'     // pointer released — end stroke  → CakeDecoration frosting
  | 'pointerMove'; // raw cursor position           → cursor-trail rendering only

export interface ChopData {
  x: number; y: number;
  prevX: number; prevY: number;
  speed: number;
}

export interface StirData {
  direction: 'cw' | 'ccw';
  deltaAngle: number;
  totalRotation: number;
  x: number; y: number;
  centerX: number; centerY: number;
}

export interface FlipData { speed: number; }

export interface PlaceData { x: number; y: number; }

export interface DrawStartData { x: number; y: number; }
export interface DrawData      { x: number; y: number; }
export interface DrawEndData   { x: number; y: number; }

export interface PointerMoveData {
  x: number; y: number;
  vx: number; vy: number; speed: number;
}

export type GestureEventDataMap = {
  chop:        ChopData;
  stir:        StirData;
  flip:        FlipData;
  place:       PlaceData;
  drawStart:   DrawStartData;
  draw:        DrawData;
  drawEnd:     DrawEndData;
  pointerMove: PointerMoveData;
};

export type GestureHandler<T extends GestureEventType = GestureEventType> = (
  data: GestureEventDataMap[T]
) => void;
