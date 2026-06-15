import React from 'react';

interface PauseScreenProps {
  onResume: () => void;
  onQuit:   () => void;
}

export function PauseScreen({ onResume, onQuit }: PauseScreenProps) {
  return (
    <div style={{
      position:       'absolute',
      inset:          0,
      display:        'flex',
      flexDirection:  'column',
      alignItems:     'center',
      justifyContent: 'center',
      background:     'rgba(0,0,0,0.72)',
      backdropFilter: 'blur(8px)',
      zIndex:         15,
      gap:            'clamp(14px, 3vh, 28px)',
      padding:        'clamp(16px, 3vw, 40px)',
    }}>
      <div style={{
        fontSize:     'clamp(2.2rem, 6vw, 5rem)',
        fontWeight:   '900',
        color:        '#FFFFFF',
        letterSpacing: '6px',
        textShadow:   '0 0 30px rgba(255,255,255,0.25)',
        textAlign:    'center',
      }}>
        ⏸ PAUSED
      </div>

      <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 'clamp(0.85rem, 2vw, 1.1rem)', textAlign: 'center' }}>
        Hover your hand over a button for 1.5 s to select it
      </div>

      <BigBtn gradient="linear-gradient(135deg, #4ECDC4, #2196F3)" glow="rgba(78,205,196,0.4)" onClick={onResume}>
        ▶ RESUME
      </BigBtn>

      <BigBtn outline onClick={onQuit}>
        🏠 Quit to Menu
      </BigBtn>
    </div>
  );
}

function BigBtn({ children, onClick, gradient, glow, outline = false }: {
  children: React.ReactNode;
  onClick: () => void;
  gradient?: string;
  glow?: string;
  outline?: boolean;
}) {
  const [hov, setHov] = React.useState(false);
  return (
    <button
      style={{
        padding:      'clamp(14px, 2.5vh, 22px) clamp(32px, 7vw, 80px)',
        fontSize:     'clamp(1.2rem, 3vw, 1.8rem)',
        fontWeight:   'bold',
        letterSpacing: '2px',
        borderRadius: '16px',
        border:       outline ? '2px solid rgba(255,68,68,0.5)' : 'none',
        background:   outline ? 'transparent' : gradient,
        color:        '#FFFFFF',
        cursor:       'pointer',
        minWidth:     'clamp(200px, 35vw, 320px)',
        boxShadow:    outline ? 'none' : `0 6px 24px ${glow}`,
        transition:   'transform 0.15s',
        transform:    hov ? 'scale(1.05)' : 'scale(1)',
      }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
