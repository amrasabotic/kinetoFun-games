window.GRB = window.GRB || {};

GRB.UIManager = class {
  constructor(saveSystem, menuSystem, hud) {
    this.save   = saveSystem;
    this.menu   = menuSystem;
    this.hud    = hud;

    // DOM refs for gesture panel
    this._iconEl  = document.getElementById('gesture-icon-display');
    this._nameEl  = document.getElementById('gesture-name-display');
    this._ringEl  = document.getElementById('ring-progress');
    this._warnEl  = document.getElementById('warning-banner');
    this._warnTimer = 0;

    // Expose update hook for HUD
    window._GRB_gestureUpdate = (icon, label, progress) => {
      this._updateGesturePanel(icon, label, progress);
    };
  }

  _updateGesturePanel(icon, label, progress) {
    if (this._iconEl) this._iconEl.textContent = icon || '';
    if (this._nameEl) this._nameEl.textContent = label || '';
    if (this._ringEl) {
      const circumference = 2 * Math.PI * 18; // r=18
      const dash = Math.max(0, circumference * Math.min(1, progress));
      this._ringEl.setAttribute('stroke-dasharray', `${dash} ${circumference}`);
      this._ringEl.setAttribute('stroke', progress > 0.9 ? '#00e676' : '#00e5ff');
    }
  }

  clearGesturePanel() {
    this._updateGesturePanel('', '', 0);
  }

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

  drawMenu(ctx, cursor, selProgress, gesture, gestureProgress) {
    const action = this.menu.update(cursor, selProgress, gesture, gestureProgress);
    this.menu.draw(ctx, cursor, this.save);
    return action;
  }

  // Tutorial drawing
  drawTutorial(ctx, step, stepProgress, cursor) {
    ctx.fillStyle = 'rgba(10,15,30,0.94)';
    ctx.fillRect(0, 0, 960, 540);

    const steps = [
      { icon:'👋', title:'Show Your Hand', desc:'Hold your hand in front of the camera' },
      { icon:'☝️', title:'Move Cursor',    desc:'Your index fingertip controls the cursor' },
      { icon:'✌️', title:'Pinch to Draw',  desc:'Bring thumb and index together to draw a road' },
      { icon:'👍', title:'Start Vehicle',  desc:'Make a thumbs-up and hold for 1 second' },
      { icon:'✋', title:'Undo Road',      desc:'Open your palm and hold 1.5 seconds to undo' },
    ];

    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 28px "Segoe UI", sans-serif';
    ctx.fillText('Gesture Tutorial', 480, 80);

    // Steps
    for (let i = 0; i < steps.length; i++) {
      const done  = i < step;
      const active = i === step;
      const x = 160 + i * 160, y = 200;

      ctx.save();
      ctx.globalAlpha = done ? 0.5 : active ? 1 : 0.3;

      // Circle
      ctx.strokeStyle = done ? '#00e676' : active ? '#00e5ff' : '#555';
      ctx.lineWidth = active ? 3 : 1.5;
      ctx.beginPath(); ctx.arc(x, y, 38, 0, Math.PI * 2);
      if (done) {
        ctx.fillStyle = 'rgba(0,230,118,0.15)';
        ctx.fill();
      }
      ctx.stroke();

      if (done) {
        ctx.fillStyle = '#00e676';
        ctx.font = 'bold 28px sans-serif';
        ctx.fillText('✓', x, y + 10);
      } else {
        ctx.font = '28px sans-serif';
        ctx.fillText(steps[i].icon, x, y + 10);
      }

      ctx.fillStyle = active ? '#00e5ff' : '#aaa';
      ctx.font = `bold ${active ? 13 : 11}px "Segoe UI", sans-serif`;
      ctx.fillText(steps[i].title, x, y + 58);
      ctx.restore();
    }

    // Active step instructions
    if (step < steps.length) {
      const s = steps[step];
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 22px "Segoe UI", sans-serif';
      ctx.fillText(s.title, 480, 320);
      ctx.fillStyle = 'rgba(255,255,255,0.65)';
      ctx.font = '16px "Segoe UI", sans-serif';
      ctx.fillText(s.desc, 480, 356);

      // Progress bar
      if (stepProgress > 0) {
        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        ctx.beginPath(); ctx.roundRect(340, 384, 280, 8, 4); ctx.fill();
        ctx.fillStyle = '#00e5ff';
        ctx.beginPath(); ctx.roundRect(340, 384, 280 * stepProgress, 8, 4); ctx.fill();
      }
    } else {
      ctx.fillStyle = '#00e676';
      ctx.font = 'bold 24px "Segoe UI", sans-serif';
      ctx.fillText('Tutorial Complete!', 480, 340);
      ctx.fillStyle = 'rgba(255,255,255,0.65)';
      ctx.font = '16px "Segoe UI", sans-serif';
      ctx.fillText('You\'re ready to build roads!', 480, 374);
    }

    ctx.textAlign = 'left';

    // Draw cursor
    if (cursor) {
      ctx.strokeStyle = 'rgba(0,229,255,0.7)';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(cursor.x, cursor.y, 14, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = '#00e5ff';
      ctx.beginPath(); ctx.arc(cursor.x, cursor.y, 4, 0, Math.PI * 2); ctx.fill();
    }
  }
};
