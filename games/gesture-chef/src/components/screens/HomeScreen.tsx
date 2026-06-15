import React, { useState } from 'react';
import type { GameSettings } from '../../types';
import { Button } from '../ui/Button';
import { audioManager } from '../../utils/audio';

interface HomeScreenProps {
  totalStars: number;
  bestScore: number;
  settings: GameSettings;
  onPlay: () => void;
  onSettings: () => void;
}

const BG_EMOJIS = ['🍅', '🥕', '🧅', '🥦', '🍄', '🥒', '🧄', '🍳', '🥘', '🍜', '🥗', '🎂'];

export const HomeScreen: React.FC<HomeScreenProps> = ({
  totalStars, bestScore, onPlay, onSettings,
}) => {
  const [showHowTo, setShowHowTo] = useState(false);
  return (
  /* position: fixed + overflow-y: auto lets this screen escape the parent
     overflow:hidden clip and scroll on small displays */
  <div style={{
    position: 'fixed', inset: 0,
    overflowY: 'auto',
    background: 'linear-gradient(160deg, #FFF5E0 0%, #FFE8C8 50%, #FFF0D0 100%)',
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center',
    padding: 'clamp(16px, 2.5vh, 36px) 20px',
    gap: 'clamp(12px, 2vh, 28px)',
    fontFamily: "'Nunito','Segoe UI',system-ui,-apple-system,sans-serif",
  }}>
    {/* Floating background food decorations */}
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
      {BG_EMOJIS.map((emoji, i) => (
        <span key={i} style={{
          position: 'absolute',
          fontSize: `${1.5 + (i % 3) * 0.6}rem`,
          opacity: 0.1,
          top: `${(i * 17 + 5) % 88}%`,
          left: `${(i * 13 + 3) % 92}%`,
          animation: `floatBob ${3 + i * 0.5}s ease-in-out infinite`,
          animationDelay: `${i * 0.35}s`,
        }}>{emoji}</span>
      ))}
    </div>

    {/* Chef logo */}
    <div style={{ textAlign: 'center', zIndex: 1 }}>
      <div style={{
        fontSize: 'clamp(3.5rem, 8vw, 6rem)',
        marginBottom: 6,
        display: 'inline-block',
        animation: 'chefBounce 3s ease-in-out infinite',
        filter: 'drop-shadow(0 6px 18px rgba(255,107,53,0.25))',
      }}>
        👨‍🍳
      </div>
      <h1 style={{
        margin: 0,
        fontSize: 'clamp(2.2rem, 6.5vw, 4.5rem)',
        fontWeight: 900,
        background: 'linear-gradient(135deg, #FF6B35 0%, #FF9F1C 50%, #FFD700 100%)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
        lineHeight: 1.05,
        letterSpacing: '-1px',
        textShadow: 'none',
      }}>
        Gesture Chef
      </h1>
      <p style={{
        margin: '6px 0 0',
        fontSize: 'clamp(0.9rem, 2vw, 1.3rem)',
        color: '#AA7744',
        fontWeight: 700,
        letterSpacing: '0.2px',
      }}>
        Cook with your hands. Become the ultimate chef!
      </p>
    </div>

    {/* Stats cards */}
    <div style={{ display: 'flex', gap: 16, zIndex: 1, flexWrap: 'wrap', justifyContent: 'center' }}>
      {[
        { emoji: '⭐', value: totalStars, label: 'Stars' },
        { emoji: '🏆', value: bestScore > 0 ? bestScore.toLocaleString() : '—', label: 'Best Score' },
      ].map(({ emoji, value, label }) => (
        <div key={label} style={{
          background: 'rgba(255,255,255,0.9)',
          backdropFilter: 'blur(8px)',
          borderRadius: 18,
          padding: 'clamp(10px,1.5vw,18px) clamp(16px,2.5vw,30px)',
          boxShadow: '0 4px 18px rgba(0,0,0,0.07)',
          textAlign: 'center',
          border: '2px solid rgba(255,255,255,0.8)',
          minWidth: 110,
        }}>
          <div style={{ fontSize: 'clamp(1.5rem,3.5vw,2.2rem)' }}>{emoji}</div>
          <div style={{
            fontWeight: 900, fontSize: 'clamp(1.3rem,3vw,2rem)',
            color: '#FF6B35', lineHeight: 1.1,
          }}>
            {value}
          </div>
          <div style={{ color: '#AAA', fontSize: '0.8rem', fontWeight: 700, marginTop: 2 }}>
            {label}
          </div>
        </div>
      ))}
    </div>

    {/* CTA buttons */}
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center', zIndex: 1, position: 'relative' }}>
      <Button
        size="xl"
        onClick={() => { audioManager.chop(); onPlay(); }}
      >
        🎮 Play Now!
      </Button>
      <Button variant="ghost" size="lg" onClick={onSettings}>
        ⚙️ Settings
      </Button>
      <Button variant="ghost" size="md" onClick={() => setShowHowTo(true)}>
        ❓ How to Play
      </Button>
    </div>

    {/* Input hint */}
    <p style={{
      color: '#CCA888', fontSize: '0.8rem', fontWeight: 600,
      zIndex: 1, textAlign: 'center', lineHeight: 1.5, margin: 0,
    }}>
      🖱️ Mouse &nbsp;·&nbsp; 📱 Touch &nbsp;·&nbsp; 🤚 Camera gestures (coming soon)
    </p>

    {/* How to Play modal */}
    {showHowTo && (
      <div
        onClick={() => setShowHowTo(false)}
        style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 24,
        }}
      >
        <div
          onClick={e => e.stopPropagation()}
          style={{
            background: '#fff', borderRadius: 28,
            padding: 'clamp(20px,4vw,44px)',
            maxWidth: 540, width: '100%',
            fontFamily: "'Nunito','Segoe UI',system-ui,sans-serif",
            animation: 'popIn 0.4s cubic-bezier(.36,.07,.19,.97) both',
            boxShadow: '0 24px 64px rgba(0,0,0,0.3)',
          }}
        >
          <h2 style={{ margin: '0 0 18px', fontSize: 'clamp(1.4rem,3.5vw,1.9rem)', fontWeight: 900, color: '#FF6B35', textAlign: 'center' }}>
            🍳 How to Play
          </h2>
          {[
            { emoji: '🔪', name: 'Chop Chop!', desc: 'Hold mouse button and drag across vegetables to slice them. The faster you chop, the bigger your combo!' },
            { emoji: '🥄', name: 'Stir It Up!', desc: 'Click inside the pot, then move your mouse in big circles to stir the soup. Fill the bar completely!' },
            { emoji: '🥞', name: 'Flip It!', desc: 'Watch the cooking bar. When it hits the golden zone, quickly swipe the mouse upward (or press Space / ↑).' },
            { emoji: '🎂', name: 'Decorate!', desc: 'Pick a decoration from the left palette, then click anywhere on the cake to place it. Rapid-place for combos!' },
          ].map(({ emoji, name, desc }) => (
            <div key={name} style={{ display: 'flex', gap: 14, marginBottom: 14, alignItems: 'flex-start' }}>
              <span style={{ fontSize: '1.7rem', flexShrink: 0 }}>{emoji}</span>
              <div>
                <div style={{ fontWeight: 800, color: '#2D2D2D', marginBottom: 3 }}>{name}</div>
                <div style={{ color: '#666', fontSize: '0.88rem', lineHeight: 1.5 }}>{desc}</div>
              </div>
            </div>
          ))}
          <button
            onClick={() => setShowHowTo(false)}
            style={{
              display: 'block', width: '100%', marginTop: 8,
              background: 'linear-gradient(135deg, #FF6B35, #FF8C42)',
              color: '#fff', border: 'none', borderRadius: 14,
              padding: '12px', fontSize: '1.05rem', fontWeight: 800,
              cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            Got it! 👍
          </button>
        </div>
      </div>
    )}
  </div>
  );
};
