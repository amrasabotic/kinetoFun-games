'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { GestureState } from '@/lib/gestures';
import { useGameStore } from '@/store/gameStore';

const Camera = dynamic(() => import('@/components/Camera'), { ssr: false });
import GestureCursor from '@/components/GestureCursor';
import MainMenu from '@/components/MainMenu';
import ModeSelect from '@/components/ModeSelect';
import DestinationCard from '@/components/DestinationCard';
import QuestionCard from '@/components/QuestionCard';
import FeedbackOverlay from '@/components/FeedbackOverlay';
import ResultsScreen from '@/components/ResultsScreen';
import ScoreHUD from '@/components/ScoreHUD';

interface FullGestureState extends GestureState {
  isWave: boolean;
}

const GESTURE_LABELS: Record<string, string> = {
  POINTING: '☝️ Pointing',
  PINCH: '🤏 Pinch',
  OPEN_PALM: '✋ Open Palm',
  THUMBS_UP: '👍 Thumbs Up',
  PEACE: '✌️ Peace',
  THREE_FINGERS: '🤟 Three Fingers',
  WAVE: '👋 Waving!',
  NONE: '',
};

export default function WorldExplorer() {
  const { screen, showModeSelect, mode } = useGameStore();
  const [isHydrated, setIsHydrated] = useState(false);
  const [gestureState, setGestureState] = useState<FullGestureState>({
    gesture: 'NONE',
    cursorX: 0.5,
    cursorY: 0.5,
    confidence: 0,
    pinchStrength: 0,
    handPresent: false,
    isWave: false,
  });
  const waveHandledRef = useRef(false);
  const tickIntervalRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  const handleGesture = useCallback((state: FullGestureState) => {
    setGestureState(state);
  }, []);

  // Time challenge ticker
  useEffect(() => {
    if (screen === 'QUESTION' && mode === 'TIME_CHALLENGE') {
      tickIntervalRef.current = setInterval(() => {
        useGameStore.getState().tickTime();
      }, 100);
    }
    return () => clearInterval(tickIntervalRef.current);
  }, [screen, mode]);

  // Wave on main menu → go to mode select
  useEffect(() => {
    if (screen === 'MAIN_MENU' && gestureState.isWave && !waveHandledRef.current) {
      waveHandledRef.current = true;
      showModeSelect();
      setTimeout(() => { waveHandledRef.current = false; }, 1500);
    }
  }, [gestureState.isWave, screen, showModeSelect]);

  const gestureLabel = gestureState.isWave
    ? '👋 Waving!'
    : GESTURE_LABELS[gestureState.gesture] ?? '';

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#0f0c29]">
      {/* Gesture cursor overlay */}
      <GestureCursor
        x={gestureState.cursorX}
        y={gestureState.cursorY}
        gesture={gestureState.gesture}
        pinchStrength={gestureState.pinchStrength}
        dwellProgress={0}
        visible={gestureState.handPresent}
      />

      {/* Game screens */}
      {screen === 'MAIN_MENU' && (
        <MainMenu
          gestureHint={gestureLabel}
          onWaveDetected={() => showModeSelect()}
        />
      )}

      {screen === 'MODE_SELECT' && (
        <ModeSelect
          cursorX={gestureState.cursorX}
          cursorY={gestureState.cursorY}
          gesture={gestureState.gesture}
        />
      )}

      {screen === 'DESTINATION' && (
        <DestinationCard
          gesture={gestureState.gesture}
          isWave={gestureState.isWave}
        />
      )}

      {screen === 'QUESTION' && (
        <>
          <ScoreHUD />
          <QuestionCard
            cursorX={gestureState.cursorX}
            cursorY={gestureState.cursorY}
            gesture={gestureState.gesture}
          />
        </>
      )}

      {screen === 'FEEDBACK' && (
        <>
          <ScoreHUD />
          <FeedbackOverlay
            gesture={gestureState.gesture}
            isWave={gestureState.isWave}
          />
        </>
      )}

      {screen === 'RESULTS' && (
        <ResultsScreen
          gesture={gestureState.gesture}
          isWave={gestureState.isWave}
        />
      )}

      {/* Camera feed — always visible in corner */}
      <div className="fixed bottom-4 right-4 z-50">
        <Camera onGestureUpdate={handleGesture} showLandmarks />
        {isHydrated && (
          <>
            {gestureState.handPresent && (
              <div className="text-center mt-1 text-xs text-white/50 font-mono">{gestureLabel}</div>
            )}
            {!gestureState.handPresent && (
              <div className="text-center mt-1 text-xs text-white/30 font-mono">No hand detected</div>
            )}
          </>
        )}
      </div>

      {/* Gesture tutorial hint (shown first 30s) */}
      {screen === 'MAIN_MENU' && !gestureState.handPresent && (
        <div className="fixed bottom-40 right-4 bg-black/60 rounded-2xl p-4 border border-white/20 max-w-[200px] text-right">
          <p className="text-white/80 text-sm font-bold mb-2">Controls</p>
          <p className="text-white/60 text-xs">☝️ Point = aim</p>
          <p className="text-white/60 text-xs">🤏 Pinch = select</p>
          <p className="text-white/60 text-xs">👋 Wave = next</p>
          <p className="text-white/60 text-xs">✋ Palm = confirm</p>
        </div>
      )}
    </div>
  );
}
