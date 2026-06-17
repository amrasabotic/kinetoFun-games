// ============================================================
// LAYER 3: GAME ENGINE — Pure deterministic logic
// No canvas, no MediaPipe, no DOM. Only math.
// ============================================================

import type {
  GestureState, World, Level, ScoreBreakdown,
  Stroke, Point, BrushType, UnlockReward,
} from "../../types";
import { ProgressManager } from "../storage/progress";

// ── World / Level data ──────────────────────────────────────

export const WORLDS: World[] = [
  {
    id: 0, name: "Shape Academy", emoji: "📐",
    description: "Master the fundamentals of geometric form",
    color: "#6C63FF", xpRequired: 0,
    brushUnlock: "smooth",
    colorUnlocks: ["#FF6B6B", "#4ECDC4", "#45B7D1", "#FFA07A"],
    levels: [
      {
        id: 0, worldId: 0, name: "Circle of Life",
        description: "Draw a smooth circle inside the guide",
        target: { type: "trace", guideShapes: [{ type: "circle", x: 0.5, y: 0.5, size: 0.28 }] },
        timeLimit: 60, starThresholds: [50, 70, 88],
        hint: "DRAW gesture • trace the dotted ring",
      },
      {
        id: 1, worldId: 0, name: "Triangle Trick",
        description: "Follow the triangular guide precisely",
        target: { type: "trace", guideShapes: [{ type: "triangle", x: 0.5, y: 0.52, size: 0.32 }] },
        timeLimit: 60, starThresholds: [50, 70, 88],
        hint: "Keep index finger extended the whole time",
      },
      {
        id: 2, worldId: 0, name: "Star Gazer",
        description: "Create a perfect 5-pointed star",
        target: { type: "trace", guideShapes: [{ type: "star", x: 0.5, y: 0.5, size: 0.32, params: { points: 5 } }] },
        timeLimit: 90, starThresholds: [40, 65, 85],
        hint: "Lift & redraw for each point if needed",
      },
    ],
  },
  {
    id: 1, name: "Nature Sketch", emoji: "🌿",
    description: "Capture the beauty of the natural world",
    color: "#2ECC71", xpRequired: 200,
    brushUnlock: "gradient",
    colorUnlocks: ["#27AE60", "#8BC34A", "#CDDC39", "#795548", "#A5D6A7"],
    levels: [
      {
        id: 0, worldId: 1, name: "Tall Oak Tree",
        description: "Sketch a tree — trunk and leafy canopy",
        target: {
          type: "freeform",
          guideShapes: [{ type: "tree", x: 0.5, y: 0.56, size: 0.4 }],
          requiredColors: ["#795548", "#2ECC71", "#27AE60"],
          minColors: 2,
        },
        timeLimit: 120, starThresholds: [40, 65, 85],
        hint: "Brown trunk, green canopy — PINCH to switch colors",
      },
      {
        id: 1, worldId: 1, name: "Blooming Flower",
        description: "Paint a vibrant flower in full bloom",
        target: {
          type: "freeform",
          guideShapes: [{ type: "flower", x: 0.5, y: 0.5, size: 0.34 }],
          requiredColors: ["#E91E63", "#FF9800", "#FFEB3B"],
          minColors: 2, coverageTarget: 0.18,
        },
        timeLimit: 90, starThresholds: [40, 65, 85],
        hint: "Bold petal colors make a higher score",
      },
      {
        id: 2, worldId: 1, name: "Cloudy Sky",
        description: "Paint fluffy clouds in a blue sky",
        target: {
          type: "freeform",
          guideShapes: [
            { type: "cloud", x: 0.28, y: 0.28, size: 0.22 },
            { type: "cloud", x: 0.68, y: 0.22, size: 0.19 },
          ],
          requiredColors: ["#2196F3", "#FFFFFF", "#90CAF9"],
          minColors: 2, coverageTarget: 0.3,
        },
        timeLimit: 120, starThresholds: [40, 65, 85],
        hint: "Blue sky behind, white fluffy clouds",
      },
    ],
  },
  {
    id: 2, name: "City Builder", emoji: "🏙️",
    description: "Construct an urban masterpiece stroke by stroke",
    color: "#3498DB", xpRequired: 500,
    brushUnlock: "neon",
    colorUnlocks: ["#FF5722", "#9C27B0", "#607D8B", "#F44336", "#00BCD4"],
    levels: [
      {
        id: 0, worldId: 2, name: "My First House",
        description: "Draw a house — walls, roof, door and window",
        target: {
          type: "trace",
          guideShapes: [{ type: "house", x: 0.5, y: 0.55, size: 0.4 }],
          requiredColors: ["#FF5722", "#FFEB3B", "#8BC34A"],
          minColors: 2,
        },
        timeLimit: 90, starThresholds: [40, 65, 85],
        hint: "Square walls first, then triangular roof",
      },
      {
        id: 1, worldId: 2, name: "Sports Car",
        description: "Sketch a sleek car with body and wheels",
        target: {
          type: "trace",
          guideShapes: [{ type: "car", x: 0.5, y: 0.6, size: 0.45 }],
          requiredColors: ["#FF5722", "#607D8B"],
          minColors: 2,
        },
        timeLimit: 90, starThresholds: [40, 65, 85],
        hint: "Body first, then wheels and windows",
      },
      {
        id: 2, worldId: 2, name: "Night Skyline",
        description: "Build a city skyline under the stars",
        target: {
          type: "freeform",
          requiredColors: ["#1A1A2E", "#16213E", "#0F3460", "#533483", "#E94560"],
          minColors: 3, coverageTarget: 0.5,
        },
        timeLimit: 150, starThresholds: [35, 60, 80],
        hint: "Dark palette for night • bright windows for life",
      },
    ],
  },
  {
    id: 3, name: "Art Master Trials", emoji: "🎨",
    description: "Prove ultimate mastery of color and form",
    color: "#9B59B6", xpRequired: 1000,
    brushUnlock: "particle",
    colorUnlocks: ["#FF1493", "#00FFFF", "#FFD700", "#7FFF00", "#FF6347"],
    levels: [
      {
        id: 0, worldId: 3, name: "Rainbow Symphony",
        description: "Use every color of the rainbow",
        target: {
          type: "color_match",
          requiredColors: ["#FF0000", "#FF7F00", "#FFFF00", "#00FF00", "#0000FF", "#8B00FF"],
          minColors: 6, coverageTarget: 0.4,
        },
        timeLimit: 120, starThresholds: [40, 65, 85],
        hint: "PINCH to open color wheel — 6 different hues needed",
      },
      {
        id: 1, worldId: 3, name: "Pattern Master",
        description: "Replicate the geometric circle pattern",
        target: {
          type: "pattern",
          guideShapes: [
            { type: "circle", x: 0.25, y: 0.25, size: 0.14 },
            { type: "circle", x: 0.75, y: 0.25, size: 0.14 },
            { type: "circle", x: 0.25, y: 0.75, size: 0.14 },
            { type: "circle", x: 0.75, y: 0.75, size: 0.14 },
            { type: "circle", x: 0.5, y: 0.5, size: 0.18 },
          ],
          requiredColors: ["#9B59B6", "#3498DB"],
        },
        timeLimit: 120, starThresholds: [40, 65, 85],
        hint: "Corner circles first, then the center",
      },
      {
        id: 2, worldId: 3, name: "Grand Masterpiece",
        description: "Create your ultimate free artwork",
        target: { type: "freeform", minColors: 5, coverageTarget: 0.55 },
        timeLimit: 180, starThresholds: [30, 55, 75],
        hint: "No rules — express everything you've learned",
      },
    ],
  },
];

