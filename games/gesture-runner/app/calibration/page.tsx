'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useMediaPipe } from '../../hooks/useMediaPipe';
import { CalibrationView } from '../../components/CalibrationView';
import { CameraError } from '../../components/CameraError';
import { GestureAnalyzer } from '../../mediapipe/gestureAnalyzer';
import { GameStorage } from '../../storage/GameStorage';
import type { CalibrationStatus } from '../../types/game';
import { STABLE_FRAMES_REQUIRED } from '../../utils/constants';

const NOSE = 0;
const L_SHOULDER = 11;
const R_SHOULDER = 12;

const analyzer = new GestureAnalyzer();

export default function CalibrationPage() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const skeletonCanvasRef = useRef<HTMLCanvasElement>(null);
  const handsCanvasRef = useRef<HTMLCanvasElement>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const stableFramesRef = useRef(0);
  const autoAdvanceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [status, setStatus] = useState<CalibrationStatus>({
    cameraReady: false,
    poseReady: false,
    handsReady: false,
    positionOk: false,
    stableFrames: 0,
    isReady: false,
  });

  const handleReady = useCallback(() => {
    // Store selected character in sessionStorage for game page
    const charId = GameStorage.getEquippedCharacter();
    const settings = GameStorage.getSettings();
    sessionStorage.setItem('gesture-runner:character', charId);
    sessionStorage.setItem('gesture-runner:settings', JSON.stringify(settings));
    router.push('/game');
  }, [router]);

  const handlePoseResults = useCallback((landmarks: PoseLandmark[] | null) => {
    if (!landmarks || landmarks.length < 25) {
      stableFramesRef.current = 0;
      setStatus((prev) => ({ ...prev, poseReady: false, positionOk: false, stableFrames: 0, isReady: false }));
      return;
    }

    const nose = landmarks[NOSE];
    const lShoulder = landmarks[L_SHOULDER];
    const rShoulder = landmarks[R_SHOULDER];

    const poseVisible =
      (nose.visibility ?? 0) > 0.6 &&
      (lShoulder.visibility ?? 0) > 0.6 &&
      (rShoulder.visibility ?? 0) > 0.6;

    const positionOk =
      poseVisible &&
      nose.y >= 0.1 &&
      nose.y <= 0.65;

    if (poseVisible && positionOk) {
      stableFramesRef.current = Math.min(STABLE_FRAMES_REQUIRED, stableFramesRef.current + 1);
    } else {
      stableFramesRef.current = Math.max(0, stableFramesRef.current - 2);
    }

    const isReady = stableFramesRef.current >= STABLE_FRAMES_REQUIRED;

    setStatus((prev) => ({
      ...prev,
      poseReady: poseVisible,
      positionOk,
      stableFrames: stableFramesRef.current,
      isReady,
    }));

    // Draw skeleton
    const canvas = skeletonCanvasRef.current;
    if (canvas && videoRef.current) {
      canvas.width = videoRef.current.videoWidth || 640;
      canvas.height = videoRef.current.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (ctx && typeof drawConnectors !== 'undefined') {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawConnectors(ctx, landmarks, POSE_CONNECTIONS, { color: '#00ffcc', lineWidth: 2 });
        drawLandmarks(ctx, landmarks, { color: '#00ffcc', lineWidth: 1, radius: 4 });
      }
    }

    // Auto-advance after ready
    if (isReady && !autoAdvanceRef.current) {
      autoAdvanceRef.current = setTimeout(() => {
        handleReady();
      }, 1500);
    }
  }, [handleReady]);

  const handleHandResults = useCallback(
    (landmarks: HandLandmark[][], handedness: Array<{ label: string; score: number; index: number }>) => {
      const hasHands = landmarks.length > 0;
      setStatus((prev) => ({ ...prev, handsReady: hasHands }));

      // Draw hands
      const canvas = handsCanvasRef.current;
      if (canvas && videoRef.current) {
        canvas.width = videoRef.current.videoWidth || 640;
        canvas.height = videoRef.current.videoHeight || 480;
        const ctx = canvas.getContext('2d');
        if (ctx && typeof drawConnectors !== 'undefined') {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          landmarks.forEach((lms) => {
            drawConnectors(ctx, lms, HAND_CONNECTIONS, { color: '#ff88ff', lineWidth: 2 });
            drawLandmarks(ctx, lms, { color: '#ff88ff', lineWidth: 1, radius: 4 });
          });
        }
      }
    },
    []
  );

  useMediaPipe(videoRef, {
    onPoseResults: handlePoseResults,
    onHandResults: handleHandResults,
    onCameraError: (err) => setCameraError(err.message),
    onReady: () => setStatus((prev) => ({ ...prev, cameraReady: true })),
    enabled: true,
    cameraWidth: 640,
    cameraHeight: 480,
  });

  useEffect(() => {
    return () => {
      if (autoAdvanceRef.current) clearTimeout(autoAdvanceRef.current);
    };
  }, []);

  if (cameraError) return <CameraError error={cameraError} />;

  return (
    <CalibrationView
      videoRef={videoRef}
      skeletonCanvasRef={skeletonCanvasRef}
      handsCanvasRef={handsCanvasRef}
      calibrationStatus={status}
      onReady={handleReady}
    />
  );
}
