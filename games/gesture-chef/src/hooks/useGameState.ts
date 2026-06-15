import { useState, useCallback } from 'react';
import type {
  Screen, Recipe, MinigameResult, GameSession, PlayerProgress, GameSettings,
} from '../types';
import {
  loadProgress, saveProgress, loadSettings, saveSettings,
  updateHighScore, addStars, computeNewUnlocks,
} from '../utils/storage';
import { MINIGAME_MAX_SCORES, STAR_THRESHOLDS } from '../constants/gameConfig';

interface State {
  screen: Screen;
  selectedRecipe: Recipe | null;
  currentMinigameIndex: number;
  sessionResults: MinigameResult[];
  lastSession: GameSession | null;
  progress: PlayerProgress;
  settings: GameSettings;
}

export function useGameState() {
  const [state, setState] = useState<State>(() => ({
    screen: 'home',
    selectedRecipe: null,
    currentMinigameIndex: 0,
    sessionResults: [],
    lastSession: null,
    progress: loadProgress(),
    settings: loadSettings(),
  }));

  const navigateTo = useCallback((screen: Screen) => {
    setState(s => ({ ...s, screen }));
  }, []);

  const selectRecipe = useCallback((recipe: Recipe) => {
    setState(s => ({
      ...s,
      selectedRecipe: recipe,
      currentMinigameIndex: 0,
      sessionResults: [],
      screen: 'playing',
    }));
  }, []);

  const completeMinigame = useCallback((result: MinigameResult) => {
    setState(s => {
      if (!s.selectedRecipe) return s;
      const results = [...s.sessionResults, result];
      const nextIdx = s.currentMinigameIndex + 1;
      const isLast = nextIdx >= s.selectedRecipe.minigames.length;

      if (!isLast) {
        return { ...s, sessionResults: results, currentMinigameIndex: nextIdx };
      }

      // Session complete — tally everything
      const totalScore = results.reduce((acc, r) => acc + r.score, 0);
      const maxPossible = results.reduce((acc, r) => acc + r.maxScore, 0);
      const ratio = maxPossible > 0 ? totalScore / maxPossible : 0;
      const starsEarned =
        ratio >= STAR_THRESHOLDS.three ? 3
        : ratio >= STAR_THRESHOLDS.two ? 2
        : ratio >= STAR_THRESHOLDS.one ? 1
        : 0;

      const { progress: p1, isNewRecord } = updateHighScore(
        s.selectedRecipe.id, totalScore, s.progress
      );
      const p2 = addStars(starsEarned, p1);
      const { updatedProgress: p3, newUnlocks } = computeNewUnlocks(p2);
      saveProgress(p3);

      const session: GameSession = {
        recipeId: s.selectedRecipe.id,
        recipe: s.selectedRecipe,
        difficulty: s.settings.difficulty,
        results,
        totalScore,
        starsEarned,
        isNewRecord,
        newUnlocks,
      };

      return {
        ...s,
        sessionResults: results,
        currentMinigameIndex: nextIdx,
        lastSession: session,
        progress: p3,
        screen: 'results',
      };
    });
  }, []);

  const updateSettings = useCallback((settings: GameSettings) => {
    saveSettings(settings);
    setState(s => ({ ...s, settings }));
  }, []);

  const currentMinigameType = state.selectedRecipe
    ? state.selectedRecipe.minigames[state.currentMinigameIndex]
    : null;

  const currentMinigameMaxScore = currentMinigameType
    ? MINIGAME_MAX_SCORES[currentMinigameType]
    : 0;

  return {
    ...state,
    currentMinigameType,
    currentMinigameMaxScore,
    navigateTo,
    selectRecipe,
    completeMinigame,
    updateSettings,
  };
}
