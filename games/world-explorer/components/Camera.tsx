'use client';

import { useEffect, useRef, useCallback } from 'react';
import { detectGesture, GestureState, WaveDetector } from '@/lib/gestures';

interface CameraProps {
  onGestureUpdate: (state: GestureState & { isWave: boolean }) => void;
  showLandmarks?: boolean;
}

const WASM_PATH = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm';
const MODEL_PATH =
  'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';

export default function Camera({ onGestureUpdate, showLandmarks = true }: CameraProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const landmarkerRef = useRef<any>(null);
  const animFrameRef = useRef<number>(0);
  const waveDetectorRef = useRef(new WaveDetector());
  const onGestureRef = useRef(onGestureUpdate);
  onGestureRef.current = onGestureUpdate;

  const drawLandmarks = useCallback((ctx: CanvasRenderingContext2D, landmarks: any[], w: number, h: number) => {
    const CONNECTIONS = [
      [0,1],[1,2],[2,3],[3,4],
      [0,5],[5,6],[6,7],[7,8],
      [0,9],[9,10],[10,11],[11,12],
      [0,13],[13,14],[14,15],[15,16],
      [0,17],[17,18],[18,19],[19,20],
      [5,9],[9,13],[13,17],
    ];

    ctx.strokeStyle = 'rgba(99,202,255,0.7)';
    ctx.lineWidth = 2;
    for (const [a, b] of CONNECTIONS) {
      const lmA = landmarks[a];
      const lmB = landmarks[b];
      ctx.beginPath();
      ctx.moveTo((1 - lmA.x) * w, lmA.y * h);
      ctx.lineTo((1 - lmB.x) * w, lmB.y * h);
      ctx.stroke();
    }

    landmarks.forEach((lm, i) => {
      const x = (1 - lm.x) * w;
      const y = lm.y * h;
      ctx.fillStyle = i === 8 ? '#facc15' : i === 4 ? '#4ade80' : 'rgba(255,255,255,0.8)';
      ctx.beginPath();
      ctx.arc(x, y, i === 8 || i === 4 ? 7 : 4, 0, Math.PI * 2);
      ctx.fill();
    });
  }, []);

  useEffect(() => {
    let mounted = true;

    const initMediaPipe = async () => {
      try {
        const { FilesetResolver, HandLandmarker } = await import('@mediapipe/tasks-vision');
        const vision = await FilesetResolver.forVisionTasks(WASM_PATH);
        const landmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: { modelAssetPath: MODEL_PATH, delegate: 'GPU' },
          numHands: 1,
          runningMode: 'VIDEO',
        });
        if (!mounted) return;
        landmarkerRef.current = landmarker;
        startCamera();
      } catch (err) {
        console.error('MediaPipe init failed:', err);
      }
    };

    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480, frameRate: 30 },
        });
        if (!mounted || !videoRef.current) return;
        videoRef.current.srcObject = stream;
        videoRef.current.onloadeddata = () => {
          if (mounted) runDetectionLoop();
        };
      } catch (err) {
        console.error('Camera access failed:', err);
      }
    };

    const runDetectionLoop = () => {
      if (!mounted || !landmarkerRef.current || !videoRef.current || !canvasRef.current) return;

      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx || video.readyState < 2) {
        animFrameRef.current = requestAnimationFrame(runDetectionLoop);
        return;
      }

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      ctx.scale(-1, 1);
      ctx.translate(-canvas.width, 0);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      ctx.restore();

      const results = landmarkerRef.current.detectForVideo(video, performance.now());

      if (results.landmarks && results.landmarks.length > 0) {
        const landmarks = results.landmarks[0];

        if (showLandmarks) {
          drawLandmarks(ctx, landmarks, canvas.width, canvas.height);
        }

        const gestureState = detectGesture(landmarks);
        const isWave = waveDetectorRef.current.update(landmarks[0].x);

        onGestureRef.current({ ...gestureState, isWave });
      } else {
        onGestureRef.current({
          gesture: 'NONE',
          cursorX: 0.5,
          cursorY: 0.5,
          confidence: 0,
          pinchStrength: 0,
          handPresent: false,
          isWave: false,
        });
      }

      animFrameRef.current = requestAnimationFrame(runDetectionLoop);
    };

    initMediaPipe();

    return () => {
      mounted = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (landmarkerRef.current) {
        try { landmarkerRef.current.close(); } catch {}
      }
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((t) => t.stop());
      }
    };
  }, [drawLandmarks, showLandmarks]);

  return (
    <div className="relative w-40 h-28 rounded-xl overflow-hidden border-2 border-white/20 shadow-xl">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="absolute inset-0 w-full h-full object-cover opacity-0 pointer-events-none"
      />
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full object-cover" />
      <div className="absolute bottom-1 left-1 text-[10px] text-white/60 font-mono">📷 LIVE</div>
    </div>
  );
}
