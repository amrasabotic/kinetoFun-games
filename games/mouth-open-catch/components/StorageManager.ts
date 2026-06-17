export interface GameStats {
  highScore: number;
  coins: number;
  diamonds: number;
  gamesPlayed: number;
  bestCombo: number;
  totalCaught: number;
  totalMissed: number;
  timePlayed: number;
  bestSurvivalTime: number;
}

export interface GameSettings {
  soundEnabled: boolean;
  musicEnabled: boolean;
  showCamera: boolean;
  highContrast: boolean;
  selectedCharacter: string;
  selectedTheme: string;
  calibrationData: CalibrationData | null;
}

export interface CalibrationData {
  closedThreshold: number;
  openThreshold: number;
  timestamp: number;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlockedAt: number | null;
}

export interface DailyChallenge {
  date: string;
  type: string;
  goal: number;
  progress: number;
  completed: boolean;
  reward: number;
}

export interface StorageData {
  stats: GameStats;
  settings: GameSettings;
  achievements: Achievement[];
  dailyChallenge: DailyChallenge | null;
  unlockedCharacters: string[];
  unlockedThemes: string[];
}

const STORAGE_KEY = 'mouth-open-catch-v1';

const DEFAULT_STATS: GameStats = {
  highScore: 0,
  coins: 0,
  diamonds: 0,
  gamesPlayed: 0,
  bestCombo: 0,
  totalCaught: 0,
  totalMissed: 0,
  timePlayed: 0,
  bestSurvivalTime: 0,
};

const DEFAULT_SETTINGS: GameSettings = {
  soundEnabled: true,
  musicEnabled: true,
  showCamera: false,
  highContrast: false,
  selectedCharacter: 'chompy',
  selectedTheme: 'kitchen',
  calibrationData: null,
};

const ALL_ACHIEVEMENTS: Achievement[] = [
  { id: 'first_catch', name: 'First Catch!', description: 'Catch your first item', icon: '🎯', unlockedAt: null },
  { id: 'catches_100', name: 'Centurion', description: 'Catch 100 items total', icon: '💯', unlockedAt: null },
  { id: 'catches_1000', name: 'Glutton', description: 'Catch 1000 items total', icon: '🏆', unlockedAt: null },
  { id: 'combo_5', name: 'Combo Starter', description: 'Reach a 5x combo', icon: '🔥', unlockedAt: null },
  { id: 'combo_10', name: 'Combo Master', description: 'Reach a 10x combo', icon: '⚡', unlockedAt: null },
  { id: 'coins_1000', name: 'Coin Collector', description: 'Collect 1000 coins total', icon: '🪙', unlockedAt: null },
  { id: 'diamonds_10', name: 'Diamond Hunter', description: 'Collect 10 diamonds', icon: '💎', unlockedAt: null },
  { id: 'score_500', name: 'Rising Star', description: 'Score 500 points in one game', icon: '⭐', unlockedAt: null },
  { id: 'score_2000', name: 'High Flyer', description: 'Score 2000 points in one game', icon: '🌟', unlockedAt: null },
  { id: 'score_5000', name: 'Legend', description: 'Score 5000 points in one game', icon: '👑', unlockedAt: null },
  { id: 'survive_60', name: 'Survivor', description: 'Survive for 60 seconds', icon: '⏱️', unlockedAt: null },
  { id: 'survive_120', name: 'Endurance King', description: 'Survive for 2 minutes', icon: '🛡️', unlockedAt: null },
  { id: 'games_10', name: 'Regular Player', description: 'Play 10 games', icon: '🎮', unlockedAt: null },
  { id: 'treasure_catch', name: 'Treasure Hunter', description: 'Catch a Treasure Chest', icon: '🎁', unlockedAt: null },
  { id: 'bomb_dodger', name: 'Bomb Dodger', description: 'Dodge 5 bombs in a row', icon: '💣', unlockedAt: null },
  { id: 'powerup_catch', name: 'Powered Up', description: 'Collect your first power-up', icon: '⚡', unlockedAt: null },
];

export class StorageManager {
  private data: StorageData;

  constructor() {
    this.data = this.load();
    this.generateDailyChallenge();
  }

