import React from 'react';
import type { GameMode } from '../game/types';

interface ModeSelectProps {
  onSelect: (mode: GameMode) => void;
  onBack:   () => void;
}

interface ModeInfo {
  mode:        GameMode;
  icon:        string;
  title:       string;
  description: string;
  detail:      string;
  gradient:    string;
  glow:        string;
}

const MODES: ModeInfo[] = [
  {
    mode:        'classic',
    icon:        '⏱️',
    title:       'Classic',
    description: '60-second sprint',
    detail:      'Pop as many balloons as you can before time runs out!',
    gradient:    'linear-gradient(135deg, #4ECDC4, #2196F3)',
    glow:        'rgba(78,205,196,0.45)',
  },
  {
    mode:        'endless',
    icon:        '♾️',
    title:       'Endless',
    description: 'Play forever',
    detail:      'No time limit — pop until you decide to stop!',
    gradient:    'linear-gradient(135deg, #A8E063, #56AB2F)',
    glow:        'rgba(168,224,99,0.45)',
  },
  {
    mode:        'party',
    icon:        '🎉',
    title:       'Party',
    description: '2 players · 90 seconds',
    detail:      'Compete with a friend! Highest score wins!',
    gradient:    'linear-gradient(135deg, #FF6B35, #FF4DB8)',
    glow:        'rgba(255,107,53,0.45)',
  },
];

export function ModeSelect({ onSelect, onBack }: ModeSelectProps) {
  return (
    <div style={{
      position:       'absolute',
      inset:          0,
      display:        'flex',
      flexDirection:  'column',
      alignItems:     'center',
      justifyContent: 'center',
      background:     'rgba(0,0,0,0.7)',
      backdropFilter: 'blur(6px)',
      zIndex:         10,
      padding:        'clamp(12px, 3vw, 40px)',
      overflow:       'hidden',
    }}>
      <div style={{
        fontSize:     'clamp(1.6rem, 4.5vw, 3rem)',
        fontWeight:   '900',
        color:        '#FFFFFF',
        marginBottom: 'clamp(16px, 4vh, 40px)',
        letterSpacing: '3px',
        textAlign:    'center',
      }}>
        Choose Your Game
      </div>

      {/* Mode cards — flex wrap for any screen size */}
      <div style={{
        display:        'flex',
        gap:            'clamp(10px, 2vw, 24px)',
        flexWrap:       'wrap',
        justifyContent: 'center',
        maxWidth:       '1100px',
        width:          '100%',
        marginBottom:   'clamp(16px, 4vh, 40px)',
      }}>
        {MODES.map(m => <ModeCard key={m.mode} info={m} onSelect={onSelect} />)}
      </div>

      {/* Back button */}
      <button
        style={{
          padding:      'clamp(12px, 2vh, 18px) clamp(28px, 5vw, 56px)',
          fontSize:     'clamp(1rem, 2.5vw, 1.4rem)',
          background:   'rgba(255,255,255,0.1)',
          color:        '#FFFFFF',
          border:       '2px solid rgba(255,255,255,0.25)',
          borderRadius: '12px',
          cursor:       'pointer',
          letterSpacing: '2px',
          transition:   'transform 0.12s',
        }}
        onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.04)')}
        onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
        onClick={onBack}
      >
        ← Back
      </button>
    </div>
  );
}

function ModeCard({ info, onSelect }: { info: ModeInfo; onSelect: (m: GameMode) => void }) {
  const [hovered, setHovered] = React.useState(false);

  return (
    <button
      style={{
        flex:         '1 1 220px',
        maxWidth:     'clamp(220px, 28vw, 310px)',
        padding:      'clamp(20px, 3.5vw, 40px) clamp(16px, 3vw, 36px)',
        background:   hovered ? info.gradient : 'rgba(255,255,255,0.07)',
        borderRadius: '20px',
        border:       `2px solid ${hovered ? 'transparent' : 'rgba(255,255,255,0.18)'}`,
        cursor:       'pointer',
        textAlign:    'center',
        transition:   'all 0.2s ease',
        transform:    hovered ? 'scale(1.06) translateY(-4px)' : 'scale(1)',
        boxShadow:    hovered ? `0 12px 40px ${info.glow}` : '0 4px 16px rgba(0,0,0,0.3)',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => onSelect(info.mode)}
    >
      <div style={{ fontSize: 'clamp(2.4rem, 5vw, 3.8rem)', marginBottom: '10px' }}>{info.icon}</div>
      <div style={{
        fontSize:     'clamp(1.3rem, 3vw, 1.9rem)',
        fontWeight:   '900',
        color:        '#FFFFFF',
        marginBottom: '6px',
        letterSpacing: '2px',
      }}>
        {info.title}
      </div>
      <div style={{
        fontSize:     'clamp(0.8rem, 1.8vw, 1rem)',
        color:        hovered ? 'rgba(255,255,255,0.9)' : '#FFD700',
        marginBottom: 'clamp(8px, 1.5vh, 14px)',
        fontWeight:   'bold',
      }}>
        {info.description}
      </div>
      <div style={{
        fontSize:   'clamp(0.75rem, 1.5vw, 0.9rem)',
        color:      hovered ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.5)',
        lineHeight: 1.5,
      }}>
        {info.detail}
      </div>
    </button>
  );
}
