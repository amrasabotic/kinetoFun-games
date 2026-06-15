import React, { useState } from 'react';

interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  disabled?: boolean;
  fullWidth?: boolean;
  style?: React.CSSProperties;
}

const VARIANTS: Record<string, React.CSSProperties> = {
  primary: {
    background: 'linear-gradient(135deg, #FF6B35 0%, #FF8C42 100%)',
    color: '#fff',
    border: 'none',
    boxShadow: '0 6px 0 #C94A1A, 0 8px 24px rgba(255,107,53,0.35)',
  },
  secondary: {
    background: 'linear-gradient(135deg, #FFD700 0%, #FFC200 100%)',
    color: '#2D2D2D',
    border: 'none',
    boxShadow: '0 6px 0 #CC9C00, 0 8px 24px rgba(255,215,0,0.35)',
  },
  ghost: {
    background: 'rgba(255,255,255,0.95)',
    color: '#FF6B35',
    border: '3px solid #FF6B35',
    boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
  },
  danger: {
    background: 'linear-gradient(135deg, #FF4444 0%, #FF6060 100%)',
    color: '#fff',
    border: 'none',
    boxShadow: '0 6px 0 #CC1111, 0 8px 24px rgba(255,68,68,0.35)',
  },
};

const SIZES: Record<string, React.CSSProperties> = {
  sm: { padding: '8px 18px', fontSize: '0.95rem', borderRadius: 12 },
  md: { padding: '13px 28px', fontSize: '1.15rem', borderRadius: 16 },
  lg: { padding: '17px 38px', fontSize: '1.4rem', borderRadius: 20 },
  xl: { padding: '22px 56px', fontSize: '1.9rem', borderRadius: 24 },
};

export const Button: React.FC<ButtonProps> = ({
  children, onClick, variant = 'primary', size = 'md',
  disabled = false, fullWidth = false, style,
}) => {
  const [pressed, setPressed] = useState(false);

  return (
    <button
      onClick={disabled ? undefined : onClick}
      onMouseDown={() => !disabled && setPressed(true)}
      onMouseUp={() => setPressed(false)}
      onMouseLeave={() => setPressed(false)}
      onTouchStart={() => !disabled && setPressed(true)}
      onTouchEnd={() => setPressed(false)}
      disabled={disabled}
      style={{
        ...VARIANTS[variant],
        ...SIZES[size],
        fontFamily: 'Nunito, sans-serif',
        fontWeight: 800,
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'transform 0.1s ease, box-shadow 0.1s ease',
        transform: pressed ? 'translateY(4px)' : 'translateY(0)',
        boxShadow: pressed
          ? 'none'
          : (VARIANTS[variant].boxShadow as string),
        opacity: disabled ? 0.45 : 1,
        letterSpacing: '0.3px',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        outline: 'none',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        width: fullWidth ? '100%' : undefined,
        ...style,
      }}
    >
      {children}
    </button>
  );
};
