import type { Difficulty, MinigameType } from '../types';

export const DIFFICULTY_SETTINGS: Record<
  Difficulty,
  {
    timeMultiplier: number;
    targetSize: number;
    speedMultiplier: number;
    scoreMultiplier: number;
    label: string;
    emoji: string;
    color: string;
  }
> = {
  easy: {
    timeMultiplier: 1.5,
    targetSize: 1.3,
    speedMultiplier: 0.7,
    scoreMultiplier: 1,
    label: 'Easy',
    emoji: '🌱',
    color: '#7BC67E',
  },
  medium: {
    timeMultiplier: 1,
    targetSize: 1,
    speedMultiplier: 1,
    scoreMultiplier: 1.5,
    label: 'Medium',
    emoji: '🔥',
    color: '#FFD700',
  },
  hard: {
    timeMultiplier: 0.7,
    targetSize: 0.75,
    speedMultiplier: 1.4,
    scoreMultiplier: 2,
    label: 'Hard',
    emoji: '💀',
    color: '#FF4444',
  },
};

export const MINIGAME_BASE_DURATIONS: Record<MinigameType, number> = {
  'vegetable-chop': 45,
  'stir-soup': 30,
  'pancake-flip': 40,
  'cake-decorate': 60,
};

export const MINIGAME_MAX_SCORES: Record<MinigameType, number> = {
  'vegetable-chop': 500,
  'stir-soup': 200,
  'pancake-flip': 300,
  'cake-decorate': 400,
};

export const MINIGAME_INFO: Record<
  MinigameType,
  { name: string; emoji: string; description: string; instructions: string }
> = {
  'vegetable-chop': {
    name: 'Chop Chop!',
    emoji: '🔪',
    description: 'Slice all the vegetables!',
    instructions: 'Drag across veggies to chop them. Build combos for big points!',
  },
  'stir-soup': {
    name: 'Stir It Up!',
    emoji: '🥄',
    description: 'Stir the soup to perfection!',
    instructions: 'Make circular motions inside the pot to stir!',
  },
  'pancake-flip': {
    name: 'Flip It!',
    emoji: '🥞',
    description: 'Flip pancakes at the perfect moment!',
    instructions: 'Swipe UP fast to flip the pancake when it turns golden!',
  },
  'cake-decorate': {
    name: 'Decorate!',
    emoji: '🎂',
    description: 'Create a masterpiece cake!',
    instructions: 'Click decorations, then place them on the cake!',
  },
};

export const STAR_THRESHOLDS = {
  three: 0.85,
  two: 0.6,
  one: 0.3,
} as const;

export const STORAGE_KEY_PREFIX = 'gesture-chef';

export const INITIAL_UNLOCKED_RECIPES = ['vegetable-soup', 'pancakes'];