// ── Engine class ────────────────────────────────────────────

export class GameEngine {
  currentWorld = 0;
  currentLevel = 0;
  xp = 0;
  stars = 0;

  private strokeSmoothness: number[] = [];
  private colorsUsed = new Set<string>();

  constructor(private progress: ProgressManager) {
    const p = progress.load();
    this.xp = p.xp;
    this.stars = p.totalStars;
  }

  // ── World / level accessors ───────────────────────────────

  getWorlds(): World[] { return WORLDS; }
  getWorld(id: number): World { return WORLDS[id]; }
  getLevel(wId: number, lId: number): Level { return WORLDS[wId].levels[lId]; }

  isWorldUnlocked(wId: number): boolean {
    return this.xp >= WORLDS[wId].xpRequired;
  }

  getLevelStars(wId: number, lId: number): number {
    return this.progress.getLevelStars(wId, lId);
  }

  // ── Frame update (gesture-agnostic; orchestrator handles mapping) ──

  updateGesture(_: GestureState): void { /* hook for future extensions */ }

  updateStrokes(strokes: Stroke[], currentStroke: Point[]): void {
    strokes.forEach((s) => this.colorsUsed.add(s.color));
    if (currentStroke.length > 3) {
      this.strokeSmoothness.push(this.measureSmoothness(currentStroke));
    }
  }

  // ── Scoring ───────────────────────────────────────────────

  calculateScore(strokes: Stroke[], timeRemaining: number, timeLimit: number): ScoreBreakdown {
    const level = WORLDS[this.currentWorld].levels[this.currentLevel];
    const accuracy    = this.scoreAccuracy(strokes, level);
    const colorUsage  = this.scoreColorUsage(strokes, level);
    const timeBonus   = this.scoreTimeBonus(timeRemaining, timeLimit);
    const smoothness  = this.scoreSmoothness();
    const total       = Math.min(100, Math.round(accuracy + colorUsage + timeBonus + smoothness));
    return { accuracy, colorUsage, timeBonus, smoothness, total };
  }

