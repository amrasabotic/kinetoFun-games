import React from 'react';

interface ProgressBarProps {
  value: number;
  color?: string;
  bgColor?: string;
  height?: number;
  label?: string;
  showPercent?: boolean;
  glowing?: boolean;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value, color = '#FF6B35', bgColor = 'rgba(0,0,0,0.12)',
  height = 18, label, showPercent = false, glowing = false,
}) => {
  const pct = Math.round(Math.min(Math.max(value, 0), 1) * 100);
  return (
    <div>
      {(label || showPercent) && (
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          marginBottom: 5, fontFamily: 'Nunito, sans-serif',
          fontSize: '0.85rem', fontWeight: 700, color: '#555',
        }}>
          {label && <span>{label}</span>}
          {showPercent && <span>{pct}%</span>}
        </div>
      )}
      <div style={{
        background: bgColor,
        borderRadius: height / 2,
        height,
        overflow: 'hidden',
        boxShadow: 'inset 0 2px 5px rgba(0,0,0,0.15)',
      }}>
        <div style={{
          width: `${pct}%`,
          height: '100%',
          background: `linear-gradient(90deg, ${color} 0%, ${color}cc 100%)`,
          borderRadius: height / 2,
          transition: 'width 0.3s ease',
          boxShadow: glowing ? `0 0 12px ${color}` : undefined,
        }} />
      </div>
    </div>
  );
};
