window.GRB = window.GRB || {};

GRB.UIManager = class {
  constructor(saveSystem, menuSystem, hud) {
    this.save   = saveSystem;
    this.menu   = menuSystem;
    this.hud    = hud;

    // DOM refs — gesture panel
    this._iconEl  = document.getElementById('gesture-icon-display');
    this._nameEl  = document.getElementById('gesture-name-display');
    this._ringEl  = document.getElementById('ring-progress');
    this._warnEl  = document.getElementById('warning-banner');
    this._warnTimer = 0;

    // DOM refs — camera preview
    this._camPreview = document.getElementById('camera-preview');
    this._camToggleBtn = document.getElementById('camera-toggle-btn');

    // Apply saved preference immediately
    this._applyCameraVisibility(
      this.save.get('settings.showCameraPreview', true)
    );

    // DOM toggle button (for mouse users / accessibility)
    if (this._camToggleBtn) {
      this._camToggleBtn.addEventListener('click', () => {
        this.toggleCameraPreview();
      });
    }

    // Expose gesture-panel update for HUD/GameEngine
    window._GRB_gestureUpdate = (icon, label, progress) => {
      this._updateGesturePanel(icon, label, progress);
    };
  }

  // ── Gesture panel ──────────────────────────────────────────────────────────
  _updateGesturePanel(icon, label, progress) {
    if (this._iconEl) this._iconEl.textContent = icon || '';
    if (this._nameEl) this._nameEl.textContent = label || '';
    if (this._ringEl) {
      const circumference = 2 * Math.PI * 18;
      const dash = Math.max(0, circumference * Math.min(1, progress));
      this._ringEl.setAttribute('stroke-dasharray', `${dash} ${circumference}`);
      this._ringEl.setAttribute('stroke', progress > 0.9 ? '#00e676' : '#ff4444');
    }
  }

  clearGesturePanel() {
    this._updateGesturePanel('', '', 0);
  }

  // ── Warnings ───────────────────────────────────────────────────────────────
  showWarning(text, durationMs = 2500) {
    if (!this._warnEl) return;
    this._warnEl.textContent = text;
    this._warnEl.classList.remove('hidden');
    this._warnTimer = durationMs;
  }

  update(dt) {
    if (this._warnTimer > 0) {
      this._warnTimer -= dt;
      if (this._warnTimer <= 0) {
        if (this._warnEl) this._warnEl.classList.add('hidden');
        this._warnTimer = 0;
      }
    }
  }

  // ── Camera preview visibility ──────────────────────────────────────────────
  _applyCameraVisibility(visible) {
    if (this._camPreview) {
      if (visible) {
        this._camPreview.classList.remove('cam-hidden');
      } else {
        this._camPreview.classList.add('cam-hidden');
      }
    }
    // Show/hide the restore button (opposite of preview)
    if (this._camToggleBtn) {
      if (visible) {
        this._camToggleBtn.classList.remove('visible');
      } else {
        this._camToggleBtn.classList.add('visible');
      }
    }
  }

  toggleCameraPreview() {
    const current = this.save.get('settings.showCameraPreview', true);
    const next = !current;
    this.save.set('settings.showCameraPreview', next);
    this._applyCameraVisibility(next);
    this.showWarning(
      next ? '📷 Camera preview shown' : '📷 Camera preview hidden',
      1400
    );
    return next;
  }

  setCameraPreview(visible) {
    this.save.set('settings.showCameraPreview', visible);
    this._applyCameraVisibility(visible);
  }

  isCameraPreviewVisible() {
    return this.save.get('settings.showCameraPreview', true);
  }

  // ── Legacy drawMenu (kept for compatibility) ───────────────────────────────
  drawMenu(ctx, cursor, selProgress, gesture, gestureProgress) {
    const action = this.menu.update(cursor, selProgress, gesture, gestureProgress);
    this.menu.draw(ctx, cursor, this.save);
    return action;
  }

  // ── Tutorial ───────────────────────────────────────────────────────────────
  drawTutorial(ctx, step, stepProgress, cursor) {
    ctx.fillStyle = 'rgba(10,15,30,0.94)';
    ctx.fillRect(0, 0, 960, 540);

    const steps = [
      { icon:'👋', title:'Show Your Hand',   desc:'Hold your hand in front of the camera' },
      { icon:'☝️', title:'Move Cursor',      desc:'Your index fingertip controls the red cursor' },
      { icon:'🤏', title:'Pinch to Draw',    desc:'Pinch thumb + index together and move to draw a road' },
      { icon:'👍', title:'Start Vehicle',    desc:'Make a thumbs-up and hold for 1 second to launch' },
      { icon:'✌️', title:'Undo Road',        desc:'Show a V sign (peace sign) and hold 0.7 seconds to undo' },
    ];

    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 28px "Segoe UI", sans-serif';
    ctx.fillText('Gesture Tutorial', 480, 80);

    for (let i = 0; i < steps.length; i++) {
      const done   = i < step;
      const active = i === step;
      const x = 160 + i * 160, y = 200;

      ctx.save();
      ctx.globalAlpha = done ? 0.5 : active ? 1 : 0.3;

      ctx.strokeStyle = done ? '#00e676' : active ? '#ff3333' : '#555';
      ctx.lineWidth   = active ? 3 : 1.5;
      ctx.beginPath(); ctx.arc(x, y, 38, 0, Math.PI * 2);
      if (done) { ctx.fillStyle = 'rgba(0,230,118,0.15)'; ctx.fill(); }
      else if (active) { ctx.fillStyle = 'rgba(255,40,40,0.12)'; ctx.fill(); }
      ctx.stroke();

      if (done) {
        ctx.fillStyle = '#00e676'; ctx.font = 'bold 28px sans-serif';
        ctx.fillText('✓', x, y + 10);
      } else {
        ctx.font = '28px sans-serif'; ctx.fillText(steps[i].icon, x, y + 10);
      }

      ctx.fillStyle = active ? '#ff4444' : '#aaa';
      ctx.font = `bold ${active ? 13 : 11}px "Segoe UI", sans-serif`;
      ctx.fillText(steps[i].title, x, y + 58);
      ctx.restore();
    }

    if (step < steps.length) {
      const s = steps[step];
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 22px "Segoe UI", sans-serif';
      ctx.fillText(s.title, 480, 320);
      ctx.fillStyle = 'rgba(255,255,255,0.65)';
      ctx.font = '16px "Segoe UI", sans-serif';
      ctx.fillText(s.desc, 480, 356);

      if (stepProgress > 0) {
        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        ctx.beginPath(); ctx.roundRect(340, 384, 280, 8, 4); ctx.fill();
        ctx.fillStyle = '#ff3333';
        ctx.beginPath(); ctx.roundRect(340, 384, 280 * stepProgress, 8, 4); ctx.fill();
      }
    } else {
      ctx.fillStyle = '#00e676';
      ctx.font = 'bold 24px "Segoe UI", sans-serif';
      ctx.fillText('Tutorial Complete!', 480, 340);
      ctx.fillStyle = 'rgba(255,255,255,0.65)';
      ctx.font = '16px "Segoe UI", sans-serif';
      ctx.fillText("You're ready to build roads!", 480, 374);
    }

    ctx.textAlign = 'left';

    // Red cursor in tutorial
    if (cursor) {
      const now = performance.now();
      const pulse = 1 + Math.sin(now / 320) * 0.12;
      const r = 16 * pulse;

      const glow = ctx.createRadialGradient(cursor.x, cursor.y, r * 0.3, cursor.x, cursor.y, r + 10);
      glow.addColorStop(0, 'rgba(255,40,40,0.35)');
      glow.addColorStop(1, 'rgba(255,40,40,0)');
      ctx.fillStyle = glow;
      ctx.beginPath(); ctx.arc(cursor.x, cursor.y, r + 10, 0, Math.PI * 2); ctx.fill();

      ctx.strokeStyle = 'rgba(255,255,255,0.88)'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(cursor.x, cursor.y, r, 0, Math.PI * 2); ctx.stroke();

      ctx.fillStyle = '#ff2222';
      ctx.beginPath(); ctx.arc(cursor.x, cursor.y, 5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(cursor.x, cursor.y, 2, 0, Math.PI * 2); ctx.fill();
    }
  }
};
