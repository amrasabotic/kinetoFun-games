import React from 'react';

interface HowToPlayProps {
  onClose: () => void;
}

const BALLOON_TYPES = [
  { icon: '🎈', color: '#FF6B6B', label: 'Regular',  desc: '+1 point',          detail: 'Most common balloon'           },
  { icon: '⭐', color: '#FFD700', label: 'Golden',   desc: '+5 points',         detail: 'Rare — worth lots more!'       },
  { icon: '💣', color: '#FF4444', label: 'Bomb',     desc: '−3 points',         detail: 'Avoid or lose points + shake!' },
  { icon: '❄️', color: '#90D5FF', label: 'Freeze',   desc: 'Slows balloons 5s', detail: 'Helpful — use it wisely'       },
  { icon: '🌈', color: '#FF69B4', label: 'Rainbow',  desc: '×2 combo 10s',      detail: 'Pop everything twice as fast!' },
];

const STEPS = [
  { icon: '📷', text: 'Stand 1–2 metres from the camera' },
  { icon: '✋', text: 'Raise one or both hands into view' },
  { icon: '👆', text: 'Touch balloons with your fingertip to pop them' },
  { icon: '⭕', text: 'Hold your hand still over any button for 1.5 s to press it' },
];

export function HowToPlay({ onClose }: HowToPlayProps) {
  return (
    <div style={{
      position:   'absolute',
      inset:      0,
      display:    'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'flex-start',
      background: 'rgba(5,5,20,0.92)',
      backdropFilter: 'blur(8px)',
      zIndex:     25,
      overflowY:  'auto',
      padding:    'clamp(16px, 3vw, 40px)',
    }}>
      {/* Title */}
      <div style={{
        fontSize:     'clamp(1.8rem, 4vw, 3rem)',
        fontWeight:   '900',
        color:        '#FFFFFF',
        letterSpacing: '3px',
        textAlign:    'center',
        marginBottom: 'clamp(16px, 3vh, 32px)',
        marginTop:    'clamp(8px, 2vh, 20px)',
        background:   'linear-gradient(135deg, #FFD700, #FF6B35)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor:  'transparent',
        backgroundClip: 'text',
      }}>
        ❓ How to Play
      </div>

      {/* Two-column layout */}
      <div style={{
        display:   'flex',
        gap:       'clamp(16px, 3vw, 40px)',
        flexWrap:  'wrap',
        justifyContent: 'center',
        width:     '100%',
        maxWidth:  '1100px',
        marginBottom: 'clamp(16px, 3vh, 32px)',
      }}>
        {/* Left: gesture steps */}
        <div style={{
          flex:         '1 1 320px',
          background:   'rgba(255,255,255,0.06)',
          borderRadius: '20px',
          border:       '1px solid rgba(255,255,255,0.15)',
          padding:      'clamp(16px, 3vw, 32px)',
        }}>
          <SectionTitle icon="✋" label="Gesture Controls" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(10px, 2vh, 16px)' }}>
            {STEPS.map((step, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{
                  width:          'clamp(36px, 5vw, 52px)',
                  height:         'clamp(36px, 5vw, 52px)',
                  flexShrink:     0,
                  background:     'rgba(255,255,255,0.1)',
                  borderRadius:   '50%',
                  display:        'flex',
                  alignItems:     'center',
                  justifyContent: 'center',
                  fontSize:       'clamp(1.2rem, 2.5vw, 1.8rem)',
                }}>
                  {step.icon}
                </div>
                <span style={{ color: '#FFFFFF', fontSize: 'clamp(0.9rem, 2vw, 1.2rem)', lineHeight: 1.4 }}>
                  {step.text}
                </span>
              </div>
            ))}
          </div>

          {/* Dwell click illustration */}
          <div style={{
            marginTop:    'clamp(12px, 2vh, 24px)',
            padding:      'clamp(10px, 2vw, 20px)',
            background:   'rgba(78,205,196,0.1)',
            borderRadius: '12px',
            border:       '1px solid rgba(78,205,196,0.3)',
          }}>
            <div style={{ color: '#4ECDC4', fontWeight: 'bold', fontSize: 'clamp(0.85rem, 1.8vw, 1.05rem)', marginBottom: '6px' }}>
              ⭕ Dwell to Select
            </div>
            <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: 'clamp(0.8rem, 1.6vw, 1rem)', lineHeight: 1.5 }}>
              A ring appears around your cursor when hovering a button. When the ring completes, the button is pressed — no physical click needed!
            </div>
          </div>
        </div>

        {/* Right: balloon types */}
        <div style={{
          flex:         '1 1 320px',
          background:   'rgba(255,255,255,0.06)',
          borderRadius: '20px',
          border:       '1px solid rgba(255,255,255,0.15)',
          padding:      'clamp(16px, 3vw, 32px)',
        }}>
          <SectionTitle icon="🎈" label="Balloon Types" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(8px, 1.5vh, 14px)' }}>
            {BALLOON_TYPES.map((b, i) => (
              <div key={i} style={{
                display:      'flex',
                alignItems:   'center',
                gap:          '14px',
                padding:      'clamp(8px, 1.5vw, 14px)',
                background:   `${b.color}18`,
                borderRadius: '12px',
                border:       `1px solid ${b.color}40`,
              }}>
                <div style={{ fontSize: 'clamp(1.6rem, 3.5vw, 2.5rem)', flexShrink: 0 }}>{b.icon}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '8px' }}>
                    <span style={{ color: '#FFFFFF', fontWeight: 'bold', fontSize: 'clamp(0.9rem, 2vw, 1.15rem)' }}>
                      {b.label}
                    </span>
                    <span style={{ color: b.color, fontWeight: '900', fontSize: 'clamp(0.85rem, 1.8vw, 1.05rem)', whiteSpace: 'nowrap' }}>
                      {b.desc}
                    </span>
                  </div>
                  <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: 'clamp(0.75rem, 1.5vw, 0.9rem)', marginTop: '2px' }}>
                    {b.detail}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* GOT IT button */}
      <button
        style={{
          padding:      'clamp(14px, 2.5vh, 22px) clamp(40px, 8vw, 100px)',
          fontSize:     'clamp(1.3rem, 3vw, 2rem)',
          fontWeight:   '900',
          letterSpacing: '3px',
          background:   'linear-gradient(135deg, #FF6B35, #FF4DB8)',
          color:        '#FFFFFF',
          border:       'none',
          borderRadius: '16px',
          cursor:       'pointer',
          boxShadow:    '0 6px 30px rgba(255,80,100,0.5)',
          marginBottom: 'clamp(16px, 3vh, 32px)',
          transition:   'transform 0.15s',
        }}
        onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.05)')}
        onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
        onClick={onClose}
      >
        🎈 GOT IT — LET'S PLAY!
      </button>
    </div>
  );
}

function SectionTitle({ icon, label }: { icon: string; label: string }) {
  return (
    <div style={{
      fontSize:     'clamp(1rem, 2.5vw, 1.5rem)',
      fontWeight:   '900',
      color:        '#FFFFFF',
      letterSpacing: '2px',
      marginBottom: 'clamp(10px, 2vh, 20px)',
      display:      'flex',
      alignItems:   'center',
      gap:          '10px',
    }}>
      <span>{icon}</span>
      <span>{label}</span>
    </div>
  );
}
