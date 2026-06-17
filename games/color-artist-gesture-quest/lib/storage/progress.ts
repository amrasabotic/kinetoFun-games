import type { Progress, BrushType, GameSettings } from "../../types";

const STORAGE_KEY = "color_artist_quest_v1";

const DEFAULT_SETTINGS: GameSettings = {
  showGuides: true,
  mirrorCamera: true,
  handedness: "auto",
};

const DEFAULT_PROGRESS: Progress = {
  xp: 0,
  unlockedBrushes: [],
  unlockedColors: [],
  completedLevels: {},
  totalStars: 0,
  lastPlayed: 0,
  settings: { ...DEFAULT_SETTINGS },
};

export class ProgressManager {
  load(): Progress {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return { ...DEFAULT_PROGRESS, lastPlayed: Date.now() };
      const parsed = JSON.parse(raw) as Progress;
      return {
        ...DEFAULT_PROGRESS,
        ...parsed,
        settings: { ...DEFAULT_SETTINGS, ...(parsed.settings || {}) },
      };
    } catch {
      return { ...DEFAULT_PROGRESS, lastPlayed: Date.now() };
    }
  }

  save(progress: Progress): void {
    try {
      progress.lastPlayed = Date.now();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    } catch (e) {
      console.warn("[ProgressManager] Failed to save:", e);
    }
  }

  reset(): void {
    localStorage.removeItem(STORAGE_KEY);
  }

  getLevelStars(worldId: number, levelId: number): number {
    const p = this.load();
    return p.completedLevels[`${worldId}-${levelId}`] ?? 0;
  }

  recordLevelComplete(worldId: number, levelId: number, stars: number, xpGained: number): void {
    const p = this.load();
    const key = `${worldId}-${levelId}`;
    const prev = p.completedLevels[key] ?? 0;
    if (stars > prev) p.completedLevels[key] = stars;
    p.xp += xpGained;
    p.totalStars = Object.values(p.completedLevels).reduce((s, v) => s + v, 0);
    this.save(p);
  }

  addUnlockedBrush(brush: BrushType): void {
    const p = this.load();
    if (!p.unlockedBrushes.includes(brush)) {
      p.unlockedBrushes.push(brush);
      this.save(p);
    }
  }

  addUnlockedColors(colors: string[]): void {
    const p = this.load();
    for (const c of colors) {
      if (!p.unlockedColors.includes(c)) p.unlockedColors.push(c);
    }
    this.save(p);
  }

  updateSettings(patch: Partial<GameSettings>): void {
    const p = this.load();
    p.settings = { ...p.settings, ...patch };
    this.save(p);
  }
}
