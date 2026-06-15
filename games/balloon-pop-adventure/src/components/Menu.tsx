import React from 'react';
import type { HighScores, Settings } from '../game/types';

interface MenuProps {
  highScores:  HighScores;
  settings:    Settings;
  onPlay:      () => void;
  onSettings:  () => void;
  onHowToPlay: () => void;
}

export function Menu({ highScores, settings, onPlay, onSettings, onHowToPlay }: MenuProps) {
  return (
    <div style={{
      position:       'absolute',
      inset:          0,
      display:        'flex',
      flexDirection:  'column',
      alignItems:     'center',
      justifyContent: 'center',
      background:     'rgba(0,0,0,0.6)',
      backdropFilter: 'blur(4px)',
      zIndex:         10,
      padding:        'clamp(12px, 3vw, 40px)',
      overflow:       'hidden',
    }}>
      {/* Title */}
      <div style={{
        fontSize:     'clamp(2.2rem, 7vw, 5.5rem)',
        fontWeight:   '900',
        textAlign:    'center',
        lineHeight:   1.05,
        background:   'linear-gradient(135deg, #FFD700, #FF6B35, #FF4DB8)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor:  'transparent',
        backgroundClip: 'text',
        filter:       'drop-shadow(0 2px 16px rgba(255,100,0,0.45))',
        letterSpacing: '2px',
        marginBottom: 'clamp(2px, 0.5vh, 8px)',
      }}>
        🎈 Balloon Pop
      </div>
      <div style={{
        fontSize:     'clamp(0.9rem, 2.5vw, 2rem)',
        color:        '#FFD700',
        letterSpacing: '5px',
        textTransform: 'uppercase',
        marginBottom: 'clamp(16px, 4vh, 44px)',
        opacity:      0.9,
      }}>
        Adventure
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(8px, 1.5vh, 16px)', width: '100%', maxWidth: '440px' }}>
        <GestureBtn
          onClick={onPlay}
          style={{
            background: 'linear-gradient(135deg, #FF6B35, #FF4DB8)',
            boxShadow:  '0 6px 30px rgba(255,80,100,0.5)',
            fontSize:   'clamp(1.4rem, 3.5vw, 2.4rem)',
            padding:    'clamp(16px, 3vh, 28px)',
          }}
        >
          🎮 PLAY
        </GestureBtn>

        <GestureBtn onClick={onHowToPlay} outline style={{ fontSize: 'clamp(1rem, 2.5vw, 1.5rem)', padding: 'clamp(12px, 2.2vh, 20px)' }}>
          ❓ How to Play
        </GestureBtn>

        <GestureBtn onClick={onSettings} outline style={{ fontSize: 'clamp(1rem, 2.5vw, 1.5rem)', padding: 'clamp(12px, 2.2vh, 20px)' }}>
          ⚙️ Settings &nbsp;
          <span style={{ fontSize: '0.75em', opacity: 0.7 }}>
            Sound: {settings.soundEnabled ? '🔊' : '🔇'}
          </span>
        </GestureBtn>
      </div>

      {/* High scores */}
      <div style={{
        marginTop:    'clamp(16px, 4vh, 40px)',
        padding:      'clamp(12px, 2.5vw, 24px) clamp(20px, 4vw, 40px)',
        background:   'rgba(255,255,255,0.06)',
        borderRadius: '16px',
        border:       '1px solid rgba(255,255,255,0.12)',
        textAlign:    'center',
        width:        '100%',
        maxWidth:     '440px',
      }}>
        <div style={{
          color:        '#FFD700',
          fontSize:     'clamp(0.85rem, 2vw, 1.1rem)',
          letterSpacing: '3px',
          textTransform: 'uppercase',
          marginBottom: '10px',
        }}>
          🏆 High Scores
        </div>
        <ScoreLine label="Classic" entry={highScores.classic} />
        <ScoreLine label="Endless" entry={highScores.endless} />
        <ScoreLine label="Party"   entry={highScores.party} />
      </div>

      {/* Gesture hint */}
      <div style={{
        marginTop:  'clamp(12px, 2vh, 20px)',
        color:      'rgba(255,255,255,0.35)',
        fontSize:   'clamp(0.7rem, 1.5vw, 0.9rem)',
        textAlign:  'center',
      }}>
        👋 Use hand gestures — hold still over a button to select it
      </div>
    </div>
  );
}

// ─── Reusable big gesture-friendly button ─────────────────────────────────

function GestureBtn({
  children, onClick, outline = false, style = {},
}: {
  children: React.ReactNode;
  onClick: () => void;
  outline?: boolean;
  style?: React.CSSProperties;
}) {
  const [hovered, setHovered] = React.useState(false);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display:      'block',
        width:        '100%',
        fontWeight:   'bold',
        letterSpacing: '2px',
        borderRadius: '14px',
        border:       outline ? '2px solid rgba(255,255,255,0.3)' : 'none',
        background:   outline ? (hovered ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.08)') : undefined,
        color:        '#FFFFFF',
        cursor:       'pointer',
        transition:   'transform 0.12s, opacity 0.12s',
        transform:    hovered ? 'scale(1.03)' : 'scale(1)',
        textAlign:    'center',
        ...style,
      }}
    >
      {children}
    </button>
  );
}

function ScoreLine({ label, entry }: { label: string; entry: { score: number; date: string } | null }) {
  return (
    <div style={{
      display:        'flex',
      justifyContent: 'space-between',
      alignItems:     'center',
      color:          '#FFFFFF',
      fontSize:       'clamp(0.85rem, 2vw, 1.1rem)',
      padding:        '5px 0',
      borderBottom:   '1px solid rgba(255,255,255,0.07)',
    }}>
      <span style={{ opacity: 0.65 }}>{label}</span>
      <span style={{ fontWeight: 'bold', color: entry ? '#FFD700' : 'rgba(255,255,255,0.25)' }}>
        {entry ? entry.score : '—'}
      </span>
    </div>
  );
}