  private load(): StorageData {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return this.defaultData();
      const parsed = JSON.parse(raw);
      return {
        stats: { ...DEFAULT_STATS, ...parsed.stats },
        settings: { ...DEFAULT_SETTINGS, ...parsed.settings },
        achievements: ALL_ACHIEVEMENTS.map(a => {
          const saved = (parsed.achievements || []).find((s: Achievement) => s.id === a.id);
          return saved ? { ...a, unlockedAt: saved.unlockedAt } : a;
        }),
        dailyChallenge: parsed.dailyChallenge || null,
        unlockedCharacters: parsed.unlockedCharacters || ['chompy'],
        unlockedThemes: parsed.unlockedThemes || ['kitchen'],
      };
    } catch {
      return this.defaultData();
    }
  }

  private defaultData(): StorageData {
    return {
      stats: { ...DEFAULT_STATS },
      settings: { ...DEFAULT_SETTINGS },
      achievements: ALL_ACHIEVEMENTS.map(a => ({ ...a })),
      dailyChallenge: null,
      unlockedCharacters: ['chompy'],
      unlockedThemes: ['kitchen'],
    };
  }

  private save(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    } catch { /* quota exceeded — ignore */ }
  }

  private generateDailyChallenge(): void {
    const today = new Date().toISOString().split('T')[0];
    if (this.data.dailyChallenge?.date === today) return;

    const challenges = [
      { type: 'Catch 20 Apples 🍎', goal: 20, reward: 50 },
      { type: 'Score 1000 Points ⭐', goal: 1000, reward: 100 },
      { type: 'Catch 5 Diamonds 💎', goal: 5, reward: 75 },
      { type: 'Reach an 8x Combo 🔥', goal: 8, reward: 60 },
      { type: 'Collect 100 Coins 🪙', goal: 100, reward: 80 },
    ];

    const seed = today.split('-').reduce((a, b) => a + parseInt(b), 0);
    const challenge = challenges[seed % challenges.length];
    this.data.dailyChallenge = { date: today, ...challenge, progress: 0, completed: false };
    this.save();
  }

  getStats(): GameStats { return { ...this.data.stats }; }
  getSettings(): GameSettings { return { ...this.data.settings }; }
  getAchievements(): Achievement[] { return [...this.data.achievements]; }
  getDailyChallenge(): DailyChallenge | null { return this.data.dailyChallenge ? { ...this.data.dailyChallenge } : null; }
  getUnlockedCharacters(): string[] { return [...this.data.unlockedCharacters]; }
  getUnlockedThemes(): string[] { return [...this.data.unlockedThemes]; }

  updateStats(partial: Partial<GameStats>): void {
    this.data.stats = { ...this.data.stats, ...partial };
    this.save();
  }

  updateSettings(partial: Partial<GameSettings>): void {
    this.data.settings = { ...this.data.settings, ...partial };
    this.save();
  }

  updateCalibration(data: CalibrationData): void {
    this.data.settings.calibrationData = data;
    this.save();
  }

  recordGameEnd(score: number, survived: number, caught: number, missed: number, maxCombo: number, coins: number, diamonds: number): string[] {
    const s = this.data.stats;
    const newlyUnlocked: string[] = [];

    s.gamesPlayed += 1;
    s.totalCaught += caught;
    s.totalMissed += missed;
    s.timePlayed += survived;
    s.coins += coins;
    s.diamonds += diamonds;
    if (score > s.highScore) s.highScore = score;
    if (maxCombo > s.bestCombo) s.bestCombo = maxCombo;
    if (survived > s.bestSurvivalTime) s.bestSurvivalTime = survived;

    this.save();

    // Check achievements
    const checks: Array<[string, boolean]> = [
      ['first_catch', s.totalCaught >= 1],
      ['catches_100', s.totalCaught >= 100],
      ['catches_1000', s.totalCaught >= 1000],
      ['combo_5', s.bestCombo >= 5],
      ['combo_10', s.bestCombo >= 10],
      ['coins_1000', s.coins >= 1000],
      ['diamonds_10', s.diamonds >= 10],
      ['score_500', score >= 500],
      ['score_2000', score >= 2000],
      ['score_5000', score >= 5000],
      ['survive_60', survived >= 60],
      ['survive_120', survived >= 120],
      ['games_10', s.gamesPlayed >= 10],
    ];

    for (const [id, condition] of checks) {
      const ach = this.data.achievements.find(a => a.id === id);
      if (ach && !ach.unlockedAt && condition) {
        ach.unlockedAt = Date.now();
        newlyUnlocked.push(ach.name);
      }
    }

    this.save();
    return newlyUnlocked;
  }

  unlockAchievement(id: string): boolean {
    const ach = this.data.achievements.find(a => a.id === id);
    if (!ach || ach.unlockedAt) return false;
    ach.unlockedAt = Date.now();
    this.save();
    return true;
  }

  unlockCharacter(id: string): void {
    if (!this.data.unlockedCharacters.includes(id)) {
      this.data.unlockedCharacters.push(id);
      this.save();
    }
  }

  unlockTheme(id: string): void {
    if (!this.data.unlockedThemes.includes(id)) {
      this.data.unlockedThemes.push(id);
      this.save();
    }
  }

  updateDailyChallengeProgress(type: string, amount: number): boolean {
    const c = this.data.dailyChallenge;
    if (!c || c.completed || c.type !== type) return false;
    c.progress = Math.min(c.goal, c.progress + amount);
    if (c.progress >= c.goal) {
      c.completed = true;
      this.save();
      return true;
    }
    this.save();
    return false;
  }
}
