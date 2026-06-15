'use client';

import { useEffect, useRef, useState } from 'react';
import type { HandPosition } from '../types/gestures';
import { DWELL_TIME } from '../utils/constants';

interface DwellButton {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

interface UseDwellNavOptions {
  buttons: DwellButton[];
  handPositions: HandPosition[];
  onActivate: (id: string) => void;
  dwellTime?: number;
  enabled: boolean;
}

export function useDwellNav(options: UseDwellNavOptions): {
  hoveredId: string | null;
  dwellProgress: number;
} {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [dwellProgress, setDwellProgress] = useState(0);
  const dwellStart = useRef<number | null>(null);
  const activatedRef = useRef<Set<string>>(new Set());
  const rafRef = useRef<number | null>(null);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  useEffect(() => {
    if (!options.enabled) {
      setHoveredId(null);
      setDwellProgress(0);
      return;
    }

    const dwell = options.dwellTime ?? DWELL_TIME;

    function tick() {
      const opts = optionsRef.current;
      const hand = opts.handPositions.find((h) => h.visible) ?? null;

      let currentHovered: string | null = null;

      if (hand && typeof window !== 'undefined') {
        const hx = hand.x * window.innerWidth;
        const hy = hand.y * window.innerHeight;

        for (const btn of opts.buttons) {
          if (hx >= btn.x && hx <= btn.x + btn.w && hy >= btn.y && hy <= btn.y + btn.h) {
            currentHovered = btn.id;
            break;
          }
        }
      }

      setHoveredId((prev) => {
        if (prev !== currentHovered) {
          dwellStart.current = currentHovered ? Date.now() : null;
          activatedRef.current.delete(currentHovered ?? '');
        }
        return currentHovered;
      });

      if (currentHovered && dwellStart.current !== null) {
        const elapsed = Date.now() - dwellStart.current;
        const progress = Math.min(1, elapsed / dwell);
        setDwellProgress(progress);

        if (progress >= 1 && !activatedRef.current.has(currentHovered)) {
          activatedRef.current.add(currentHovered);
          opts.onActivate(currentHovered);
          dwellStart.current = null;
          setDwellProgress(0);
        }
      } else {
        setDwellProgress(0);
      }

      rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [options.enabled, options.dwellTime]);

  return { hoveredId, dwellProgress };
}
