'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useMediaPipe } from '../../hooks/useMediaPipe';
import { useDwellNav } from '../../hooks/useDwellNav';
import { DwellButton } from '../../components/DwellButton';
import { CameraError } from '../../components/CameraError';
import { GameStorage } from '../../storage/GameStorage';
import { GestureAnalyzer } from '../../mediapipe/gestureAnalyzer';
import type { HandPosition } from '../../types/gestures';

interface RunResult {
  score: number;
  coins: number;
  distance: number;
  time: number;
}

const analyzer = new GestureAnalyzer();

export default function GameOverPage() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [handPositions, setHandPositions] = useState<HandPosition[]>([]);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [result, setResult] = useState<RunResult | null>(null);
  const [isNewBest, setIsNewBest] = useState(false);
  const [bestScore, setBestScore] = useState(0);
  const [buttonRects, setButtonRects] = useState<Array<{ id: string; x: number; y: number; w: number; h: number }>>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem('gesture-runner:last-result');
    if (raw) {
      const data: RunResult = JSON.parse(raw);
      setResult(data);
      const best = GameStorage.getBestScore();
      setBestScore(best);
      setIsNewBest(data.score >= best && data.score > 0);
    }
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
  }, [result]);

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

  const { hoveredId, dwellProgress } = useDwellNav({
    buttons: buttonRects,
    handPositions,
    onActivate: (id) => {
      if (id === 'play-again') router.push('/calibration');
      if (id === 'home') router.push('/home');
      if (id === 'challenges') router.push('/challenges');
    },
    enabled: true,
  });

  const primaryHand = handPositions.find((h) => h.visible);
  const minutes = result ? Math.floor(result.time / 60) : 0;
  const seconds = result ? result.time % 60 : 0;

  if (cameraError) return <CameraError error={cameraError} />;

  return (
    <div className="fixed inset-0 bg-[#000818] flex flex-col items-center justify-center" ref={containerRef}>
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

      {/* Game Over title */}
      <h1
        className="text-7xl font-black mb-2"
        style={{ color: '#ff3333', textShadow: '0 0 40px #ff333380' }}
      >
        GAME OVER
      </h1>

      {isNewBest && (
        <div
          className="text-3xl font-bold text-[#ffe04d] mb-4"
          style={{ textShadow: '0 0 20px #ffe04d80', animation: 'pulse 1s infinite' }}
        >
          NEW HIGH SCORE!
        </div>
      )}

      {/* Score breakdown */}
      {result && (
        <div className="bg-gray-900/80 rounded-2xl p-8 mb-8 grid grid-cols-2 gap-x-12 gap-y-4 border border-gray-700 text-center">
          <div>
            <div className="text-gray-500 text-sm uppercase tracking-wider mb-1">Score</div>
            <div className="text-4xl font-bold text-white">{result.score.toLocaleString()}</div>
          </div>
          <div>
            <div className="text-gray-500 text-sm uppercase tracking-wider mb-1">Distance</div>
            <div className="text-4xl font-bold text-[#4dc8ff]">{result.distance}m</div>
          </div>
          <div>
            <div className="text-gray-500 text-sm uppercase tracking-wider mb-1">Coins</div>
            <div className="text-4xl font-bold text-[#ffe04d]">{result.coins}</div>
          </div>
          <div>
            <div className="text-gray-500 text-sm uppercase tracking-wider mb-1">Time</div>
            <div className="text-4xl font-bold text-[#00ff88]">
              {minutes > 0 ? `${minutes}m ` : ''}{Math.floor(seconds)}s
            </div>
          </div>
          {bestScore > 0 && !isNewBest && (
            <div className="col-span-2">
              <div className="text-gray-500 text-sm uppercase tracking-wider mb-1">Best Score</div>
              <div className="text-2xl font-bold text-gray-400">{bestScore.toLocaleString()}</div>
            </div>
          )}
        </div>
      )}

      {/* Buttons */}
      <div className="flex flex-col gap-4">
        <div data-dwell-id="play-again">
          <DwellButton
            label="PLAY AGAIN"
            isHovered={hoveredId === 'play-again'}
            dwellProgress={hoveredId === 'play-again' ? dwellProgress : 0}
            onActivate={() => router.push('/calibration')}
            variant="primary"
            icon="▶"
          />
        </div>
        <div data-dwell-id="challenges">
          <DwellButton
            label="CHALLENGES"
            isHovered={hoveredId === 'challenges'}
            dwellProgress={hoveredId === 'challenges' ? dwellProgress : 0}
            onActivate={() => router.push('/challenges')}
            variant="secondary"
            icon="◆"
          />
        </div>
        <div data-dwell-id="home">
          <DwellButton
            label="HOME"
            isHovered={hoveredId === 'home'}
            dwellProgress={hoveredId === 'home' ? dwellProgress : 0}
            onActivate={() => router.push('/home')}
            variant="secondary"
            icon="⌂"
          />
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
