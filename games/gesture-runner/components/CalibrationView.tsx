'use client';

import { type RefObject } from 'react';
import type { CalibrationStatus } from '../types/game';
import { STABLE_FRAMES_REQUIRED } from '../utils/constants';

interface CalibrationViewProps {
  videoRef: RefObject<HTMLVideoElement>;
  skeletonCanvasRef: RefObject<HTMLCanvasElement>;
  handsCanvasRef: RefObject<HTMLCanvasElement>;
  calibrationStatus: CalibrationStatus;
  onReady: () => void;
}

function StatusRow({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div
        className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
          ok ? 'bg-[#00ff88] text-black' : 'bg-gray-700 text-gray-500'
        }`}
      >
        {ok ? '✓' : '○'}
      </div>
      <span
        className={`text-lg font-medium ${ok ? 'text-[#00ff88]' : 'text-gray-500'}`}
      >
        {label}
      </span>
    </div>
  );
}

export function CalibrationView({
  videoRef,
  skeletonCanvasRef,
  handsCanvasRef,
  calibrationStatus,
  onReady,
}: CalibrationViewProps) {
  const progressPct = Math.min(100, (calibrationStatus.stableFrames / STABLE_FRAMES_REQUIRED) * 100);

  return (
    <div className="fixed inset-0 bg-[#000818] flex">
      {/* Camera area */}
      <div className="flex-1 relative flex items-center justify-center p-8">
        <div className="relative" style={{ maxWidth: 720, width: '100%', aspectRatio: '4/3' }}>
          {/* Video feed */}
          <video
            ref={videoRef}
            className="w-full h-full object-cover rounded-2xl"
            style={{ transform: 'scaleX(-1)' }}
            autoPlay
            playsInline
            muted
          />
          {/* Skeleton overlay */}
          <canvas
            ref={skeletonCanvasRef}
            className="absolute inset-0 w-full h-full rounded-2xl"
            style={{ transform: 'scaleX(-1)' }}
          />
          {/* Hands overlay */}
          <canvas
            ref={handsCanvasRef}
            className="absolute inset-0 w-full h-full rounded-2xl"
            style={{ transform: 'scaleX(-1)' }}
          />
          {/* Overlay text */}
          <div className="absolute inset-0 flex items-end justify-center pb-4 pointer-events-none">
            {!calibrationStatus.positionOk && calibrationStatus.poseReady && (
              <div className="bg-black/70 text-yellow-400 text-lg font-bold px-6 py-3 rounded-xl">
                Step back so your full body is visible
              </div>
            )}
            {calibrationStatus.isReady && (
              <div className="bg-[#00ff88]/20 border-2 border-[#00ff88] text-[#00ff88] text-2xl font-bold px-8 py-4 rounded-xl animate-pulse">
                READY!
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="w-80 flex flex-col justify-center p-8 border-l border-gray-800 gap-6">
        <div>
          <h1 className="text-3xl font-bold text-[#00ffcc] mb-2">Calibration</h1>
          <p className="text-gray-400 text-base leading-relaxed">
            Stand 2-4m from camera.<br />
            Make sure your full body is visible.
          </p>
        </div>

        {/* Status checklist */}
        <div className="space-y-4">
          <StatusRow label="Camera" ok={calibrationStatus.cameraReady} />
          <StatusRow label="Pose Detection" ok={calibrationStatus.poseReady} />
          <StatusRow label="Hand Detection" ok={calibrationStatus.handsReady} />
          <StatusRow label="Position OK" ok={calibrationStatus.positionOk} />
          <StatusRow label="Stable" ok={calibrationStatus.isReady} />
        </div>

        {/* Stability progress bar */}
        <div>
          <div className="flex justify-between text-sm text-gray-500 mb-2">
            <span>Stability</span>
            <span>{Math.round(progressPct)}%</span>
          </div>
          <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-200"
              style={{
                width: `${progressPct}%`,
                backgroundColor: progressPct >= 100 ? '#00ff88' : '#00ffcc',
              }}
            />
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-gray-900 rounded-xl p-4 text-gray-400 text-sm space-y-2">
          <p className="font-bold text-gray-300 mb-2">Gesture Test:</p>
          <p>Raise both hands above shoulders → <span className="text-[#00ff88]">Jump</span></p>
          <p>Duck down → <span className="text-[#ffe04d]">Slide</span></p>
          <p>Lean left/right → <span className="text-[#4dc8ff]">Move lane</span></p>
        </div>

        {/* Ready button */}
        {calibrationStatus.isReady && (
          <button
            className="w-full py-5 rounded-xl bg-[#00ff88] text-black text-2xl font-bold hover:bg-[#00cc66] transition-colors cursor-none"
            onClick={onReady}
          >
            START GAME
          </button>
        )}
      </div>
    </div>
  );
}
