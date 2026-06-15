'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useMediaPipe } from '../../hooks/useMediaPipe';
import { useDwellNav } from '../../hooks/useDwellNav';
import { DwellButton } from '../../components/DwellButton';
import { CameraError } from '../../components/CameraError';
import { GameStorage } from '../../storage/GameStorage';
import { GestureAnalyzer } from '../../mediapipe/gestureAnalyzer';
import { CHARACTERS } from '../../utils/characters';
import type { HandPosition } from '../../types/gestures';
import type { CharacterId } from '../../types/game';
import type { CharacterUnlock } from '../../types/storage';

const analyzer = new GestureAnalyzer();

function CharacterCard({
  char,
  unlock,
  isEquipped,
  isHovered,
  dwellProgress,
  totalCoins,
  bestScore,
  onEquip,
  onUnlock,
}: {
  char: (typeof CHARACTERS)[0];
  unlock: CharacterUnlock | undefined;
  isEquipped: boolean;
  isHovered: boolean;
  dwellProgress: number;
  totalCoins: number;
  bestScore: number;
  onEquip: () => void;
  onUnlock: () => void;
}) {
  const isUnlocked = unlock?.unlocked ?? false;
  const canAffordCoins = char.unlockCost > 0 && totalCoins >= char.unlockCost;
  const canAffordScore = !!char.unlockScore && bestScore >= char.unlockScore;
  const canUnlock = !isUnlocked && (canAffordCoins || canAffordScore || char.unlockCost === 0);

  return (
    <div
      className="relative rounded-2xl border-2 p-6 flex flex-col items-center gap-4 transition-all duration-200"
      style={{
        borderColor: isEquipped
          ? char.color
          : isHovered
          ? `${char.color}80`
          : isUnlocked
          ? '#2a3a4a'
          : '#1a2030',
        backgroundColor: isEquipped
          ? `${char.color}15`
          : isHovered
          ? `${char.color}08`
          : '#0a1020',
        boxShadow: isEquipped ? `0 0 24px ${char.color}40` : isHovered ? `0 0 12px ${char.color}20` : 'none',
        opacity: !isUnlocked && !canUnlock ? 0.5 : 1,
      }}
    >
      {/* Character avatar */}
      <div
        className="w-24 h-24 rounded-full flex items-center justify-center text-5xl relative"
        style={{
          background: `radial-gradient(circle, ${char.color}30 0%, ${char.color}10 100%)`,
          border: `3px solid ${char.color}60`,
        }}
      >
        <svg width="60" height="72" viewBox="0 0 60 72">
          {/* Simple stick-figure character */}
          {/* Head */}
          <circle cx="30" cy="14" r="12" fill={char.accentColor} />
          {/* Eyes */}
          <circle cx="26" cy="13" r="2" fill="#000" />
          <circle cx="34" cy="13" r="2" fill="#000" />
          {/* Body */}
          <rect x="20" y="28" width="20" height="22" rx="4" fill={char.color} />
          {/* Accent stripe */}
          <rect x="22" y="32" width="16" height="6" rx="2" fill={char.accentColor} />
          {/* Legs */}
          <rect x="21" y="50" width="7" height="18" rx="3" fill={char.color} />
          <rect x="32" y="50" width="7" height="18" rx="3" fill={char.color} />
          {/* Arms */}
          <rect x="6" y="30" width="14" height="6" rx="3" fill={char.color} />
          <rect x="40" y="30" width="14" height="6" rx="3" fill={char.color} />
        </svg>

        {/* Lock overlay */}
        {!isUnlocked && (
          <div className="absolute inset-0 rounded-full flex items-center justify-center bg-black/60">
            <span className="text-2xl">🔒</span>
          </div>
        )}
      </div>

      {/* Name */}
      <div className="text-center">
        <div className="text-2xl font-bold" style={{ color: char.color }}>
          {char.name}
        </div>
        <div className="text-gray-400 text-sm mt-1 max-w-[180px] text-center leading-snug">
          {char.description}
        </div>
      </div>

      {/* Status / action */}
      {isEquipped && (
        <div
          className="px-5 py-2 rounded-lg text-sm font-bold uppercase tracking-wider"
          style={{ backgroundColor: `${char.color}25`, color: char.color, border: `1px solid ${char.color}` }}
        >
          EQUIPPED
        </div>
      )}

      {isUnlocked && !isEquipped && (
        <div data-dwell-id={`equip-${char.id}`}>
          <DwellButton
            label="EQUIP"
            isHovered={isHovered}
            dwellProgress={dwellProgress}
            onActivate={onEquip}
            variant="primary"
            className="min-w-0"
          />
        </div>
      )}

      {!isUnlocked && (
        <div className="text-center">
          <div className="text-gray-500 text-sm mb-2">{char.unlockCondition}</div>
          {canUnlock ? (
            <div data-dwell-id={`unlock-${char.id}`}>
              <DwellButton
                label={char.unlockCost > 0 ? `UNLOCK (${char.unlockCost} coins)` : 'UNLOCK'}
                isHovered={isHovered}
                dwellProgress={dwellProgress}
                onActivate={onUnlock}
                variant="secondary"
                className="min-w-0"
              />
            </div>
          ) : (
            <div className="text-gray-600 text-xs">
              {char.unlockCost > 0 && !canAffordCoins && (
                <span>{char.unlockCost - totalCoins} more coins needed</span>
              )}
              {char.unlockScore && !canAffordScore && (
                <span>Score {char.unlockScore.toLocaleString()} needed</span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function CharactersPage() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [handPositions, setHandPositions] = useState<HandPosition[]>([]);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [characters, setCharacters] = useState<CharacterUnlock[]>(() => GameStorage.getCharacters());
  const [totalCoins, setTotalCoins] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [buttonRects, setButtonRects] = useState<Array<{ id: string; x: number; y: number; w: number; h: number }>>([]);
  const [notification, setNotification] = useState<string | null>(null);

  useEffect(() => {
    setTotalCoins(GameStorage.getTotalCoins());
    setBestScore(GameStorage.getBestScore());
    setCharacters(GameStorage.getCharacters());
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
  }, [characters]);

  const showNotification = useCallback((msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 2500);
  }, []);

  const handleEquip = useCallback((id: CharacterId) => {
    GameStorage.equipCharacter(id);
    setCharacters(GameStorage.getCharacters());
    const char = CHARACTERS.find((c) => c.id === id);
    showNotification(`${char?.name ?? id} equipped!`);
  }, [showNotification]);

  const handleUnlock = useCallback((id: CharacterId) => {
    const char = CHARACTERS.find((c) => c.id === id);
    if (!char) return;

    if (char.unlockCost > 0) {
      const success = GameStorage.spendCoins(char.unlockCost);
      if (!success) {
        showNotification('Not enough coins!');
        return;
      }
      setTotalCoins(GameStorage.getTotalCoins());
    }

    GameStorage.unlockCharacter(id);
    setCharacters(GameStorage.getCharacters());
    showNotification(`${char.name} unlocked!`);
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
      if (id.startsWith('equip-')) {
        const charId = id.replace('equip-', '') as CharacterId;
        handleEquip(charId);
      }
      if (id.startsWith('unlock-')) {
        const charId = id.replace('unlock-', '') as CharacterId;
        handleUnlock(charId);
      }
    },
    enabled: true,
  });

  const primaryHand = handPositions.find((h) => h.visible);
  const equippedId = characters.find((c) => c.equipped)?.id ?? 'starter';

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
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-[#00ffcc] text-black font-bold text-xl px-8 py-4 rounded-2xl shadow-lg">
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
            <h1 className="text-4xl font-bold text-[#00ffcc]">Characters</h1>
          </div>
          <div className="ml-auto flex items-center gap-2 bg-black/60 rounded-xl px-4 py-2">
            <span className="text-2xl">$</span>
            <span className="text-2xl font-bold text-[#ffe04d]">{totalCoins.toLocaleString()}</span>
            <span className="text-gray-500 text-sm ml-1">coins</span>
          </div>
        </div>

        {/* Character grid */}
        <div className="flex-1 flex items-center justify-center">
          <div className="grid grid-cols-2 gap-6 lg:grid-cols-4">
            {CHARACTERS.map((char) => {
              const unlock = characters.find((c) => c.id === char.id);
              const isEquipped = char.id === equippedId;
              const cardHoverId = unlock?.unlocked && !isEquipped
                ? `equip-${char.id}`
                : !unlock?.unlocked
                ? `unlock-${char.id}`
                : null;
              const isHovered = cardHoverId ? hoveredId === cardHoverId : false;
              const progress = isHovered ? dwellProgress : 0;

              return (
                <CharacterCard
                  key={char.id}
                  char={char}
                  unlock={unlock}
                  isEquipped={isEquipped}
                  isHovered={isHovered}
                  dwellProgress={progress}
                  totalCoins={totalCoins}
                  bestScore={bestScore}
                  onEquip={() => handleEquip(char.id)}
                  onUnlock={() => handleUnlock(char.id)}
                />
              );
            })}
          </div>
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
