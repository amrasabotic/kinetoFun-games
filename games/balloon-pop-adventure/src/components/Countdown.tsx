import React, { useEffect, useState } from 'react';

interface CountdownProps {
  onComplete: () => void;
  onBeat:     () => void;
}

const SEQUENCE   = ['3', '2', '1', 'POP!'];
const BEAT_MS    = 900;

export function Countdown({ onComplete, onBeat }: CountdownProps) {
  const [step,   setStep]   = useState(0);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    onBeat();

    const timer = setInterval(() => {
      setFading(true);
      setTimeout(() => {
        setStep(prev => {
          const next = prev + 1;
          if (next >= SEQUENCE.length) {
            clearInterval(timer);
            setTimeout(onComplete, 300);
            return prev;
          }
          onBeat();
          setFading(false);
          return next;
        });
      }, 250);
    }, BEAT_MS);

    return () => clearInterval(timer);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const isPop = SEQUENCE[step] === 'POP!';

  return (
    <div style={{
      position:       'absolute',
      inset:          0,
      display:        'flex',
      flexDirection:  'column',
      alignItems:     'center',
      justifyContent: 'center',
      background:     'rgba(0,0,0,0.52)',
      backdropFilter: 'blur(4px)',
      zIndex:         20,
    }}>
      <div style={{
        fontSize:   isPop ? 'clamp(4rem, 12vw, 10rem)' : 'clamp(8rem, 22vw, 18rem)',
        fontWeight: '900',
        textAlign:  'center',
        lineHeight: 1,
        opacity:    fading ? 0 : 1,
        transform:  fading ? 'scale(1.25)' : 'scale(1)',
        transition: 'opacity 0.25s ease, transform 0.25s ease',
        background: isPop
          ? 'linear-gradient(135deg, #FFD700, #FF6B35, #FF4DB8)'
          : 'linear-gradient(135deg, #FFFFFF, #AEE8FF)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor:  'transparent',
        backgroundClip: 'text',
        filter:     `drop-shadow(0 0 ${isPop ? '40px' : '24px'} rgba(255,200,0,0.7))`,
        letterSpacing: isPop ? '4px' : '0',
      }}>
        {SEQUENCE[step]}
      </div>

      <div style={{
        marginTop:    'clamp(12px, 3vh, 28px)',
        color:        'rgba(255,255,255,0.6)',
        fontSize:     'clamp(0.9rem, 2.5vw, 1.5rem)',
        letterSpacing: '4px',
        textTransform: 'uppercase',
      }}>
        {isPop ? '🎈 Go!' : 'Get Ready…'}
      </div>
    </div>
  );
}
