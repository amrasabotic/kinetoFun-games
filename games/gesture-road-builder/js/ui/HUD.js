window.GRB = window.GRB || {};

GRB.HUD = class {
  constructor() {
    this.inkFlash = 0;
  }

  draw(ctx, state) {
    const {
      gameState, levelId, inkUsed, inkLimit, starsCollected, totalStars,
      elapsedMs, gesture, gestureProgress, handVisible, confidence,
      isPaused, isEndless, endlessScore, endlessDistance
    } = state;

    if (gameState === 'draw') {
      this._drawInkMeter(ctx, inkUsed, inkLimit);
      this._drawStarCounter(ctx, starsCollected, totalStars);
      if (!isEndless) this._drawLevelBadge(ctx, levelId);
      this._drawDrawModeHint(ctx);
    } else if (gameState === 'simulation' || gameState === 'paused') {
      this._drawStarCounter(ctx, starsCollected, totalStars);
      if (isEndless) {
        this._drawEndlessHUD(ctx, endlessScore, endlessDistance);
      } else {
        this._drawTimer(ctx, elapsedMs);
      }
      if (isPaused) this._drawPauseOverlay(ctx);
    }

    // Gesture feedback (always shown during gameplay)
    if (gameState !== 'complete' && gameState !== 'game_over') {
      this._drawGestureFeedback(ctx, gesture, gestureProgress);
      this._drawTrackingQuality(ctx, handVisible, confidence);
    }
  }

  _drawInkMeter(ctx, used, limit) {
    const W = 220, H = 18;
    const x = 960 - W - 16, y = 16;
    const pct = limit > 0 ? Math.min(1, used / limit) : 0;

    // Background
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.beginPath(); ctx.roundRect(x - 8, y - 8, W + 16, H + 16, 8); ctx.fill();

    // Label
    ctx.fillStyle = '#e2e8f0';
    ctx.font = 'bold 11px "Segoe UI", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('INK', x, y + H - 4);

    const barX = x + 32, barW = W - 36;
    // Track
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.beginPath(); ctx.roundRect(barX, y, barW, H, 6); ctx.fill();

    // Fill
    const fillColor = pct > 0.8
      ? (pct > 0.95 ? '#ff4444' : '#f97316')
      : '#00e5ff';
    if (pct > 0) {
      ctx.fillStyle = fillColor;
      ctx.beginPath(); ctx.roundRect(barX, y, Math.max(8, barW * pct), H, 6); ctx.fill();
    }

    // Ink % text
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 10px "Segoe UI", sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`${Math.round((1 - pct) * 100)}%`, x + W, y + H - 4);
    ctx.textAlign = 'left';
  }

  _drawStarCounter(ctx, collected, total) {
    const x = 16, y = 16;
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.beginPath(); ctx.roundRect(x - 8, y - 8, 130, 36, 8); ctx.fill();

    ctx.font = 'bold 16px "Segoe UI", sans-serif';
    ctx.fillStyle = '#fde047';
    ctx.textAlign = 'left';
    ctx.fillText('★', x, y + 18);

    ctx.fillStyle = '#fff';
    ctx.font = 'bold 14px "Segoe UI", sans-serif';
    ctx.fillText(` ${collected} / ${total}`, x + 18, y + 18);
  }

  _drawLevelBadge(ctx, levelId) {
    const x = 960 / 2, y = 22;
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.beginPath(); ctx.roundRect(x - 55, y - 14, 110, 28, 8); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 14px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`Level ${levelId}`, x, y + 6);
    ctx.textAlign = 'left';
  }

  _drawDrawModeHint(ctx) {
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.beginPath(); ctx.roundRect(960/2 - 140, 510 - 22, 280, 28, 8); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.font = '12px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('PINCH to draw roads  •  THUMBS UP to start', 960/2, 510 - 5);
    ctx.textAlign = 'left';
  }

  _drawTimer(ctx, ms) {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const ss = String(s % 60).padStart(2, '0');
    const txt = `${m}:${ss}`;
    const x = 960 / 2, y = 22;
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.beginPath(); ctx.roundRect(x - 55, y - 14, 110, 28, 8); ctx.fill();
    ctx.fillStyle = '#e2e8f0';
    ctx.font = 'bold 14px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(txt, x, y + 6);
    ctx.textAlign = 'left';
  }

  _drawEndlessHUD(ctx, score, distance) {
    const x = 960 / 2, y = 22;
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.beginPath(); ctx.roundRect(x - 80, y - 14, 160, 28, 8); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 13px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${Math.floor(distance)}m  •  ${score} pts`, x, y + 6);
    ctx.textAlign = 'left';
  }

  _drawPauseOverlay(ctx) {
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(0, 0, 960, 540);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 52px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('PAUSED', 480, 250);
    ctx.font = '20px "Segoe UI", sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.fillText('CLOSED FIST to resume', 480, 290);
    ctx.textAlign = 'left';
  }

  _drawGestureFeedback(ctx, gesture, progress) {
    if (!gesture || gesture === 'none') return;

    const icons = {
      pinch:        { icon:'✌️', label:'Drawing…' },
      open_palm:    { icon:'✋', label:progress > 0.7 ? 'Undo Last Road' : 'Open Palm – Hold' },
      palm_high:    { icon:'🖐️', label:'Hold to Clear All' },
      closed_fist:  { icon:'✊', label:'Hold to Pause' },
      thumbs_up:    { icon:'👍', label:'Hold to Start!' }
    };
    const info = icons[gesture];
    if (!info) return;

    // Update DOM gesture panel via global event (GameEngine reads it)
    if (typeof window._GRB_gestureUpdate === 'function') {
      window._GRB_gestureUpdate(info.icon, info.label, progress);
    }
  }

  _drawTrackingQuality(ctx, visible, confidence) {
    const dot = document.getElementById('tracking-dot');
    const label = document.getElementById('tracking-label');
    if (!dot || !label) return;
    if (!visible) {
      dot.className = 'red';
      label.textContent = 'No hand detected';
    } else if (confidence < 0.6) {
      dot.className = 'yellow';
      label.textContent = 'Tracking weak…';
    } else {
      dot.className = 'green';
      label.textContent = 'Tracking OK';
    }
  }

  drawLevelComplete(ctx, stars, inkPct, timeMs, isNew) {
    // Overlay
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0, 0, 960, 540);

    // Card
    ctx.fillStyle = '#1e2a3a';
    ctx.beginPath(); ctx.roundRect(280, 110, 400, 320, 16); ctx.fill();
    ctx.strokeStyle = '#00e5ff'; ctx.lineWidth = 2;
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 32px "Segoe UI", sans-serif';
    ctx.fillText('Level Complete!', 480, 160);

    // Stars
    for (let i = 0; i < 3; i++) {
      const got = i < stars;
      ctx.font = `${got ? 42 : 32}px sans-serif`;
      ctx.globalAlpha = got ? 1 : 0.3;
      ctx.fillText('★', 400 + i * 80, 220);
    }
    ctx.globalAlpha = 1;

    ctx.font = '16px "Segoe UI", sans-serif';
    ctx.fillStyle = '#94a3b8';
    const secs = Math.floor(timeMs / 1000);
    ctx.fillText(`Time: ${secs}s    Ink used: ${Math.round((1-inkPct)*100)}%`, 480, 265);

    if (isNew) {
      ctx.fillStyle = '#fde047';
      ctx.font = 'bold 14px "Segoe UI", sans-serif';
      ctx.fillText('NEW BEST!', 480, 290);
    }

    ctx.fillStyle = '#e2e8f0';
    ctx.font = '13px "Segoe UI", sans-serif';
    ctx.fillText('PINCH button to continue', 480, 360);
    ctx.textAlign = 'left';
  }

  drawGameOver(ctx, reason) {
    ctx.fillStyle = 'rgba(0,0,0,0.72)';
    ctx.fillRect(0, 0, 960, 540);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ff6b6b';
    ctx.font = 'bold 40px "Segoe UI", sans-serif';
    ctx.fillText('Oh No!', 480, 210);
    ctx.fillStyle = '#cbd5e1';
    ctx.font = '20px "Segoe UI", sans-serif';
    ctx.fillText(reason || 'Vehicle crashed!', 480, 255);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '14px "Segoe UI", sans-serif';
    ctx.fillText('PINCH Retry  •  Open Palm for Menu', 480, 310);
    ctx.textAlign = 'left';
  }
};
