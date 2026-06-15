import React from 'react';

interface StarDisplayProps {
  count: number;
  maxCount?: number;
  size?: number;
  animated?: boolean;
}

export const StarDisplay: React.FC<StarDisplayProps> = ({
  count, maxCount = 3, size = 32, animated = false,
}) => (
  <div style={{ display: 'flex', gap: size * 0.15, alignItems: 'center' }}>
    {Array.from({ length: maxCount }, (_, i) => {
      const earned = i < count;
      return (
        <span
          key={i}
          style={{
            fontSize: size,
            display: 'inline-block',
            filter: earned
              ? 'drop-shadow(0 3px 6px rgba(255,215,0,0.7))'
              : 'grayscale(1) opacity(0.25)',
            transform: animated && earned ? 'scale(1.15)' : 'scale(1)',
            transition: 'all 0.3s ease',
            animation: animated && earned
              ? `starPop 0.5s cubic-bezier(.36,.07,.19,.97) ${i * 0.2}s both`
              : undefined,
          }}
        >
          ⭐
        </span>
      );
    })}
  </div>
);
