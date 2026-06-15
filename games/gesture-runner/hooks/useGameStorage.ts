'use client';

import { useState, useCallback } from 'react';
import { GameStorage } from '../storage/GameStorage';
import type { GameSettings } from '../types/gestures';
import type { LeaderboardEntry } from '../types/storage';
import type { CharacterId } from '../types/game';

export function useGameStorage() {
  const [settings, setSettingsState] = useState<GameSettings>(() => GameStorage.getSettings());
  const [bestScore, setBestScore] = useState<number>(() => GameStorage.getBestScore());
  const [totalCoins, setTotalCoins] = useState<number>(() => GameStorage.getTotalCoins());

  const saveSettings = useCallback((s: GameSettings) => {
    GameStorage.saveSettings(s);
    setSettingsState(s);
  }, []);

  const addRun = useCallback(
    (entry: LeaderboardEntry) => {
      GameStorage.addLeaderboardEntry(entry);
      const isNew = GameStorage.updateBestScore(entry.score);
      if (isNew) setBestScore(entry.score);
      const coins = GameStorage.addCoins(entry.coins);
      setTotalCoins(coins);

      // Update challenges
      GameStorage.updateChallengeProgress('distance', entry.distance);
      GameStorage.updateChallengeProgress('coins', entry.coins);
      GameStorage.updateChallengeProgress('score', entry.score);

      GameStorage.setLastPlayDate();

      // Check character unlocks
      const chars = GameStorage.getCharacters();
      if (!chars.find((c) => c.id === 'explorer')?.unlocked && coins >= 200) {
        GameStorage.unlockCharacter('explorer');
      }
      if (!chars.find((c) => c.id === 'ninja')?.unlocked && coins >= 500) {
        GameStorage.unlockCharacter('ninja');
      }
      if (!chars.find((c) => c.id === 'robot')?.unlocked && entry.score >= 5000) {
        GameStorage.unlockCharacter('robot');
      }

      return isNew;
    },
    []
  );

  const equipCharacter = useCallback((id: CharacterId) => {
    GameStorage.equipCharacter(id);
  }, []);

  return {
    settings,
    saveSettings,
    bestScore,
    totalCoins,
    addRun,
    equipCharacter,
  };
}
