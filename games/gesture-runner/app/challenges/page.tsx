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
import type { DailyChallenge } from '../../types/storage';

const analyzer = new GestureAnalyzer();

const TYPE_ICONS: Record<DailyChallenge['type'], string> = {
  distance: '→',
  coins: '$',
  score: '★',
  obstacles: 'X',
  powerups: 'V',
};

const TYPE_COLORS: Record<DailyChallenge['type'], string> = {
  distance: '#4dc8ff',
  coins: '#ffe04d',
  score: '#ff8c00',
  obstacles: '#ff4444',
  powerups: '#00ff88',
};

function ChallengeCard({
  challenge,
  isHovered,
  dwellProgress,
  onClaim,
}: {
  challenge: DailyChallenge;
  isHovered: boolean;
  dwellProgress: number;
  onClaim: () => void;
}) {
  const progress = Math.min(1, challenge.progress / challenge.target);
  const color = TYPE_COLORS[challenge.type];
  const icon = TYPE_ICONS[challenge.type];

  return (
    <div
      className="rounded-2xl border-2 p-6 flex flex-col gap-4 transition-all duration-200"
      style={{
        borderColor: challenge.claimed
          ? '#2a3a4a'
          : challenge.completed
          ? isHovered
            ? `${color}`
            : `${color}80`
          : '#1e2a3a',
        backgroundColor: challenge.claimed
          ? '#080f1a'
          : challenge.completed
          ? `${color}10`
          : '#0a1420',
        boxShadow: challenge.completed && !challenge.claimed && isHovered
          ? `0 0 20px ${color}40`
          : 'none',
        opacity: challenge.claimed ? 0.55 : 1,
      }}
    >
      {/* Header */}
      <div className="flex items-start gap-4">
        <div
          className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl font-black flex-shrink-0"
          style={{
            backgroundColor: `${color}20`,
            color,
            border: `2px solid ${color}50`,
          }}
        >
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xl font-bold text-white">{challenge.title}</span>
            {challenge.claimed && (
              <span className="text-xs font-bold px-2 py-0.5 rounded bg-gray-700 text-gray-400">DONE</span>
            )}
            {challenge.completed && !challenge.claimed && (
              <span
                className="text-xs font-bold px-2 py-0.5 rounded"
                style={{ backgroundColor: `${color}30`, color }}
              >
                READY TO CLAIM
              </span>
            )}
          </div>
          <p className="text-gray-400 text-sm mt-1 leading-snug">{challenge.description}</p>
        </div>
        {/* Reward */}
        <div className="flex-shrink-0 text-right">
          <div className="text-[#ffe04d] font-bold text-lg">+{challenge.reward}</div>
          <div className="text-gray-600 text-xs">coins</div>
        </div>
      </div>

      {/* Progress bar */}
      <div>
        <div className="flex justify-between text-sm mb-2">
          <span className="text-gray-500">
            {challenge.progress.toLocaleString()} / {challenge.target.toLocaleString()}
          </span>
          <span style={{ color }}>{Math.round(progress * 100)}%</span>
        </div>
        <div className="h-3 bg-gray-900 rounded-full overflow-hidden border border-gray-800">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${progress * 100}%`,
              backgroundColor: color,
              boxShadow: progress >= 1 ? `0 0 8px ${color}` : 'none',
            }}
          />
        </div>
      </div>

      {/* Claim button */}
      {challenge.completed && !challenge.claimed && (
        <div data-dwell-id={`claim-${challenge.id}`}>
          <DwellButton
            label={`CLAIM +${challenge.reward} COINS`}
            isHovered={isHovered}
            dwellProgress={dwellProgress}
            onActivate={onClaim}
            variant="primary"
          />
        </div>
      )}
    </div>
  );
}

export default function ChallengesPage() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [handPositions, setHandPositions] = useState<HandPosition[]>([]);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [challenges, setChallenges] = useState<DailyChallenge[]>([]);
  const [totalCoins, setTotalCoins] = useState(0);
  const [buttonRects, setButtonRects] = useState<Array<{ id: string; x: number; y: number; w: number; h: number }>>([]);
  const [notification, setNotification] = useState<string | null>(null);

  useEffect(() => {
    setChallenges(GameStorage.getChallenges());
    setTotalCoins(GameStorage.getTotalCoins());
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
  }, [challenges]);

  const showNotification = useCallback((msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 2500);
  }, []);

  const handleClaim = useCallback((id: string) => {
    const reward = GameStorage.claimChallenge(id);
    if (reward > 0) {
      setChallenges(GameStorage.getChallenges());
      setTotalCoins(GameStorage.getTotalCoins());
      showNotification(`+${reward} coins earned!`);
    }
  }, [showNotification]);

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
      if (id === 'back') { router.back(); return; }
      if (id === 'play') { router.push('/calibration'); return; }
      if (id.startsWith('claim-')) {
        const challengeId = id.replace('claim-', '');
        handleClaim(challengeId);
      }
    },
    enabled: true,
  });

  const primaryHand = handPositions.find((h) => h.visible);

  const completedCount = challenges.filter((c) => c.completed).length;
  const claimedCount = challenges.filter((c) => c.claimed).length;
  const allClaimed = challenges.length > 0 && claimedCount === challenges.length;

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

      {/* Notification */}
      {notification && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-[#ffe04d] text-black font-bold text-xl px-8 py-4 rounded-2xl shadow-lg">
          {notification}
        </div>
      )}

      <div ref={containerRef} className="h-full flex flex-col px-8 py-6">
        {/* Header */}
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
          <div>
            <h1 className="text-4xl font-bold text-[#00ffcc]">Daily Challenges</h1>
            <p className="text-gray-500 text-sm mt-0.5">
              {completedCount} of {challenges.length} completed · Resets daily
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2 bg-black/60 rounded-xl px-4 py-2">
            <span className="text-2xl">$</span>
            <span className="text-2xl font-bold text-[#ffe04d]">{totalCoins.toLocaleString()}</span>
          </div>
        </div>

        {/* Challenges list */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1" style={{ overflowY: 'auto' }}>
          {challenges.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-gray-600 text-xl">Loading challenges...</div>
            </div>
          ) : (
            challenges.map((challenge) => {
              const claimId = `claim-${challenge.id}`;
              const isHovered = hoveredId === claimId;
              return (
                <ChallengeCard
                  key={challenge.id}
                  challenge={challenge}
                  isHovered={isHovered}
                  dwellProgress={isHovered ? dwellProgress : 0}
                  onClaim={() => handleClaim(challenge.id)}
                />
              );
            })
          )}

          {/* CTA if all claimed or nothing to do */}
          {allClaimed && (
            <div className="flex flex-col items-center gap-4 pt-4">
              <div className="text-[#00ff88] text-2xl font-bold">All challenges claimed today!</div>
              <p className="text-gray-500">Come back tomorrow for new challenges.</p>
              <div data-dwell-id="play">
                <DwellButton
                  label="PLAY NOW"
                  isHovered={hoveredId === 'play'}
                  dwellProgress={hoveredId === 'play' ? dwellProgress : 0}
                  onActivate={() => router.push('/calibration')}
                  variant="primary"
                  icon="▶"
                />
              </div>
            </div>
          )}

          {!allClaimed && completedCount === 0 && challenges.length > 0 && (
            <div className="text-center py-4">
              <div data-dwell-id="play">
                <DwellButton
                  label="PLAY TO EARN REWARDS"
                  isHovered={hoveredId === 'play'}
                  dwellProgress={hoveredId === 'play' ? dwellProgress : 0}
                  onActivate={() => router.push('/calibration')}
                  variant="primary"
                  icon="▶"
                />
              </div>
            </div>
          )}
        </div>

        <p className="text-gray-600 text-sm text-center mt-4">
          Hover over a button to select
        </p>
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
        <div className="absolute top-1 left-1 w-2 h-2 rounded-full bg-green-500" />
      </div>
    </div>
  );
}
