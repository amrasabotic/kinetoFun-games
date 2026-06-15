import React from 'react';
import type { GameSettings, Difficulty } from '../../types';
import { DIFFICULTY_SETTINGS } from '../../constants/gameConfig';
import { Button } from '../ui/Button';
import { audioManager } from '../../utils/audio';

interface Props {
  settings: GameSettings;
  onUpdate: (s: GameSettings) => void;
  onBack: () => void;
  totalStars: number;
  onResetProgress?: () => void;
}

interface ToggleProps {
  label: string;
  emoji: string;
  value: boolean;
  onChange: (v: boolean) => void;
}

const Toggle: React.FC<ToggleProps> = ({ label, emoji, value, onChange }) => (
  <div style={{
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '16px 20px', borderRadius: 16,
    background: 'rgba(0,0,0,0.03)',
  }}>
    <span style={{ fontWeight: 700, fontSize: '1.1rem', color: '#444' }}>
      {emoji} {label}
    </span>
    <button
      onClick={() => onChange(!value)}
      style={{
        width: 56, height: 30, borderRadius: 15,
        background: value ? '#FF6B35' : '#ddd',
        border: 'none', cursor: 'pointer',
        position: 'relative', transition: 'background 0.2s ease',
        flexShrink: 0,
      }}
    >
      <div style={{
        position: 'absolute', top: 3,
        left: value ? 29 : 3,
        width: 24, height: 24,
        borderRadius: '50%',
        background: '#fff',
        boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
        transition: 'left 0.2s ease',
      }} />
    </button>
  </div>
);

export const SettingsScreen: React.FC<Props> = ({
  settings, onUpdate, onBack, totalStars, onResetProgress,
}) => {
  const update = (patch: Partial<GameSettings>) => {
    const next = { ...settings, ...patch };
    onUpdate(next);
    audioManager.tick();
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(160deg, #FFF5E0 0%, #FFE8C8 100%)',
      fontFamily: 'Nunito, sans-serif',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{
        padding: 'clamp(16px,3vw,28px)',
        display: 'flex', alignItems: 'center', gap: 16,
        background: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(8px)',
        borderBottom: '2px solid rgba(255,180,80,0.2)',
      }}>
        <Button variant="ghost" size="sm" onClick={onBack}>← Back</Button>
        <h2 style={{ margin: 0, fontSize: 'clamp(1.3rem,3vw,2rem)', fontWeight: 900, color: '#FF6B35' }}>
          ⚙️ Settings
        </h2>
      </div>

      <div style={{
        flex: 1, maxWidth: 560, width: '100%',
        margin: '0 auto', padding: 'clamp(20px,4vw,40px)',
        display: 'flex', flexDirection: 'column', gap: 28,
      }}>
        {/* Audio */}
        <section>
          <h3 style={{ margin: '0 0 12px', color: '#666', fontSize: '0.85rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1 }}>
            Audio
          </h3>
          <div style={{
            background: '#fff', borderRadius: 20,
            boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
            overflow: 'hidden',
          }}>
            <Toggle
              label="Sound Effects"
              emoji="🔊"
              value={settings.soundEnabled}
              onChange={v => {
                audioManager.setSoundEnabled(v);
                update({ soundEnabled: v });
                if (v) audioManager.chop();
              }}
            />
            <div style={{ height: 1, background: '#f0f0f0', margin: '0 16px' }} />
            <Toggle
              label="Background Music"
              emoji="🎵"
              value={settings.musicEnabled}
              onChange={v => {
                audioManager.setMusicEnabled(v);
                update({ musicEnabled: v });
              }}
            />
          </div>
        </section>

        {/* Difficulty */}
        <section>
          <h3 style={{ margin: '0 0 12px', color: '#666', fontSize: '0.85rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1 }}>
            Default Difficulty
          </h3>
          <div style={{
            background: '#fff', borderRadius: 20,
            boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
            padding: 16, display: 'flex', gap: 10, flexWrap: 'wrap',
          }}>
            {(Object.entries(DIFFICULTY_SETTINGS) as [Difficulty, typeof DIFFICULTY_SETTINGS[Difficulty]][]).map(
              ([key, cfg]) => (
                <button
                  key={key}
                  onClick={() => update({ difficulty: key })}
                  style={{
                    flex: 1, minWidth: 100, padding: '12px 8px',
                    borderRadius: 14, border: `3px solid ${settings.difficulty === key ? cfg.color : 'transparent'}`,
                    background: settings.difficulty === key ? `${cfg.color}18` : 'rgba(0,0,0,0.04)',
                    color: settings.difficulty === key ? cfg.color : '#666',
                    fontFamily: 'Nunito, sans-serif', fontWeight: 800, fontSize: '1rem',
                    cursor: 'pointer', transition: 'all 0.2s ease',
                  }}
                >
                  {cfg.emoji} {cfg.label}
                </button>
              )
            )}
          </div>
        </section>

        {/* Camera & Gestures */}
        <section>
          <h3 style={{ margin: '0 0 12px', color: '#666', fontSize: '0.85rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1 }}>
            Input Method
          </h3>
          <div style={{
            background: '#fff', borderRadius: 20,
            boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
            overflow: 'hidden',
          }}>
            <Toggle
              label="Hand Gestures (Camera)"
              emoji="🤚"
              value={settings.cameraEnabled}
              onChange={v => {
                update({ cameraEnabled: v });
                if (v) audioManager.tick();
              }}
            />
            <div style={{ height: 1, background: '#f0f0f0', margin: '0 16px' }} />
            <div style={{
              padding: '12px 20px',
              fontSize: '0.85rem',
              color: '#888',
              background: 'rgba(0,0,0,0.02)',
            }}>
              {settings.cameraEnabled
                ? '🎥 Camera active — use hand gestures to cook!'
                : '🖱️ Mouse/Touch active — drag, click, and swipe to cook'}
            </div>
          </div>
        </section>

        {/* Progress */}
        <section>
          <h3 style={{ margin: '0 0 12px', color: '#666', fontSize: '0.85rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1 }}>
            Progress
          </h3>
          <div style={{
            background: '#fff', borderRadius: 20,
            boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
            padding: '16px 20px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontWeight: 700, color: '#444' }}>⭐ Total Stars</span>
              <span style={{ fontWeight: 900, color: '#FFD700', fontSize: '1.2rem' }}>{totalStars}</span>
            </div>
            {onResetProgress && (
              <Button variant="danger" size="sm" onClick={onResetProgress} fullWidth>
                🗑️ Reset All Progress
              </Button>
            )}
          </div>
        </section>

        {/* Credits */}
        <div style={{ textAlign: 'center', color: '#BBA', fontSize: '0.8rem', fontWeight: 600 }}>
          Gesture Chef · KinetoFun Platform<br />
          🤚 Hand gesture recognition powered by MediaPipe
        </div>
      </div>
    </div>
  );
};
