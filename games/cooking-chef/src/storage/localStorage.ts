import type { IStorage, StorageSchema } from '@/types/storage';

const PREFIX = 'cc_';

const DEFAULTS: StorageSchema = {
  progress: {
    totalStars: 0, totalCoins: 0, bestScore: 0,
    worldStage: 0, highScores: {}, unlockedWorlds: [0],
  },
  settings: {
    soundEnabled: true, musicEnabled: true, difficulty: 'medium',
    dwellTimeMs: 1100, gestureHandedness: 'both',
  },
  achievements: { unlocked: [], progress: {} },
  leaderboard: [],
  dailyChallenge: { lastPlayedDate: '', streak: 0, bestDailyScore: 0 },
  party: { playerNames: [], scores: [], round: 0 },
};

class LocalStorage implements IStorage {
  get<K extends keyof StorageSchema>(key: K): StorageSchema[K] | null {
    try {
      const raw = localStorage.getItem(PREFIX + key);
      if (raw == null) return null;
      return JSON.parse(raw) as StorageSchema[K];
    } catch { return null; }
  }

  getOrDefault<K extends keyof StorageSchema>(key: K): StorageSchema[K] {
    return this.get(key) ?? DEFAULTS[key];
  }

  set<K extends keyof StorageSchema>(key: K, value: StorageSchema[K]): void {
    try { localStorage.setItem(PREFIX + key, JSON.stringify(value)); } catch {}
  }

  update<K extends keyof StorageSchema>(
    key: K,
    updater: (current: StorageSchema[K]) => StorageSchema[K],
    defaultValue?: StorageSchema[K]
  ): void {
    const current = this.get(key) ?? defaultValue ?? DEFAULTS[key];
    this.set(key, updater(current as StorageSchema[K]));
  }
}

export const storage = new LocalStorage();
