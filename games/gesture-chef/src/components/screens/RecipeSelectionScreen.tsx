import React, { useState } from 'react';
import type { Recipe, Difficulty, PlayerProgress, GameSettings } from '../../types';
import { RECIPES } from '../../data/recipes';
import { DIFFICULTY_SETTINGS } from '../../constants/gameConfig';
import { RecipeCard } from '../ui/RecipeCard';
import { Button } from '../ui/Button';
import { audioManager } from '../../utils/audio';

interface Props {
  progress: PlayerProgress;
  settings: GameSettings;
  onSelectRecipe: (recipe: Recipe) => void;
  onBack: () => void;
  onDifficultyChange: (d: Difficulty) => void;
}

export const RecipeSelectionScreen: React.FC<Props> = ({
  progress, settings, onSelectRecipe, onBack, onDifficultyChange,
}) => {
  const [selectedDiff, setSelectedDiff] = useState<Difficulty>(settings.difficulty);

  const changeDiff = (d: Difficulty) => {
    setSelectedDiff(d);
    onDifficultyChange(d);
    audioManager.tick();
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(160deg, #FFF5E0 0%, #FFE8C8 100%)',
      fontFamily: 'Nunito, sans-serif',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{
        padding: 'clamp(16px,3vw,28px)',
        display: 'flex', alignItems: 'center', gap: 16,
        background: 'rgba(255,255,255,0.8)',
        backdropFilter: 'blur(8px)',
        borderBottom: '2px solid rgba(255,180,80,0.2)',
        flexWrap: 'wrap',
      }}>
        <Button variant="ghost" size="sm" onClick={onBack}>← Back</Button>
        <div style={{ flex: 1 }}>
          <h2 style={{ margin: 0, fontSize: 'clamp(1.3rem,3vw,2rem)', fontWeight: 900, color: '#FF6B35' }}>
            📖 Choose a Recipe
          </h2>
          <p style={{ margin: 0, fontSize: '0.9rem', color: '#AAA', fontWeight: 600 }}>
            ⭐ {progress.totalStars} stars collected
          </p>
        </div>

        {/* Difficulty selector */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {(Object.entries(DIFFICULTY_SETTINGS) as [Difficulty, typeof DIFFICULTY_SETTINGS[Difficulty]][]).map(
            ([key, cfg]) => (
              <button
                key={key}
                onClick={() => changeDiff(key)}
                style={{
                  padding: '8px 16px',
                  borderRadius: 14,
                  border: `2px solid ${selectedDiff === key ? cfg.color : 'transparent'}`,
                  background: selectedDiff === key ? cfg.color : 'rgba(0,0,0,0.06)',
                  color: selectedDiff === key ? '#fff' : '#666',
                  fontFamily: 'Nunito, sans-serif',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  transform: selectedDiff === key ? 'scale(1.05)' : 'scale(1)',
                }}
              >
                {cfg.emoji} {cfg.label}
              </button>
            )
          )}
        </div>
      </div>

      {/* Difficulty info banner */}
      <div style={{
        background: DIFFICULTY_SETTINGS[selectedDiff].color + '18',
        border: `2px solid ${DIFFICULTY_SETTINGS[selectedDiff].color}40`,
        borderRadius: 0,
        padding: '10px 24px',
        display: 'flex', alignItems: 'center', gap: 10,
        fontWeight: 700, fontSize: '0.9rem', color: '#555',
      }}>
        <span style={{ fontSize: '1.2rem' }}>{DIFFICULTY_SETTINGS[selectedDiff].emoji}</span>
        <span>
          <strong style={{ color: DIFFICULTY_SETTINGS[selectedDiff].color }}>
            {DIFFICULTY_SETTINGS[selectedDiff].label} Mode
          </strong>
          {selectedDiff === 'easy' && ' — Longer timers, bigger targets, great for beginners!'}
          {selectedDiff === 'medium' && ' — Balanced challenge. Score ×1.5 multiplier!'}
          {selectedDiff === 'hard' && ' — Fast & furious! Score ×2 multiplier. Are you up for it?'}
        </span>
      </div>

      {/* Recipe grid */}
      <div style={{
        flex: 1,
        padding: 'clamp(16px,3vw,32px)',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
        gap: 'clamp(12px,2vw,24px)',
        alignContent: 'start',
      }}>
        {RECIPES.map(recipe => (
          <RecipeCard
            key={recipe.id}
            recipe={recipe}
            isUnlocked={progress.unlockedRecipes.includes(recipe.id)}
            bestScore={progress.highScores[recipe.id]}
            totalStars={progress.totalStars}
            onClick={() => {
              audioManager.chop();
              onSelectRecipe(recipe);
            }}
          />
        ))}
      </div>
    </div>
  );
};