  private scoreAccuracy(strokes: Stroke[], level: Level): number {
    if (!strokes.length) return 0;
    const pts = strokes.reduce((n, s) => n + s.points.length, 0);
    const coverage = Math.min(1, pts / 600);
    if (level.target.type === "freeform" || level.target.type === "color_match") {
      return Math.round(coverage * 40);
    }
    // Trace levels: also reward stroke count (attempting to trace)
    const strokeCoverage = Math.min(1, strokes.length / 8);
    return Math.round((coverage * 0.5 + strokeCoverage * 0.5) * 40);
  }

  private scoreColorUsage(strokes: Stroke[], level: Level): number {
    const unique = new Set(strokes.map((s) => s.color)).size;
    const min = level.target.minColors ?? 1;
    return Math.round(Math.min(1, unique / Math.max(1, min * 1.2)) * 20);
  }

  private scoreTimeBonus(remaining: number, limit: number): number {
    if (!limit) return 20;
    return Math.round(Math.max(0, remaining / limit) * 20);
  }

  private scoreSmoothness(): number {
    if (!this.strokeSmoothness.length) return 10;
    const avg = this.strokeSmoothness.reduce((a, b) => a + b, 0) / this.strokeSmoothness.length;
    return Math.round(Math.min(1, avg) * 20);
  }

  private measureSmoothness(pts: Point[]): number {
    if (pts.length < 3) return 1;
    let totalDeviation = 0;
    for (let i = 1; i < pts.length - 1; i++) {
      const ax = pts[i].x - pts[i - 1].x, ay = pts[i].y - pts[i - 1].y;
      const bx = pts[i + 1].x - pts[i].x, by = pts[i + 1].y - pts[i].y;
      const angle = Math.abs(Math.atan2(by, bx) - Math.atan2(ay, ax));
      totalDeviation += Math.min(angle, Math.PI * 2 - angle);
    }
    const avgDev = totalDeviation / (pts.length - 2);
    return Math.max(0, 1 - avgDev / Math.PI);
  }

  // ── Level completion ──────────────────────────────────────

  startLevel(wId: number, lId: number): void {
    this.currentWorld = wId;
    this.currentLevel = lId;
    this.strokeSmoothness = [];
    this.colorsUsed.clear();
  }

  completeLevel(score: ScoreBreakdown): { stars: number; xpGained: number; unlocks: UnlockReward[] } {
    const level = WORLDS[this.currentWorld].levels[this.currentLevel];
    const stars = this.toStars(score.total, level.starThresholds);
    const xpGained = Math.round(score.total * 2 + stars * 50);

    this.xp += xpGained;
    this.stars += stars;

    this.progress.recordLevelComplete(this.currentWorld, this.currentLevel, stars, xpGained);

    const unlocks = this.grantUnlocks();
    this.strokeSmoothness = [];
    this.colorsUsed.clear();

    // Refresh from storage so xp/stars are canonical
    const p = this.progress.load();
    this.xp = p.xp;
    this.stars = p.totalStars;

    return { stars, xpGained, unlocks };
  }

  private toStars(score: number, thresholds: [number, number, number]): number {
    if (score >= thresholds[2]) return 3;
    if (score >= thresholds[1]) return 2;
    if (score >= thresholds[0]) return 1;
    return 0;
  }

  private grantUnlocks(): UnlockReward[] {
    const rewards: UnlockReward[] = [];
    const p = this.progress.load();
    const world = WORLDS[this.currentWorld];
    const allClear = world.levels.every(
      (_, i) => (p.completedLevels[`${this.currentWorld}-${i}`] ?? 0) > 0
    );

    if (allClear) {
      if (world.brushUnlock && !p.unlockedBrushes.includes(world.brushUnlock)) {
        this.progress.addUnlockedBrush(world.brushUnlock);
        rewards.push({
          type: "brush", value: world.brushUnlock,
          name: `${world.brushUnlock[0].toUpperCase()}${world.brushUnlock.slice(1)} Brush`,
          description: `You've unlocked the ${world.brushUnlock} brush!`,
        });
      }
      if (world.colorUnlocks?.length) {
        this.progress.addUnlockedColors(world.colorUnlocks);
        rewards.push({
          type: "color", value: world.colorUnlocks[0],
          name: "New Color Palette",
          description: `${world.colorUnlocks.length} new colors unlocked!`,
        });
      }
    }
    return rewards;
  }

  // ── Palette / brush helpers ───────────────────────────────

  getAvailableColors(): string[] {
    const p = this.progress.load();
    const base = ["#000000", "#FFFFFF", "#FF0000", "#FF7F00", "#FFFF00",
                  "#00CC00", "#0000FF", "#9B59B6", "#FF1493", "#00FFFF",
                  "#FF6B6B", "#4ECDC4", "#45B7D1", "#FFA07A"];
    return Array.from(new Set([...base, ...p.unlockedColors]));
  }

  getAvailableBrushes(): BrushType[] {
    const p = this.progress.load();
    return ["basic", ...p.unlockedBrushes] as BrushType[];
  }
}
