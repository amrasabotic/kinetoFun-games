'use client';
import { useReducer, createContext, useContext, Dispatch } from 'react';
import type { GameState, GameAction, GameMode, MinigameId } from '@/types';

const initial: GameState = {
  screen: 'loading',
  mpReady: false,
  mode: 'story',
  sequence: [],
  mgIndex: 0,
  mgResults: [],
  session: null,
  partyPlayers: [],
  partyCurrentIdx: 0,
  partyRound: 1,
};

function reducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'MP_READY':
      return { ...state, mpReady: true, screen: 'calibrate' };
    case 'CALIBRATION_DONE':
      return { ...state, screen: 'menu' };
    case 'START_GAME':
      return { ...state, mode: action.mode, sequence: action.sequence, mgIndex: 0, mgResults: [], screen: 'countdown' };
    case 'MINIGAME_COMPLETE':
      return { ...state, mgResults: [...state.mgResults, action.result] };
    case 'TRANSITION_DONE':
      return { ...state, screen: 'countdown', mgIndex: state.mgIndex + 1 };
    case 'SESSION_COMPLETE':
      return { ...state, session: action.session, screen: 'results' };
    case 'NAVIGATE':
      return { ...state, screen: action.screen };
    case 'PARTY_PLAYER_DONE': {
      const updated = state.partyPlayers.map((p, i) =>
        i === state.partyCurrentIdx ? { ...p, score: action.score, stars: action.stars } : p
      );
      const nextIdx = state.partyCurrentIdx + 1;
      if (nextIdx >= updated.length) return { ...state, partyPlayers: updated, screen: 'leaderboard' };
      return { ...state, partyPlayers: updated, partyCurrentIdx: nextIdx, mgIndex: 0, mgResults: [], screen: 'countdown' };
    }
    case 'PARTY_NEXT_PLAYER': {
      const nextIdx = state.partyCurrentIdx + 1;
      if (nextIdx >= state.partyPlayers.length) return { ...state, screen: 'leaderboard' };
      return { ...state, partyCurrentIdx: nextIdx, mgIndex: 0, mgResults: [], screen: 'countdown' };
    }
    case 'SET_PARTY_NAMES':
      return { ...state, partyPlayers: action.names.map(n => ({ name: n, score: 0, stars: 0 })), partyCurrentIdx: 0, partyRound: 1 };
    default:
      return state;
  }
}

export const GameContext = createContext<{ state: GameState; dispatch: Dispatch<GameAction> } | null>(null);

export function useGameState() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGameState must be used inside GameContext.Provider');
  return ctx;
}

export function useGameReducer() {
  return useReducer(reducer, initial);
}

/* Helpers for building sequences */
export const STORY_SEQUENCE: MinigameId[] = [
  'veg-chop', 'stir-soup', 'flip-pancake', 'decorate-cake', 'burger-stack',
  'pizza-master', 'sushi-roller', 'ice-cream', 'smoothie-frenzy', 'bbq-grill',
  'dumpling-dash', 'ultimate-showdown',
];

export const SHORT_SEQUENCE: MinigameId[] = STORY_SEQUENCE.slice(0, 5);

export function buildEndlessSequence(level: number): MinigameId[] {
  const pool = STORY_SEQUENCE.slice(0, Math.min(5 + level, STORY_SEQUENCE.length));
  return [...pool].sort(() => Math.random() - 0.5).slice(0, 5) as MinigameId[];
}

export function getModeLabel(mode: GameMode): string {
  const labels: Record<GameMode, string> = { story: 'Story Mode', endless: 'Endless Mode', daily: 'Daily Challenge', party: 'Party Mode' };
  return labels[mode];
}
