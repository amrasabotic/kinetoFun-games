'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useMediaPipe } from '../../hooks/useMediaPipe';
import { useDwellNav } from '../../hooks/useDwellNav';
import { DwellButton } from '../../components/DwellButton';
import { CameraError } from '../../components/CameraError';
import { GameStorage } from '../../storage/GameStorage';
import { GestureAnalyzer } from '../../mediapipe/gestureAnalyzer';
import type { HandPosition } from '../../types/gestures';
import type { GameSettings } from '../../types/gestures';
import { getAudioManager } from '../../audio/AudioManager';

const analyzer = new GestureAnalyzer();
const DEFAULT_SETTINGS: GameSettings = {
  jumpSensitivity: 3,
  slideSensitivity: 3,
  leanSensitivity: 3,
  musicEnabled: true,
  sfxEnabled: true,
  highContrast: false,
  reducedMotion: false,
};

function SettingRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between py-4 border-b border-gray-800">
      <span className="text-xl text-gray-200 font-medium">{label}</span>
      <div className="flex items-center gap-3">{children}</div>
    </div>
  );
}

function SensBar({ value }: { value: number }) {
  return (
    <div className="flex gap-1.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <div
          key={n}
          className="w-5 h-5 rounded"
          style={{
            backgroundColor: n <= value ? '#00ffcc' : '#1a2a3a',
            border: n <= value ? 'none' : '1px solid #2a3a4a',
          }}
        />
      ))}
    </div>
  );
}

