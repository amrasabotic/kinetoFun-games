import type { PlayerProgress, GameSettings } from '../types';
import { STORAGE_KEY_PREFIX, INITIAL_UNLOCKED_RECIPES } from '../constants/gameConfig';
import { RECIPES } from '../data/recipes';

const k = (name: string) => `${STORAGE_KEY_PREFIX}:${name}`;

export const DEFAULT_PROGRESS: PlayerProgress = {
  bestScore: 0,
  totalStars: 0,
  unlockedRecipes: [...INITIAL_UNLOCKED_RECIPES],
  highScores: {},
};

export const DEFAULT_SETTINGS: GameSettings = {
  soundEnabled: true,
  musicEnabled: false,
  difficulty: 'medium',
};

function safeGet<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function safeSet<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* localStorage may be unavailable */
  }
}

export function loadProgress(): PlayerProgress {
  const saved = safeGet<PlayerProgress>(k('progress'), DEFAULT_PROGRESS);
  // Always ensure initially unlocked recipes are present
  const unlockedSet = new Set(saved.unlockedRecipes);
  INITIAL_UNLOCKED_RECIPES.forEach(id => unlockedSet.add(id));
  return { ...saved, unlockedRecipes: Array.from(unlockedSet) };
}

export function saveProgress(progress: PlayerProgress): void {
  safeSet(k('progress'), progress);
}

export function loadSettings(): GameSettings {
  return safeGet<GameSettings>(k('settings'), DEFAULT_SETTINGS);
}

export function saveSettings(settings: GameSettings): void {
  safeSet(k('settings'), settings);
}

export function updateHighScore(
  recipeId: string,
  score: number,
  progress: PlayerProgress
): { progress: PlayerProgress; isNewRecord: boolean } {
  const prev = progress.highScores[recipeId] ?? 0;
  if (score <= prev) return { progress, isNewRecord: false };
  return {
    progress: {
      ...progress,
      highScores: { ...progress.highScores, [recipeId]: score },
      bestScore: Math.max(progress.bestScore, score),
    },
    isNewRecord: true,
  };
}

export function addStars(stars: number, progress: PlayerProgress): PlayerProgress {
  return { ...progress, totalStars: progress.totalStars + stars };
}

export function computeNewUnlocks(
  progress: PlayerProgress
): { updatedProgress: PlayerProgress; newUnlocks: string[] } {
  const newUnlocks: string[] = [];
  let updated = { ...progress };
  RECIPES.forEach(r => {
    if (
      !updated.unlockedRecipes.includes(r.id) &&
      updated.totalStars >= r.starsRequired
    ) {
      updated = {
        ...updated,
        unlockedRecipes: [...updated.unlockedRecipes, r.id],
      };
      newUnlocks.push(r.id);
    }
  });
  return { updatedProgress: updated, newUnlocks };
}
