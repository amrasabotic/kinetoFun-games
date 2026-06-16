'use client';
import { useMemo } from 'react';
import type { MinigameId } from '@/types';
import { storage } from '@/storage/localStorage';
import { STORY_SEQUENCE } from './useGameState';

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

export function getDailySequence(dateStr: string): MinigameId[] {
  const seed = dateStr.split('-').reduce((acc, p) => acc * 100 + Number(p), 0);
  const rand = seededRandom(seed);
  const all = [...STORY_SEQUENCE.filter(id => id !== 'ultimate-showdown')];
  for (let i = all.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [all[i], all[j]] = [all[j], all[i]];
  }
  return all.slice(0, 5);
}

export function useDailyChallenge() {
  const today = new Date().toISOString().slice(0, 10);
  const sequence = useMemo(() => getDailySequence(today), [today]);
  const daily = storage.getOrDefault('dailyChallenge');
  const alreadyPlayed = daily.lastPlayedDate === today;
  const streak = daily.streak;
  return { sequence, alreadyPlayed, streak, today };
}

export function completeDailyChallenge(today: string, score: number): void {
  storage.update('dailyChallenge', current => {
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const streak = current.lastPlayedDate === yesterday ? current.streak + 1 : 1;
    return { lastPlayedDate: today, streak, bestDailyScore: Math.max(current.bestDailyScore, score) };
  });
}