function Toggle({ on }: { on: boolean }) {
  return (
    <div
      className="w-16 h-9 rounded-full relative transition-colors"
      style={{ backgroundColor: on ? '#00ffcc30' : '#1a2a3a', border: `2px solid ${on ? '#00ffcc' : '#2a3a4a'}` }}
    >
      <div
        className="absolute top-1 w-6 h-6 rounded-full transition-all"
        style={{
          left: on ? 'calc(100% - 28px)' : '2px',
          backgroundColor: on ? '#00ffcc' : '#4a5a6a',
        }}
      />
    </div>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [handPositions, setHandPositions] = useState<HandPosition[]>([]);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [settings, setSettings] = useState<GameSettings>(DEFAULT_SETTINGS);
  const [buttonRects, setButtonRects] = useState<Array<{ id: string; x: number; y: number; w: number; h: number }>>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSettings(GameStorage.getSettings());
  }, []);

  useEffect(() => {
    function updateRects() {
      if (!containerRef.current) return;
      const btns = containerRef.current.querySelectorAll('[data-dwell-id]');
      const rects: typeof buttonRects = [];
      btns.forEach((el) => {
        const id = el.getAttribute('data-dwell-id') ?? '';
        const rect = el.getBoundingClientRect();
        rects.push({ id, x: rect.left, y: rect.top, w: rect.width, h: rect.height });
      });
      setButtonRects(rects);
    }
    updateRects();
    window.addEventListener('resize', updateRects);
    return () => window.removeEventListener('resize', updateRects);
  }, [settings]);

  const handleHandResults = useCallback(
    (landmarks: HandLandmark[][], handedness: Array<{ label: string; score: number; index: number }>) => {
      setHandPositions(analyzer.analyzeHands(landmarks, handedness));
    },
    []
  );

  useMediaPipe(videoRef, {
    onPoseResults: () => {},
    onHandResults: handleHandResults,
    onCameraError: (err) => setCameraError(err.message),
    onReady: () => {},
    enabled: true,
    cameraWidth: 320,
    cameraHeight: 240,
  });

  const applyAndSave = useCallback((updated: GameSettings) => {
    setSettings(updated);
    GameStorage.saveSettings(updated);
    const audio = getAudioManager();
    audio.setMusicEnabled(updated.musicEnabled);
    audio.setSfxEnabled(updated.sfxEnabled);
    sessionStorage.setItem('gesture-runner:settings', JSON.stringify(updated));
  }, []);

  const { hoveredId, dwellProgress } = useDwellNav({
    buttons: buttonRects,
    handPositions,
    onActivate: (id) => {
      let updated = { ...settings };
      if (id === 'back') { router.back(); return; }
      if (id === 'reset') { updated = { ...DEFAULT_SETTINGS }; }
      if (id === 'jump-up') updated.jumpSensitivity = Math.min(5, settings.jumpSensitivity + 1);
      if (id === 'jump-down') updated.jumpSensitivity = Math.max(1, settings.jumpSensitivity - 1);
      if (id === 'slide-up') updated.slideSensitivity = Math.min(5, settings.slideSensitivity + 1);
      if (id === 'slide-down') updated.slideSensitivity = Math.max(1, settings.slideSensitivity - 1);
      if (id === 'lean-up') updated.leanSensitivity = Math.min(5, settings.leanSensitivity + 1);
      if (id === 'lean-down') updated.leanSensitivity = Math.max(1, settings.leanSensitivity - 1);
      if (id === 'music') updated.musicEnabled = !settings.musicEnabled;
      if (id === 'sfx') updated.sfxEnabled = !settings.sfxEnabled;
      if (id === 'contrast') updated.highContrast = !settings.highContrast;
      if (id === 'motion') updated.reducedMotion = !settings.reducedMotion;
      applyAndSave(updated);
    },
    enabled: true,
  });

  const primaryHand = handPositions.find((h) => h.visible);
  if (cameraError) return <CameraError error={cameraError} />;

  return (
    <div className="fixed inset-0 bg-[#000818] overflow-hidden">
      {/* Hand cursor */}
      {primaryHand && typeof window !== 'undefined' && (
        <div
          className="fixed pointer-events-none z-50 w-8 h-8 rounded-full border-4 border-[#00ffcc]"
          style={{
            left: primaryHand.x * window.innerWidth - 16,
            top: primaryHand.y * window.innerHeight - 16,
            backgroundColor: 'rgba(0,255,204,0.15)',
            boxShadow: '0 0 16px #00ffcc',
          }}
        />
      )}

      <div ref={containerRef} className="h-full flex flex-col max-w-2xl mx-auto px-8 py-6">
        <div className="flex items-center gap-4 mb-6">
          <div data-dwell-id="back">
            <DwellButton
              label="← BACK"
              isHovered={hoveredId === 'back'}
              dwellProgress={hoveredId === 'back' ? dwellProgress : 0}
              onActivate={() => router.back()}
              variant="secondary"
              className="min-w-0"
            />
          </div>
          <h1 className="text-4xl font-bold text-[#00ffcc]">Settings</h1>
        </div>

        <div className="flex-1 overflow-y-auto" style={{ overflowY: 'auto' }}>
          {/* Sensitivity */}
          <div className="mb-6">
            <h2 className="text-lg text-gray-500 uppercase tracking-wider mb-2">Gesture Sensitivity</h2>
            <SettingRow label="Jump Sensitivity">
              <div data-dwell-id="jump-down">
                <DwellButton label="−" isHovered={hoveredId === 'jump-down'} dwellProgress={hoveredId === 'jump-down' ? dwellProgress : 0} onActivate={() => {}} variant="secondary" className="min-w-0" />
              </div>
              <SensBar value={settings.jumpSensitivity} />
              <div data-dwell-id="jump-up">
                <DwellButton label="+" isHovered={hoveredId === 'jump-up'} dwellProgress={hoveredId === 'jump-up' ? dwellProgress : 0} onActivate={() => {}} variant="secondary" className="min-w-0" />
              </div>
            </SettingRow>
            <SettingRow label="Slide Sensitivity">
              <div data-dwell-id="slide-down">
                <DwellButton label="−" isHovered={hoveredId === 'slide-down'} dwellProgress={hoveredId === 'slide-down' ? dwellProgress : 0} onActivate={() => {}} variant="secondary" className="min-w-0" />
              </div>
              <SensBar value={settings.slideSensitivity} />
              <div data-dwell-id="slide-up">
                <DwellButton label="+" isHovered={hoveredId === 'slide-up'} dwellProgress={hoveredId === 'slide-up' ? dwellProgress : 0} onActivate={() => {}} variant="secondary" className="min-w-0" />
              </div>
            </SettingRow>
            <SettingRow label="Lean Sensitivity">
              <div data-dwell-id="lean-down">
                <DwellButton label="−" isHovered={hoveredId === 'lean-down'} dwellProgress={hoveredId === 'lean-down' ? dwellProgress : 0} onActivate={() => {}} variant="secondary" className="min-w-0" />
              </div>
              <SensBar value={settings.leanSensitivity} />
              <div data-dwell-id="lean-up">
                <DwellButton label="+" isHovered={hoveredId === 'lean-up'} dwellProgress={hoveredId === 'lean-up' ? dwellProgress : 0} onActivate={() => {}} variant="secondary" className="min-w-0" />
              </div>
            </SettingRow>
          </div>

          {/* Audio */}
          <div className="mb-6">
            <h2 className="text-lg text-gray-500 uppercase tracking-wider mb-2">Audio</h2>
            <SettingRow label="Music">
              <div data-dwell-id="music">
                <DwellButton
                  label={settings.musicEnabled ? 'ON' : 'OFF'}
                  isHovered={hoveredId === 'music'}
                  dwellProgress={hoveredId === 'music' ? dwellProgress : 0}
                  onActivate={() => {}}
                  variant={settings.musicEnabled ? 'primary' : 'secondary'}
                  className="min-w-0"
                />
              </div>
              <Toggle on={settings.musicEnabled} />
            </SettingRow>
            <SettingRow label="Sound Effects">
              <div data-dwell-id="sfx">
                <DwellButton
                  label={settings.sfxEnabled ? 'ON' : 'OFF'}
                  isHovered={hoveredId === 'sfx'}
                  dwellProgress={hoveredId === 'sfx' ? dwellProgress : 0}
                  onActivate={() => {}}
                  variant={settings.sfxEnabled ? 'primary' : 'secondary'}
                  className="min-w-0"
                />
              </div>
              <Toggle on={settings.sfxEnabled} />
            </SettingRow>
          </div>

          {/* Accessibility */}
          <div className="mb-6">
            <h2 className="text-lg text-gray-500 uppercase tracking-wider mb-2">Accessibility</h2>
            <SettingRow label="High Contrast">
              <div data-dwell-id="contrast">
                <DwellButton
                  label={settings.highContrast ? 'ON' : 'OFF'}
                  isHovered={hoveredId === 'contrast'}
                  dwellProgress={hoveredId === 'contrast' ? dwellProgress : 0}
                  onActivate={() => {}}
                  variant={settings.highContrast ? 'primary' : 'secondary'}
                  className="min-w-0"
                />
              </div>
              <Toggle on={settings.highContrast} />
            </SettingRow>
            <SettingRow label="Reduced Motion">
              <div data-dwell-id="motion">
                <DwellButton
                  label={settings.reducedMotion ? 'ON' : 'OFF'}
                  isHovered={hoveredId === 'motion'}
                  dwellProgress={hoveredId === 'motion' ? dwellProgress : 0}
                  onActivate={() => {}}
                  variant={settings.reducedMotion ? 'primary' : 'secondary'}
                  className="min-w-0"
                />
              </div>
              <Toggle on={settings.reducedMotion} />
            </SettingRow>
          </div>

          {/* Reset */}
          <div data-dwell-id="reset" className="mt-4">
            <DwellButton
              label="RESET TO DEFAULTS"
              isHovered={hoveredId === 'reset'}
              dwellProgress={hoveredId === 'reset' ? dwellProgress : 0}
              onActivate={() => {}}
              variant="danger"
            />
          </div>
        </div>
      </div>

      {/* Camera preview */}
      <div className="fixed bottom-4 right-4 w-40 h-28 rounded-xl overflow-hidden border border-gray-800 bg-black">
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          style={{ transform: 'scaleX(-1)' }}
          autoPlay
          playsInline
          muted
        />
      </div>
    </div>
  );
}
