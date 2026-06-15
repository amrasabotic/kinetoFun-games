'use client';

import { useRef, useEffect, useState } from 'react';
import type { HandPosition } from '../types/gestures';
import { useDwellNav } from '../hooks/useDwellNav';
import { DwellButton } from './DwellButton';

interface PauseOverlayProps {
  handPositions: HandPosition[];
  onResume: () => void;
  onSettings: () => void;
  onHome: () => void;
}

const BUTTON_W = 320;
const BUTTON_H = 80;

export function PauseOverlay({ handPositions, onResume, onSettings, onHome }: PauseOverlayProps) {
  const [showHomeConfirm, setShowHomeConfirm] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [buttonRects, setButtonRects] = useState<Array<{ id: string; x: number; y: number; w: number; h: number }>>([]);

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
  }, [showHomeConfirm]);

  const { hoveredId, dwellProgress } = useDwellNav({
    buttons: buttonRects,
    handPositions,
    onActivate: (id) => {
      if (id === 'resume') onResume();
      if (id === 'settings') onSettings();
      if (id === 'home-confirm') onHome();
      if (id === 'home') setShowHomeConfirm(true);
      if (id === 'cancel') setShowHomeConfirm(false);
    },
    enabled: true,
  });

  // Hand cursor
  const primaryHand = handPositions.find((h) => h.visible);

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/75 backdrop-blur-sm">
      {/* Hand cursor */}
      {primaryHand && (
        <div
          className="fixed pointer-events-none z-50 w-8 h-8 rounded-full border-4 border-[#00ffcc]"
          style={{
            left: primaryHand.x * window.innerWidth - 16,
            top: primaryHand.y * window.innerHeight - 16,
            backgroundColor: 'rgba(0,255,204,0.2)',
            boxShadow: '0 0 12px #00ffcc',
          }}
        />
      )}

      <div ref={containerRef} className="flex flex-col items-center gap-6 p-10">
        <h1 className="text-6xl font-bold text-[#00ffcc] mb-4" style={{ textShadow: '0 0 30px #00ffcc80' }}>
          PAUSED
        </h1>

        {!showHomeConfirm ? (
          <>
            <div data-dwell-id="resume">
              <DwellButton
                label="RESUME"
                isHovered={hoveredId === 'resume'}
                dwellProgress={hoveredId === 'resume' ? dwellProgress : 0}
                onActivate={onResume}
                variant="primary"
              />
            </div>
            <div data-dwell-id="settings">
              <DwellButton
                label="SETTINGS"
                isHovered={hoveredId === 'settings'}
                dwellProgress={hoveredId === 'settings' ? dwellProgress : 0}
                onActivate={onSettings}
                variant="secondary"
              />
            </div>
            <div data-dwell-id="home">
              <DwellButton
                label="HOME"
                isHovered={hoveredId === 'home'}
                dwellProgress={hoveredId === 'home' ? dwellProgress : 0}
                onActivate={() => setShowHomeConfirm(true)}
                variant="danger"
              />
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-6">
            <div className="bg-red-950 border border-red-800 rounded-xl p-6 text-center max-w-sm">
              <p className="text-red-400 text-xl font-bold mb-2">Leave Game?</p>
              <p className="text-gray-400">Progress will be lost.</p>
            </div>
            <div data-dwell-id="home-confirm">
              <DwellButton
                label="YES, GO HOME"
                isHovered={hoveredId === 'home-confirm'}
                dwellProgress={hoveredId === 'home-confirm' ? dwellProgress : 0}
                onActivate={onHome}
                variant="danger"
              />
            </div>
            <div data-dwell-id="cancel">
              <DwellButton
                label="CANCEL"
                isHovered={hoveredId === 'cancel'}
                dwellProgress={hoveredId === 'cancel' ? dwellProgress : 0}
                onActivate={() => setShowHomeConfirm(false)}
                variant="secondary"
              />
            </div>
          </div>
        )}

        <p className="text-gray-600 text-sm mt-4">Hover over a button to select</p>
      </div>
    </div>
  );
}
