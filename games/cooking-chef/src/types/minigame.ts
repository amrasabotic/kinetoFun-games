import type { HandData, MinigameId, MinigameResult } from './index';
import type { ParticleSystem } from '@/systems/ParticleSystem';
import type { ScoreSystem } from '@/systems/ScoreSystem';
import type { AudioSynth } from '@/systems/AudioSynth';

export interface MinigameContext {
  ctx: CanvasRenderingContext2D;
  W: number;
  H: number;
  dt: number;
  hands: HandData[];
  particles: ParticleSystem;
  score: ScoreSystem;
  audio: AudioSynth;
}

export interface MinigameModule {
  id: MinigameId;
  name: string;
  icon: string;
  hint: string;
  duration: number;   // seconds at medium difficulty
  maxScore: number;

  /** Called once before the countdown begins. */
  init(ctx: MinigameContext): void;

  /**
   * Called every frame during play state.
   * Returns true to signal early completion (all targets cleared).
   */
  update(ctx: MinigameContext): boolean | void;

  /** Called when timer expires or update() returns true. */
  finish(ctx: MinigameContext): MinigameResult;

  /** Optional cleanup. */
  dispose?(): void;
}
