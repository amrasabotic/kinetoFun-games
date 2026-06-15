import React from 'react';
import type { Settings } from '../game/types';

interface SettingsPanelProps {
  settings:  Settings;
  onSave:    (s: Settings) => void;
  onClose:   () => void;
}

export function SettingsPanel({ settings, onSave, onClose }: SettingsPanelProps) {
  const [local, setLocal] = React.useState<Settings>({ ...settings });

  function toggle(key: keyof Settings) {
    setLocal(prev => ({ ...prev, [key]: !prev[key] }));
  }

  return (
    <div style={{
      position:       'absolute',
      inset:          0,
      display:        'flex',
      alignItems:     'center',
      justifyContent: 'center',
      background:     'rgba(0,0,0,0.72)',
      backdropFilter: 'blur(8px)',
      zIndex:         30,
      padding:        'clamp(16px, 3vw, 40px)',
    }}>
      <div style={{
        background:   'rgba(255,255,255,0.07)',
        borderRadius: '24px',
        border:       '1px solid rgba(255,255,255,0.18)',
        padding:      'clamp(24px, 4vw, 56px)',
        width:        '100%',
        maxWidth:     '500px',
        textAlign:    'center',
      }}>
        <div style={{
          fontSize:     'clamp(1.5rem, 4vw, 2.5rem)',
          fontWeight:   '900',
          color:        '#FFFFFF',
          marginBottom: 'clamp(16px, 4vh, 36px)',
          letterSpacing: '3px',
        }}>
          ⚙️ Settings
        </div>

        <ToggleRow
          label="Sound Effects"
          icon={local.soundEnabled ? '🔊' : '🔇'}
          value={local.soundEnabled}
          onToggle={() => toggle('soundEnabled')}
        />
        <ToggleRow
          label="Music"
          icon={local.musicEnabled ? '🎵' : '🔕'}
          value={local.musicEnabled}
          onToggle={() => toggle('musicEnabled')}
        />

        <div style={{ marginTop: 'clamp(20px, 4vh, 44px)', display: 'flex', gap: 'clamp(10px, 2vw, 18px)', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            style={{
              padding:      'clamp(12px, 2vh, 18px) clamp(24px, 5vw, 44px)',
              fontSize:     'clamp(1rem, 2.5vw, 1.3rem)',
              fontWeight:   'bold',
              background:   'linear-gradient(135deg, #4ECDC4, #2196F3)',
              color:        '#FFFFFF',
              border:       'none',
              borderRadius: '12px',
              cursor:       'pointer',
              transition:   'transform 0.12s',
            }}
            onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.04)')}
            onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
            onClick={() => onSave(local)}
          >
            Save
          </button>
          <button
            style={{
              padding:      'clamp(12px, 2vh, 18px) clamp(24px, 5vw, 44px)',
              fontSize:     'clamp(1rem, 2.5vw, 1.3rem)',
              background:   'rgba(255,255,255,0.08)',
              color:        '#FFFFFF',
              border:       '2px solid rgba(255,255,255,0.18)',
              borderRadius: '12px',
              cursor:       'pointer',
              transition:   'transform 0.12s',
            }}
            onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.04)')}
            onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
            onClick={onClose}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function ToggleRow({ label, icon, value, onToggle }: {
  label: string; icon: string; value: boolean; onToggle: () => void;
}) {
  return (
    <div style={{
      display:        'flex',
      justifyContent: 'space-between',
      alignItems:     'center',
      padding:        'clamp(12px, 2vh, 18px) 0',
      borderBottom:   '1px solid rgba(255,255,255,0.1)',
    }}>
      <span style={{ color: '#FFFFFF', fontSize: 'clamp(1rem, 2.5vw, 1.3rem)' }}>
        {icon} {label}
      </span>

      <div
        onClick={onToggle}
        role="button"
        data-gesture-target="true"
        style={{
          width:        'clamp(50px, 7vw, 68px)',
          height:       'clamp(28px, 4vw, 36px)',
          borderRadius: '20px',
          background:   value ? '#4ECDC4' : 'rgba(255,255,255,0.2)',
          position:     'relative',
          cursor:       'pointer',
          transition:   'background 0.2s',
          flexShrink:   0,
        }}
      >
        <div style={{
          position:   'absolute',
          top:        '4px',
          left:       value ? 'calc(100% - 28px)' : '4px',
          width:      '20px',
          height:     '20px',
          borderRadius: '50%',
          background: '#FFFFFF',
          transition: 'left 0.2s',
          boxShadow:  '0 2px 6px rgba(0,0,0,0.3)',
        }} />
      </div>
    </div>
  );
}
