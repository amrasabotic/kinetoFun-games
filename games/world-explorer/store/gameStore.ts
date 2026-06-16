import { create } from 'zustand';
import { Question, getRandomQuestions } from '@/lib/questions';
import { getHighScore, saveHighScore, saveProgress } from '@/lib/scoring';

export type GameMode = 'CLASSIC' | 'TIME_CHALLENGE' | 'LEARNING';
export type GameScreen =
  | 'MAIN_MENU'
  | 'MODE_SELECT'
  | 'DESTINATION'
  | 'QUESTION'
  | 'FEEDBACK'
  | 'RESULTS';

interface GameState {
  screen: GameScreen;
  mode: GameMode | null;
  score: number;
  streak: number;
  multiplier: number;
  timeLeft: number;
  maxTime: number;
  questions: Question[];
  currentIndex: number;
  selectedOption: number | null;
  isCorrect: boolean | null;
  totalAnswered: number;
  totalCorrect: number;
  highScores: Record<string, number>;

  // actions
  startMode: (mode: GameMode) => void;
  nextQuestion: () => void;
  selectOption: (index: number) => void;
  goToDestination: () => void;
  goToResults: () => void;
  resetGame: () => void;
  tickTime: () => void;
  showModeSelect: () => void;
}

const QUESTIONS_PER_GAME = 10;
const TIME_PER_QUESTION = 20000; // ms

export const useGameStore = create<GameState>((set, get) => ({
  screen: 'MAIN_MENU',
  mode: null,
  score: 0,
  streak: 0,
  multiplier: 1,
  timeLeft: TIME_PER_QUESTION,
  maxTime: TIME_PER_QUESTION,
  questions: [],
  currentIndex: 0,
  selectedOption: null,
  isCorrect: null,
  totalAnswered: 0,
  totalCorrect: 0,
  highScores: {
    CLASSIC: getHighScore('CLASSIC'),
    TIME_CHALLENGE: getHighScore('TIME_CHALLENGE'),
    LEARNING: getHighScore('LEARNING'),
  },

  showModeSelect: () => set({ screen: 'MODE_SELECT' }),

  startMode: (mode) => {
    const questions = getRandomQuestions(QUESTIONS_PER_GAME);
    set({
      mode,
      screen: 'DESTINATION',
      score: 0,
      streak: 0,
      multiplier: 1,
      timeLeft: TIME_PER_QUESTION,
      maxTime: TIME_PER_QUESTION,
      questions,
      currentIndex: 0,
      selectedOption: null,
      isCorrect: null,
      totalAnswered: 0,
      totalCorrect: 0,
    });
  },

  goToDestination: () => {
    set({ screen: 'DESTINATION', selectedOption: null, isCorrect: null });
  },

  nextQuestion: () => {
    const { currentIndex, questions } = get();
    if (currentIndex + 1 >= questions.length) {
      get().goToResults();
      return;
    }
    set({
      screen: 'DESTINATION',
      currentIndex: currentIndex + 1,
      selectedOption: null,
      isCorrect: null,
      timeLeft: TIME_PER_QUESTION,
    });
  },

  selectOption: (index) => {
    const { questions, currentIndex, score, streak, timeLeft, maxTime, mode, totalAnswered, totalCorrect } = get();
    if (get().selectedOption !== null) return; // already answered

    const question = questions[currentIndex];
    const isCorrect = index === question.correctIndex;

    const newStreak = isCorrect ? streak + 1 : 0;
    const multiplier = newStreak >= 8 ? 4 : newStreak >= 5 ? 3 : newStreak >= 3 ? 2 : 1;

    let points = 0;
    if (isCorrect) {
      const base = 10;
      const timeFraction = timeLeft / maxTime;
      const fastBonus = timeFraction > 0.5 ? 5 : 0;
      points = (base + fastBonus) * multiplier;
    }

    const newScore = score + points;
    const newTotalAnswered = totalAnswered + 1;
    const newTotalCorrect = totalCorrect + (isCorrect ? 1 : 0);

    set({
      selectedOption: index,
      isCorrect,
      score: newScore,
      streak: newStreak,
      multiplier,
      screen: 'FEEDBACK',
      totalAnswered: newTotalAnswered,
      totalCorrect: newTotalCorrect,
    });

    saveProgress(newTotalAnswered, newTotalCorrect);
  },

  goToResults: () => {
    const { score, mode } = get();
    if (mode) {
      saveHighScore(mode, score);
    }
    set({
      screen: 'RESULTS',
      highScores: {
        CLASSIC: getHighScore('CLASSIC'),
        TIME_CHALLENGE: getHighScore('TIME_CHALLENGE'),
        LEARNING: getHighScore('LEARNING'),
      },
    });
  },

  resetGame: () => {
    set({
      screen: 'MAIN_MENU',
      mode: null,
      score: 0,
      streak: 0,
      multiplier: 1,
      selectedOption: null,
      isCorrect: null,
    });
  },

  tickTime: () => {
    const { timeLeft, mode, screen } = get();
    if (screen !== 'QUESTION' || mode !== 'TIME_CHALLENGE') return;
    if (timeLeft <= 0) {
      get().selectOption(-1); // timeout = wrong answer
      return;
    }
    set({ timeLeft: Math.max(0, timeLeft - 100) });
  },
}));
