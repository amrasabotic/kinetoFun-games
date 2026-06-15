'use client';

import { useEffect, useRef } from 'react';

interface DwellButtonProps {
  label: string;
  isHovered: boolean;
  dwellProgress: number; // 0-1
  onActivate: () => void;
  className?: string;
  variant?: 'primary' | 'secondary' | 'danger';
  icon?: string;
}

const VARIANT_STYLES = {
  primary: {
    bg: 'bg-[#003030]',
    border: 'border-[#00ffcc]',
    text: 'text-[#00ffcc]',
    hover: 'bg-[#005050]',
    progress: '#00ffcc',
  },
  secondary: {
    bg: 'bg-[#001a2a]',
    border: 'border-[#4dc8ff]',
    text: 'text-[#4dc8ff]',
    hover: 'bg-[#002a3a]',
    progress: '#4dc8ff',
  },
  danger: {
    bg: 'bg-[#2a0000]',
    border: 'border-[#ff3333]',
    text: 'text-[#ff3333]',
    hover: 'bg-[#3a0000]',
    progress: '#ff3333',
  },
};

export function DwellButton({
  label,
  isHovered,
  dwellProgress,
  onActivate,
  className = '',
  variant = 'primary',
  icon,
}: DwellButtonProps) {
  const activatedRef = useRef(false);
  const styles = VARIANT_STYLES[variant];

  useEffect(() => {
    if (dwellProgress >= 1 && !activatedRef.current) {
      activatedRef.current = true;
      onActivate();
    }
    if (dwellProgress === 0) {
      activatedRef.current = false;
    }
  }, [dwellProgress, onActivate]);

  return (
    <div
      className={`
        relative overflow-hidden rounded-xl border-2 cursor-none
        transition-colors duration-150 select-none
        ${styles.bg} ${styles.border}
        ${isHovered ? styles.hover : ''}
        ${className}
      `}
      style={{
        minWidth: 280,
        minHeight: 72,
      }}
    >
      {/* Content */}
      <div className="flex items-center justify-center gap-3 px-8 py-5">
        {icon && <span className="text-3xl">{icon}</span>}
        <span className={`text-2xl font-bold tracking-wide ${styles.text}`}>
          {label}
        </span>
      </div>

      {/* Dwell progress bar at bottom */}
      {isHovered && (
        <div
          className="absolute bottom-0 left-0 h-1.5 transition-all"
          style={{
            width: `${dwellProgress * 100}%`,
            backgroundColor: styles.progress,
            boxShadow: `0 0 8px ${styles.progress}`,
          }}
        />
      )}

      {/* Hover glow border */}
      {isHovered && (
        <div
          className="absolute inset-0 rounded-xl pointer-events-none"
          style={{
            boxShadow: `inset 0 0 16px ${styles.progress}40`,
          }}
        />
      )}
    </div>
  );
}
