import type { Difficulty } from '../../types';

export interface MinigameComponentProps {
  difficulty: Difficulty;
  paused: boolean;
  onScore: (points: number) => void;
  onCombo: (combo: number) => void;
  onTimeUp: () => void;
}
