'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { GameEngine } from '../../game/GameEngine';
import { GestureAnalyzer } from '../../mediapipe/gestureAnalyzer';
import { useMediaPipe } from '../../hooks/useMediaPipe';
import { GameHud } from '../../components/GameHud';
import { PauseOverlay } from '../../components/PauseOverlay';
import { CameraError } from '../../components/CameraError';
import { GameStorage } from '../../storage/GameStorage';
import type { GamePhase, GameState } from '../../types/game';
import type { HandPosition } from '../../types/gestures';
import type { GameSettings } from '../../types/gestures';
import type { CharacterId } from '../../types/game';
import { getAudioManager } from '../../audio/AudioManager';

export default function GamePage() {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const analyzerRef = useRef(new GestureAnalyzer());

  const [gamePhase, setGamePhase] = useState<GamePhase>('countdown');
  const [score, setScore] = useState(0);
  const [coins, setCoins] = useState(0);
  const [distance, setDistance] = useState(0);
  const [speed, setSpeed] = useState(200);
  const [activePowerUps, setActivePowerUps] = useState<GameState['activePowerUps']>({
    magnet: 0,
    shield: false,
    speed: 0,
    doubleCoins: 0,
  });
  const [handPositions, setHandPositions] = useState<HandPosition[]>([]);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [lastGesture, setLastGesture] = useState({ jump: false, slide: false, leanLeft: false, leanRight: false });
  const gestureFlashRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Resize canvas to fill window
  useEffect(() => {
    function resize() {
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  // Initialize game engine
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const charId: CharacterId = (sessionStorage.getItem('gesture-runner:character') as CharacterId) ?? 'starter';
    const settingsRaw = sessionStorage.getItem('gesture-runner:settings');
    const settings: GameSettings = settingsRaw ? JSON.parse(settingsRaw) : GameStorage.getSettings();
    const highScore = GameStorage.getBestScore();

    const engine = new GameEngine(canvas);
    engineRef.current = engine;

    engine.onPhaseChange = (phase) => {
      setGamePhase(phase);
      if (phase === 'gameover') {
        // Save run to storage
        const state = engine.state;
        const isNew = GameStorage.updateBestScore(Math.floor(state.score));
        GameStorage.addLeaderboardEntry({
          score: Math.floor(state.score),
          distance: Math.floor(state.distance),
          coins: state.coins,
          date: new Date().toISOString(),
          characterId: charId,
        });
        GameStorage.addCoins(state.coins);
        GameStorage.updateChallengeProgress('distance', Math.floor(state.distance));
        GameStorage.updateChallengeProgress('coins', state.coins);
        GameStorage.updateChallengeProgress('score', Math.floor(state.score));
        GameStorage.setLastPlayDate();

        // Check unlocks
        const total = GameStorage.getTotalCoins();
        if (total >= 200) GameStorage.unlockCharacter('explorer');
        if (total >= 500) GameStorage.unlockCharacter('ninja');
        if (Math.floor(state.score) >= 5000) GameStorage.unlockCharacter('robot');

        setTimeout(() => router.push('/game-over'), 1800);
      }
    };

    engine.onScoreUpdate = (s, c, d) => {
      setScore(s);
      setCoins(c);
      setDistance(d);
      setSpeed(engine.state.speed);
    };

    engine.onActivePowerUpsChange = (pu) => {
      setActivePowerUps({ ...pu });
    };

    engine.startNewGame(charId, settings, highScore);
    getAudioManager().resume();

    return () => {
      engine.stop();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePoseResults = useCallback((landmarks: PoseLandmark[] | null) => {
    const engine = engineRef.current;
    if (!engine || engine.state.phase !== 'play') return;
    if (!landmarks) return;

    const settingsRaw = sessionStorage.getItem('gesture-runner:settings');
    const settings: GameSettings = settingsRaw ? JSON.parse(settingsRaw) : GameStorage.getSettings();

    const gesture = analyzerRef.current.analyzePose(landmarks, settings);

    // Flash gesture indicator briefly
    const hasGesture = gesture.jump || gesture.slide || gesture.leanLeft || gesture.leanRight;
    if (hasGesture) {
      setLastGesture(gesture);
      if (gestureFlashRef.current) clearTimeout(gestureFlashRef.current);
      gestureFlashRef.current = setTimeout(() => {
        setLastGesture({ jump: false, slide: false, leanLeft: false, leanRight: false });
      }, 300);
    }

    engine.latestGesture = {
      ...gesture,
      timestamp: Date.now(),
    };
  }, []);

  const handleHandResults = useCallback(
    (landmarks: HandLandmark[][], handedness: Array<{ label: string; score: number; index: number }>) => {
      const positions = analyzerRef.current.analyzeHands(landmarks, handedness);
      setHandPositions(positions);

      const engine = engineRef.current;
      if (engine) {
        engine.handPositions = positions;
      }

      // Pinch to pause/resume in play/paused state
      const pinching = positions.some((p) => p.visible && p.isPinching);
      if (pinching && engine) {
        if (engine.state.phase === 'play') {
          engine.pause();
        }
      }
    },
    []
  );

  useMediaPipe(videoRef, {
    onPoseResults: handlePoseResults,
    onHandResults: handleHandResults,
    onCameraError: (err) => setCameraError(err.message),
    onReady: () => {},
    enabled: true,
    cameraWidth: 640,
    cameraHeight: 480,
  });

  const handleResume = useCallback(() => {
    engineRef.current?.resume();
  }, []);

  const handleSettings = useCallback(() => {
    engineRef.current?.pause();
    router.push('/settings');
  }, [router]);

  const handleHome = useCallback(() => {
    engineRef.current?.stop();
    router.push('/home');
  }, [router]);

  if (cameraError) return <CameraError error={cameraError} />;

  return (
    <div className="fixed inset-0 bg-black">
      {/* Game Canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0"
        style={{ display: 'block' }}
      />

      {/* HUD */}
      {(gamePhase === 'play' || gamePhase === 'countdown') && (
        <GameHud
          score={score}
          coins={coins}
          distance={distance}
          speed={speed}
          activePowerUps={activePowerUps}
          gestureActive={lastGesture}
        />
      )}

      {/* Pause Overlay */}
      {gamePhase === 'paused' && (
        <PauseOverlay
          handPositions={handPositions}
          onResume={handleResume}
          onSettings={handleSettings}
          onHome={handleHome}
        />
      )}

      {/* Camera preview */}
      <div className="fixed bottom-4 right-4 w-40 h-28 rounded-xl overflow-hidden border border-gray-800 bg-black opacity-70 z-20">
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
