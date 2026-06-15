import React, { useEffect, useState } from 'react';
import type { GameSession } from '../../types';
import { MINIGAME_INFO } from '../../constants/gameConfig';
import { RECIPES } from '../../data/recipes';
import { StarDisplay } from '../ui/StarDisplay';
import { Button } from '../ui/Button';
import { audioManager } from '../../utils/audio';

interface Props {
  session: GameSession;
  onPlayAgain: () => void;
  onHome: () => void;
}

export const ResultsScreen: React.FC<Props> = ({ session, onPlayAgain, onHome }) => {
  const [revealed, setRevealed] = useState(false);
  const [showUnlocks, setShowUnlocks] = useState(false);

  useEffect(() => {
    // Staggered reveal
    const t1 = setTimeout(() => {
      setRevealed(true);
      if (session.starsEarned > 0) audioManager.star();
      else audioManager.complete();
    }, 400);
    const t2 = setTimeout(() => {
      if (session.newUnlocks.length > 0) {
        setShowUnlocks(true);
        audioManager.unlock();
      }
    }, 1800);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [session]);

  const { recipe } = session;

  return (
    <div style={{
      minHeight: '100vh',
      background: `linear-gradient(160deg, ${recipe.bgColor} 0%, #fff 60%, ${recipe.bgColor} 100%)`,
      fontFamily: 'Nunito, sans-serif',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', padding: 'clamp(20px,4vw,48px)',
      gap: 'clamp(16px,2.5vw,28px)',
    }}>
      {/* Recipe complete header */}
      <div style={{ textAlign: 'center' }}>
        <div style={{
          fontSize: 'clamp(4rem,10vw,7rem)',
          animation: revealed ? 'popIn 0.6s cubic-bezier(.36,.07,.19,.97) both' : 'none',
        }}>
          {recipe.emoji}
        </div>
        <h1 style={{
          margin: '8px 0 4px',
          fontSize: 'clamp(1.8rem,5vw,3rem)',
          fontWeight: 900,
          color: recipe.color,
        }}>
          {recipe.name} Complete!
        </h1>
        {session.isNewRecord && (
          <div style={{
            display: 'inline-block',
            background: 'linear-gradient(135deg, #FF6B35, #FFD700)',
            color: '#fff', borderRadius: 20,
            padding: '5px 20px', fontWeight: 800,
            fontSize: '1rem',
            animation: 'popIn 0.5s ease 0.8s both',
          }}>
            🎉 NEW RECORD!
          </div>
        )}
      </div>

      {/* Stars earned */}
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
        animation: revealed ? 'slideUp 0.5s ease 0.3s both' : 'none',
      }}>
        <StarDisplay count={session.starsEarned} size={clamp(36, 48, 64)} animated={revealed} />
        <span style={{ color: '#888', fontWeight: 700, fontSize: '1rem' }}>
          {session.starsEarned === 3 ? 'Perfect! ⭐⭐⭐' : session.starsEarned === 2 ? 'Great job! ⭐⭐' : session.starsEarned === 1 ? 'Good try! ⭐' : 'Keep practicing!'}
        </span>
      </div>

      {/* Score card */}
      <div style={{
        background: 'rgba(255,255,255,0.95)',
        borderRadius: 24,
        padding: 'clamp(16px,3vw,28px)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
        border: `3px solid ${recipe.color}40`,
        width: '100%',
        maxWidth: 520,
        animation: revealed ? 'slideUp 0.5s ease 0.5s both' : 'none',
      }}>
        <div style={{
          textAlign: 'center', marginBottom: 20,
          fontWeight: 900, fontSize: 'clamp(1.8rem,4vw,2.6rem)', color: recipe.color,
        }}>
          {session.totalScore.toLocaleString()} pts
        </div>

        {/* Per-minigame breakdown */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {session.results.map((result, i) => {
            const info = MINIGAME_INFO[result.type];
            const pct = result.maxScore > 0 ? result.score / result.maxScore : 0;
            return (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 14px', borderRadius: 14,
                background: 'rgba(0,0,0,0.03)',
              }}>
                <span style={{ fontSize: '1.6rem' }}>{info.emoji}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#333' }}>{info.name}</div>
                  <div style={{
                    height: 6, background: '#eee', borderRadius: 3, marginTop: 4, overflow: 'hidden',
                  }}>
                    <div style={{
                      width: `${Math.round(pct * 100)}%`,
                      height: '100%',
                      background: recipe.color,
                      borderRadius: 3,
                      transition: 'width 0.8s ease 0.8s',
                    }} />
                  </div>
                </div>
                <div style={{ fontWeight: 800, fontSize: '0.95rem', color: recipe.color, minWidth: 72, textAlign: 'right' }}>
                  {result.score.toLocaleString()} pts
                </div>
                <StarDisplay count={result.stars} maxCount={3} size={16} />
              </div>
            );
          })}
        </div>
      </div>

      {/* New unlocks */}
      {showUnlocks && session.newUnlocks.length > 0 && (
        <div style={{
          background: 'linear-gradient(135deg, #FFD700, #FF9F1C)',
          borderRadius: 20, padding: '16px 28px', textAlign: 'center',
          animation: 'popIn 0.6s cubic-bezier(.36,.07,.19,.97) both',
          boxShadow: '0 8px 24px rgba(255,215,0,0.4)',
        }}>
          <div style={{ fontWeight: 900, fontSize: '1.2rem', color: '#fff', marginBottom: 8 }}>
            🔓 New Recipes Unlocked!
          </div>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            {session.newUnlocks.map(id => {
              const r = RECIPES.find(x => x.id === id);
              return r ? (
                <span key={id} style={{
                  background: 'rgba(255,255,255,0.9)',
                  borderRadius: 14, padding: '6px 16px',
                  fontWeight: 800, fontSize: '1rem', color: '#333',
                }}>
                  {r.emoji} {r.name}
                </span>
              ) : null;
            })}
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center' }}>
        <Button size="lg" onClick={onPlayAgain}>🔄 Play Again</Button>
        <Button variant="secondary" size="lg" onClick={onHome}>🏠 Home</Button>
      </div>
    </div>
  );
};

function clamp(min: number, val: number, max: number) {
  return Math.min(Math.max(val, min), max);
}
