import type { CharacterId } from './game';
import type { GameSettings } from './gestures';

export interface LeaderboardEntry {
  score: number;
  distance: number;
  coins: number;
  date: string;
  characterId: CharacterId;
}

export interface CharacterUnlock {
  id: CharacterId;
  unlocked: boolean;
  equipped: boolean;
}

export interface DailyChallenge {
  id: string;
  title: string;
  description: string;
  type: 'distance' | 'coins' | 'score' | 'obstacles' | 'powerups';
  target: number;
  progress: number;
  completed: boolean;
  claimed: boolean;
  reward: number; // coins
  date: string; // YYYY-MM-DD
}

export interface StoredData {
  settings: GameSettings;
  leaderboard: LeaderboardEntry[];
  totalCoins: number;
  characters: CharacterUnlock[];
  challenges: DailyChallenge[];
  bestScore: number;
  lastPlayDate: string;
}
