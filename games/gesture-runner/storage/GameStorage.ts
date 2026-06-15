import type { StoredData, LeaderboardEntry, DailyChallenge, CharacterUnlock } from '../types/storage';
import type { GameSettings } from '../types/gestures';
import type { CharacterId } from '../types/game';

const PREFIX = 'gesture-runner:';

const DEFAULT_SETTINGS: GameSettings = {
  jumpSensitivity: 3,
  slideSensitivity: 3,
  leanSensitivity: 3,
  musicEnabled: true,
  sfxEnabled: true,
  highContrast: false,
  reducedMotion: false,
};

const DEFAULT_CHARACTERS: CharacterUnlock[] = [
  { id: 'starter', unlocked: true, equipped: true },
  { id: 'explorer', unlocked: false, equipped: false },
  { id: 'robot', unlocked: false, equipped: false },
  { id: 'ninja', unlocked: false, equipped: false },
];

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function generateDailyChallenges(date: string): DailyChallenge[] {
  // Seeded-like variety based on date
  const seed = date.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const r = (n: number) => (seed * (n + 1) * 31337) % 1000;

  const templates: Omit<DailyChallenge, 'id' | 'date' | 'progress' | 'completed' | 'claimed'>[] = [
    {
      title: 'Distance Runner',
      description: `Run ${300 + Math.floor(r(0) % 5) * 100}m in a single run`,
      type: 'distance',
      target: 300 + Math.floor(r(0) % 5) * 100,
      reward: 50,
    },
    {
      title: 'Coin Collector',
      description: `Collect ${20 + Math.floor(r(1) % 6) * 5} coins in a single run`,
      type: 'coins',
      target: 20 + Math.floor(r(1) % 6) * 5,
      reward: 40,
    },
    {
      title: 'High Scorer',
      description: `Reach a score of ${1000 + Math.floor(r(2) % 10) * 200}`,
      type: 'score',
      target: 1000 + Math.floor(r(2) % 10) * 200,
      reward: 60,
    },
    {
      title: 'Obstacle Dodger',
      description: `Dodge ${15 + Math.floor(r(3) % 5) * 3} obstacles in a row`,
      type: 'obstacles',
      target: 15 + Math.floor(r(3) % 5) * 3,
      reward: 45,
    },
    {
      title: 'Power Player',
      description: `Collect ${3 + Math.floor(r(4) % 3)} power-ups in one run`,
      type: 'powerups',
      target: 3 + Math.floor(r(4) % 3),
      reward: 35,
    },
  ];

  return templates.map((t, i) => ({
    ...t,
    id: `${date}-${i}`,
    date,
    progress: 0,
    completed: false,
    claimed: false,
  }));
}

function safeGet<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function safeSet(key: string, value: unknown): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    // Quota exceeded or private browsing
  }
}

export class GameStorage {
  // Settings
  static getSettings(): GameSettings {
    return { ...DEFAULT_SETTINGS, ...safeGet<Partial<GameSettings>>('settings', {}) };
  }

  static saveSettings(settings: GameSettings): void {
    safeSet('settings', settings);
  }

  // Leaderboard
  static getLeaderboard(): LeaderboardEntry[] {
    return safeGet<LeaderboardEntry[]>('leaderboard', []);
  }

  static addLeaderboardEntry(entry: LeaderboardEntry): void {
    const board = GameStorage.getLeaderboard();
    board.push(entry);
    board.sort((a, b) => b.score - a.score);
    safeSet('leaderboard', board.slice(0, 20)); // keep top 20
  }

  // Coins
  static getTotalCoins(): number {
    return safeGet<number>('totalCoins', 0);
  }

  static addCoins(amount: number): number {
    const current = GameStorage.getTotalCoins();
    const next = current + amount;
    safeSet('totalCoins', next);
    return next;
  }

  static spendCoins(amount: number): boolean {
    const current = GameStorage.getTotalCoins();
    if (current < amount) return false;
    safeSet('totalCoins', current - amount);
    return true;
  }

  // Characters
  static getCharacters(): CharacterUnlock[] {
    return safeGet<CharacterUnlock[]>('characters', DEFAULT_CHARACTERS);
  }

  static saveCharacters(characters: CharacterUnlock[]): void {
    safeSet('characters', characters);
  }

  static unlockCharacter(id: CharacterId): void {
    const chars = GameStorage.getCharacters();
    const idx = chars.findIndex((c) => c.id === id);
    if (idx >= 0) {
      chars[idx].unlocked = true;
      GameStorage.saveCharacters(chars);
    }
  }

  static equipCharacter(id: CharacterId): void {
    const chars = GameStorage.getCharacters();
    chars.forEach((c) => {
      c.equipped = c.id === id;
    });
    GameStorage.saveCharacters(chars);
  }

  static getEquippedCharacter(): CharacterId {
    const chars = GameStorage.getCharacters();
    return chars.find((c) => c.equipped)?.id ?? 'starter';
  }

  // Challenges
  static getChallenges(): DailyChallenge[] {
    const stored = safeGet<DailyChallenge[]>('challenges', []);
    const today = todayStr();
    // If no challenges or they're from a previous day, generate new ones
    if (stored.length === 0 || stored[0].date !== today) {
      const fresh = generateDailyChallenges(today);
      safeSet('challenges', fresh);
      return fresh;
    }
    return stored;
  }

  static saveChallenges(challenges: DailyChallenge[]): void {
    safeSet('challenges', challenges);
  }

  static updateChallengeProgress(
    type: DailyChallenge['type'],
    value: number
  ): void {
    const challenges = GameStorage.getChallenges();
    let changed = false;
    challenges.forEach((c) => {
      if (c.type === type && !c.completed) {
        const prev = c.progress;
        c.progress = Math.max(c.progress, value);
        if (c.progress >= c.target) {
          c.completed = true;
        }
        if (c.progress !== prev) changed = true;
      }
    });
    if (changed) GameStorage.saveChallenges(challenges);
  }

  static claimChallenge(id: string): number {
    const challenges = GameStorage.getChallenges();
    const ch = challenges.find((c) => c.id === id);
    if (!ch || !ch.completed || ch.claimed) return 0;
    ch.claimed = true;
    GameStorage.saveChallenges(challenges);
    GameStorage.addCoins(ch.reward);
    return ch.reward;
  }

  // Best score
  static getBestScore(): number {
    return safeGet<number>('bestScore', 0);
  }

  static updateBestScore(score: number): boolean {
    const best = GameStorage.getBestScore();
    if (score > best) {
      safeSet('bestScore', score);
      return true;
    }
    return false;
  }

  // Full data snapshot
  static getAllData(): StoredData {
    return {
      settings: GameStorage.getSettings(),
      leaderboard: GameStorage.getLeaderboard(),
      totalCoins: GameStorage.getTotalCoins(),
      characters: GameStorage.getCharacters(),
      challenges: GameStorage.getChallenges(),
      bestScore: GameStorage.getBestScore(),
      lastPlayDate: safeGet<string>('lastPlayDate', ''),
    };
  }

  static setLastPlayDate(): void {
    safeSet('lastPlayDate', todayStr());
  }
}
