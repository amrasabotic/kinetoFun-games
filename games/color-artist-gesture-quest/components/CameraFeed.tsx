// ============================================================
// CAMERA FEED — Layer 1 component
// Manages webcam + MediaPipe lifecycle. Emits HandFrames only.
// No game logic. No rendering of gameplay.
// ============================================================

import React, { useEffect, useRef } from "react";
import { HandTracker } from "../lib/handTracking/handTracker";
import { GestureEngine } from "../lib/gestures/gestureEngine";
import type { GestureState, HandFrame } from "../types";

interface Props {
  onGestureState: (state: GestureState) => void;
  onRawFrame?: (frame: HandFrame | null) => void;
  previewCanvasRef?: React.RefObject<HTMLCanvasElement>;
}

export const CameraFeed: React.FC<Props> = ({
  onGestureState,
  onRawFrame,
  previewCanvasRef,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const trackerRef = useRef<HandTracker | null>(null);
  const engineRef = useRef(new GestureEngine());

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const tracker = new HandTracker(video, (frame: HandFrame | null) => {
      onRawFrame?.(frame);

      const state = engineRef.current.process(frame);
      onGestureState(state);

      // Mirror video into preview canvas when available
      const canvas = previewCanvasRef?.current;
      if (canvas && video.readyState >= 2) {
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.save();
          ctx.scale(-1, 1);
          ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
          ctx.restore();
        }
      }
    });

    trackerRef.current = tracker;
    tracker.start().catch((err) => {
      console.error("[CameraFeed] Failed to start tracker:", err);
    });

    return () => {
      tracker.stop();
      trackerRef.current = null;
    };
  }, []);

  return (
    <video
      ref={videoRef}
      width={640}
      height={480}
      playsInline
      muted
      style={{ display: "none", position: "absolute", pointerEvents: "none" }}
    />
  );
};
