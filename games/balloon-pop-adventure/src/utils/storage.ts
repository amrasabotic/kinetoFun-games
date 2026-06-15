import type { HighScores, Settings } from '../game/types';

const KEYS = {
  HIGH_SCORES: 'bpa_high_scores',
  SETTINGS:    'bpa_settings',
} as const;

// ─── High Scores ──────────────────────────────────────────────────────────

const defaultHighScores: HighScores = {
  classic: null,
  endless: null,
  party:   null,
};

export function getHighScores(): HighScores {
  try {
    const raw = localStorage.getItem(KEYS.HIGH_SCORES);
    if (!raw) return defaultHighScores;
    return { ...defaultHighScores, ...JSON.parse(raw) };
  } catch {
    return defaultHighScores;
  }
}

export function saveHighScore(
  mode: keyof HighScores,
  score: number,
): boolean {
  try {
    const current = getHighScores();
    const prev = current[mode];
    if (prev !== null && prev.score >= score) return false; // not a new record
    current[mode] = { score, date: new Date().toLocaleDateString() };
    localStorage.setItem(KEYS.HIGH_SCORES, JSON.stringify(current));
    return true; // new high score!
  } catch {
    return false;
  }
}

export function clearHighScores(): void {
  try {
    localStorage.removeItem(KEYS.HIGH_SCORES);
  } catch {
    // ignore
  }
}

// ─── Settings ─────────────────────────────────────────────────────────────

const defaultSettings: Settings = {
  soundEnabled: true,
  musicEnabled: false, // off by default to avoid startling new users
};

export function getSettings(): Settings {
  try {
    const raw = localStorage.getItem(KEYS.SETTINGS);
    if (!raw) return defaultSettings;
    return { ...defaultSettings, ...JSON.parse(raw) };
  } catch {
    return defaultSettings;
  }
}

export function saveSettings(settings: Settings): void {
  try {
    localStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
  } catch {
    // ignore — localStorage may be blocked in some environments
  }
}
