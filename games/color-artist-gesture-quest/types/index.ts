// ============================================================
// COLOR ARTIST: GESTURE QUEST — Type Definitions
// ============================================================

export interface HandLandmark {
  x: number; // normalized 0–1
  y: number; // normalized 0–1
  z: number; // depth (negative = closer to camera)
}

export interface HandFrame {
  timestamp: number;
  landmarks: HandLandmark[];
  handedness: "Left" | "Right";
  worldLandmarks?: HandLandmark[];
}

export type Gesture =
  | "OPEN_PALM" // all fingers extended — move brush
  | "DRAW"      // index finger only — paint strokes
  | "FIST"      // all fingers curled — pause
  | "PINCH"     // thumb+index close — color wheel
  | "PEACE"     // index+middle extended — brush size
  | "UNKNOWN";  // transitional / unrecognized state

export interface GestureState {
  gesture: Gesture;
  confidence: number;  // 0–1
  isStable: boolean;
  cursorX: number;     // smoothed, normalized 0–1
  cursorY: number;     // smoothed, normalized 0–1
  pinchDistance?: number;
}

export interface Point {
  x: number;
  y: number;
  pressure?: number;
  timestamp?: number;
}

export type BrushType = "basic" | "smooth" | "gradient" | "neon" | "particle";

export interface Stroke {
  id: string;
  points: Point[];
  color: string;
  size: number;
  brushType: BrushType;
  opacity: number;
  timestamp: number;
}

export interface GuideShape {
  type: "circle" | "triangle" | "star" | "rectangle" | "tree" | "flower" | "house" | "car" | "cloud";
  x: number;    // normalized 0–1
  y: number;    // normalized 0–1
  size: number; // normalized 0–1
  color?: string;
  params?: Record<string, number>;
}

export interface LevelTarget {
  type: "trace" | "freeform" | "color_match" | "pattern";
  guideShapes?: GuideShape[];
  requiredColors?: string[];
  minColors?: number;
  coverageTarget?: number;
}

export interface Level {
  id: number;
  worldId: number;
  name: string;
  description: string;
  target: LevelTarget;
  timeLimit: number;
  starThresholds: [number, number, number];
  hint?: string;
}

export interface World {
  id: number;
  name: string;
  emoji: string;
  description: string;
  color: string;
  levels: Level[];
  brushUnlock?: BrushType;
  colorUnlocks?: string[];
  xpRequired: number;
}

export interface ScoreBreakdown {
  accuracy: number;    // 0–40
  colorUsage: number;  // 0–20
  timeBonus: number;   // 0–20
  smoothness: number;  // 0–20
  total: number;       // 0–100
}

export type GamePhase =
  | "loading"
  | "menu"
  | "worldSelect"
  | "levelSelect"
  | "playing"
  | "paused"
  | "levelComplete"
  | "error";

export interface GameState {
  phase: GamePhase;
  currentWorld: number;
  currentLevel: number;
  xp: number;
  totalStars: number;
  score: ScoreBreakdown;
  strokes: Stroke[];
  currentStroke: Point[];
  currentColor: string;
  currentBrush: BrushType;
  currentSize: number;
  timeRemaining: number;
  isDrawing: boolean;
  showColorWheel: boolean;
  colorWheelX: number;
  colorWheelY: number;
  colorsUsed: string[];
}

export interface GameSettings {
  showGuides: boolean;
  mirrorCamera: boolean;
  handedness: "auto" | "left" | "right";
}

export interface Progress {
  xp: number;
  unlockedBrushes: BrushType[];
  unlockedColors: string[];
  completedLevels: Record<string, number>; // "worldId-levelId": stars
  totalStars: number;
  lastPlayed: number;
  settings: GameSettings;
}

export interface UnlockReward {
  type: "brush" | "color" | "world";
  value: string;
  name: string;
  description: string;
}
