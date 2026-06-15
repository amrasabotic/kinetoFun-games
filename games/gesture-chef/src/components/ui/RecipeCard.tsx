import React, { useState } from 'react';
import type { Recipe } from '../../types';
import { StarDisplay } from './StarDisplay';

interface RecipeCardProps {
  recipe: Recipe;
  isUnlocked: boolean;
  bestScore?: number;
  totalStars: number;
  onClick: () => void;
}

const DIFF_LABEL: Record<string, string> = { easy: '🌱 Easy', medium: '🔥 Medium', hard: '💀 Hard' };

export const RecipeCard: React.FC<RecipeCardProps> = ({
  recipe, isUnlocked, bestScore, totalStars, onClick,
}) => {
  const [hovered, setHovered] = useState(false);
  const starsNeeded = Math.max(0, recipe.starsRequired - totalStars);

  return (
    <div
      role={isUnlocked ? 'button' : undefined}
      tabIndex={isUnlocked ? 0 : undefined}
      onClick={isUnlocked ? onClick : undefined}
      onKeyDown={isUnlocked ? (e) => e.key === 'Enter' && onClick() : undefined}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: isUnlocked
          ? `linear-gradient(145deg, ${recipe.bgColor} 0%, #ffffff 100%)`
          : 'linear-gradient(145deg, #f0f0f0, #e0e0e0)',
        borderRadius: 24,
        padding: '28px 22px',
        cursor: isUnlocked ? 'pointer' : 'default',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        transform: hovered && isUnlocked ? 'translateY(-8px) scale(1.02)' : 'none',
        boxShadow: hovered && isUnlocked
          ? `0 20px 48px ${recipe.color}50`
          : '0 4px 20px rgba(0,0,0,0.07)',
        border: `3px solid ${isUnlocked ? recipe.color : '#d0d0d0'}`,
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 12,
        minHeight: 220,
        userSelect: 'none',
      }}
    >
      {/* Decorative corner accent */}
      {isUnlocked && (
        <div style={{
          position: 'absolute', top: 0, right: 0,
          width: 60, height: 60,
          background: recipe.color,
          opacity: 0.1,
          borderRadius: '0 24px 0 60px',
        }} />
      )}

      {/* Lock overlay */}
      {!isUnlocked && (
        <div style={{
          position: 'absolute', inset: 0,
          background: 'rgba(240,240,240,0.85)',
          borderRadius: 21,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 10, zIndex: 2,
          backdropFilter: 'blur(2px)',
        }}>
          <span style={{ fontSize: 52 }}>🔒</span>
          <span style={{
            fontFamily: 'Nunito, sans-serif', fontWeight: 800,
            color: '#777', fontSize: '1rem', textAlign: 'center', padding: '0 16px',
          }}>
            {starsNeeded > 0 ? `Need ${starsNeeded} more ⭐` : 'Coming soon!'}
          </span>
        </div>
      )}

      <div style={{ fontSize: 64, lineHeight: 1 }}>{recipe.emoji}</div>

      <div style={{
        fontFamily: 'Nunito, sans-serif', fontWeight: 900,
        fontSize: '1.25rem', color: '#2D2D2D', textAlign: 'center',
      }}>
        {recipe.name}
      </div>

      <div style={{
        fontFamily: 'Nunito, sans-serif', fontSize: '0.88rem',
        color: '#777', textAlign: 'center', lineHeight: 1.4, flex: 1,
      }}>
        {recipe.description}
      </div>

      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
        <span style={{
          background: recipe.color, color: '#fff',
          padding: '4px 14px', borderRadius: 12,
          fontSize: '0.8rem', fontWeight: 700,
          fontFamily: 'Nunito, sans-serif',
        }}>
          {DIFF_LABEL[recipe.difficulty]}
        </span>
        <span style={{ fontSize: '0.8rem', color: '#999', fontFamily: 'Nunito, sans-serif', fontWeight: 600 }}>
          {recipe.minigames.length} task{recipe.minigames.length !== 1 ? 's' : ''}
        </span>
      </div>

      {isUnlocked && bestScore !== undefined && bestScore > 0 && (
        <div style={{
          fontFamily: 'Nunito, sans-serif', fontWeight: 700,
          color: recipe.color, fontSize: '0.9rem',
        }}>
          🏆 Best: {bestScore.toLocaleString()} pts
        </div>
      )}

      {isUnlocked && (recipe.starsRequired > 0) && (
        <StarDisplay count={0} maxCount={3} size={20} />
      )}
    </div>
  );
};
