import type { AchievementId, GameMode, MinigameId } from './index';

export interface StorageSchema {
  progress: {
    totalStars: number;
    totalCoins: number;
    bestScore: number;
    worldStage: number;
    highScores: Partial<Record<MinigameId, number>>;
    unlockedWorlds: number[];
  };
  settings: {
    soundEnabled: boolean;
    musicEnabled: boolean;
    difficulty: 'easy' | 'medium' | 'hard';
    dwellTimeMs: number;
    gestureHandedness: 'right' | 'left' | 'both';
  };
  achievements: {
    unlocked: AchievementId[];
    progress: Partial<Record<AchievementId, number>>;
  };
  leaderboard: Array<{
    score: number;
    playerName: string;
    date: string;
    mode: GameMode;
    stars: number;
  }>;
  dailyChallenge: {
    lastPlayedDate: string;
    streak: number;
    bestDailyScore: number;
  };
  party: {
    playerNames: string[];
    scores: number[];
    round: number;
  };
}

export interface IStorage {
  get<K extends keyof StorageSchema>(key: K): StorageSchema[K] | null;
  set<K extends keyof StorageSchema>(key: K, value: StorageSchema[K]): void;
  update<K extends keyof StorageSchema>(
    key: K,
    updater: (current: StorageSchema[K]) => StorageSchema[K],
    defaultValue: StorageSchema[K]
  ): void;
}
