window.GRB = window.GRB || {};

const STATE = {
  LOADING:         'loading',
  TUTORIAL:        'tutorial',
  MAIN_MENU:       'main_menu',
  CAMPAIGN_SELECT: 'campaign_select',
  HIGH_SCORES:     'high_scores',
  HOW_TO_PLAY:     'how_to_play',
  SETTINGS:        'settings',
  DRAW:            'draw',
  SIMULATION:      'simulation',
  PAUSED:          'paused',
  LEVEL_COMPLETE:  'level_complete',
  GAME_OVER:       'game_over',
  ENDLESS_DRAW:    'endless_draw',
  ENDLESS_SIM:     'endless_sim',
  ENDLESS_OVER:    'endless_over',
};

const CW = 960, CH = 540;
const PHYSICS_STEP   = 1000 / 60;   // ~16.67 ms
const STUCK_DELAY_MS = 3000;

GRB.GameEngine = class {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    this.ctx    = this.canvas.getContext('2d');
    this.state  = STATE.LOADING;

    // Sub-systems (set in init)
    this.save  = null; this.physics  = null; this.drawing = null;
    this.vehicle = null; this.level  = null; this.endless = null;
    this.gesture = null; this.cam    = null; this.tracker = null;
    this.hud   = null;  this.menu   = null; this.ui      = null;
    this.particles = null;

    // Viewport camera (world offset)
    this.camera = { x: 0, y: 0 };

    // Runtime vars
    this.currentLevelId   = 1;
    this.isEndless        = false;
    this.elapsedMs        = 0;
    this.starsCollected   = 0;
    this.endlessScore     = 0;
    this.endlessDistance  = 0;
    this._physAccum       = 0;
    this._lastTs          = 0;
    this._stuckTimer      = 0;
    this._gameOverReason  = '';
    this._levelResult     = null;

    // Tutorial
    this._tutStep     = 0;
    this._tutProg     = 0;
    this._handMovedFrom = null;
    this._drewRoad    = false;

    // Menu scroll
    this._prevCursorY = 0;

    // Cursor trail: [{x, y, t}] — t is performance.now() timestamp
    this._cursorTrail = [];
  }

  // ─── Initialization ────────────────────────────────────────────────────────
  async init() {
    console.log('[GameEngine] Initializing...');
    this.save      = new GRB.SaveSystem();
    this.particles = new GRB.ParticleSystem();
    this.physics   = new GRB.PhysicsManager();
    this.drawing   = new GRB.DrawingManager(this.physics);
    this.drawing.particles = this.particles;
    this.vehicle   = new GRB.VehicleManager(this.physics);
    this.level     = new GRB.LevelManager(this.physics);
    this.level.particles = this.particles;
    this.endless   = new GRB.EndlessGenerator();

    // Gesture
    this.gesture = new GRB.GestureManager(CW, CH);
    this.tracker = new GRB.HandTracker();

    // Camera / webcam
    const video   = document.getElementById('webcam');
    const preview = document.getElementById('camera-canvas');
    this.cam = new GRB.CameraManager(video, preview);
    this.cam.setFrameCallback(async (vid) => {
      await this.tracker.processFrame(vid);
    });
    this.tracker.onResults = (landmarks, confidence) => {
      this.gesture.update(landmarks, confidence, performance.now());
      if (landmarks) this.cam.drawLandmarksOnPreview(landmarks);
    };

    // Gesture event routing
    this.gesture.onGestureEvent = (ev) => this._onGestureEvent(ev);

    // Drawing gesture hooks (set once; they guard by state internally)
    this.gesture.onDrawStart = (cx, cy) => {
      if (!this._inDrawState()) return;
      this.drawing.startDraw(cx + this.camera.x, cy + this.camera.y);
      if (this.state === STATE.TUTORIAL && this._tutStep === 2) {
        this._drewRoad = true;
      }
    };
    this.gesture.onDrawMove = (cx, cy) => {
      if (!this._inDrawState()) return;
      this.drawing.continueDraw(cx + this.camera.x, cy + this.camera.y);
      if (this.state === STATE.TUTORIAL && this._tutStep === 2) {
        this._drewRoad = true;
      }
    };
    this.gesture.onDrawEnd = () => {
      if (!this._inDrawState()) return;
      this.drawing.endDraw();
    };

    // UI
    this.hud  = new GRB.HUD();
    this.menu = new GRB.MenuSystem(this.save);
    this.ui   = new GRB.UIManager(this.save, this.menu, this.hud);

    console.log('[GameEngine] Initializing hand tracker...');
    const trackerOk = await this.tracker.initialize();
    console.log('[GameEngine] Hand tracker initialized:', trackerOk);

    console.log('[GameEngine] Starting camera...');
    const camOk = await this.cam.initialize();
    console.log('[GameEngine] Camera initialization result:', camOk);
    if (!camOk) {
      console.error('[GameEngine] Camera failed to start');
      this.ui.showWarning('Camera failed to start – check permissions and ensure no other app uses camera', 8000);
    } else {
      console.log('[GameEngine] Camera started successfully');
    }

    console.log('[GameEngine] All systems initialized');

    if (!this.save.isTutorialDone()) {
      console.log('[GameEngine] Starting tutorial');
      this._startTutorial();
    } else {
      console.log('[GameEngine] Going to main menu');
      this._goToMainMenu();
    }

    this._lastTs = performance.now();
    console.log('[GameEngine] Starting game loop');
    requestAnimationFrame((ts) => this._loop(ts));
  }

  _inDrawState() {
    return this.state === STATE.DRAW
        || this.state === STATE.ENDLESS_DRAW
        || this.state === STATE.TUTORIAL;
  }

  // ─── Main Loop ─────────────────────────────────────────────────────────────
  _loop(ts) {
    const dt = Math.min(50, ts - this._lastTs);
    this._lastTs = ts;

    // Track cursor trail (used for red cursor glow-trail in draw mode)
    if (this.gesture) {
      const c = this.gesture.getCursor();
      this._cursorTrail.push({ x: c.x, y: c.y, t: ts });
      // Keep only 220ms of trail history
      const cutoff = ts - 220;
      while (this._cursorTrail.length > 0 && this._cursorTrail[0].t < cutoff) {
        this._cursorTrail.shift();
      }
    }

    this._update(dt, ts);
    this._draw();
    requestAnimationFrame((t) => this._loop(t));
  }

  // ─── Update ────────────────────────────────────────────────────────────────
  _update(dt, nowMs) {
    const G = this.gesture;
    const cursor  = G.getCursor();
    const gesture = G.getCurrentGesture();

    this.ui.update(dt);
    this.particles.update();

    // ── Tutorial ──
    if (this.state === STATE.TUTORIAL) {
      this._updateTutorial(dt, gesture, cursor, nowMs);
      return;
    }

    // ── Menu screens ──
    if (this._isMenuState()) {
      const isPinch = gesture === GRB.GESTURES.PINCH;
      G.updateSelection(isPinch, nowMs);
      const selProg = G.getSelectionProgress(nowMs);
      const action  = this.menu.update(cursor, selProg, gesture, 0);
      if (action) {
        G.resetSelection();
        this._handleMenuAction(action);
      }
      // Level-select drag scroll
      if (this.state === STATE.CAMPAIGN_SELECT && isPinch) {
        this.menu.handleScroll((this._prevCursorY - cursor.y) * 0.8);
      }
      this._prevCursorY = cursor.y;
      return;
    }

    // ── Draw modes ──
    if (this.state === STATE.DRAW || this.state === STATE.ENDLESS_DRAW) {
      // Edge-scroll only when not pinching
      if (gesture !== GRB.GESTURES.PINCH) {
        this._edgeScroll(cursor, dt);
      }
      // Gesture hint for draw mode
      const gProg = G.getHoldProgress(gesture);
      this._updateGesturePanel(gesture, gProg);
      return;
    }

    // ── Simulation ──
    if (this.state === STATE.SIMULATION || this.state === STATE.ENDLESS_SIM) {
      // Step physics
      this._physAccum += dt;
      while (this._physAccum >= PHYSICS_STEP) {
        this.physics.step(PHYSICS_STEP);
        this._physAccum -= PHYSICS_STEP;
      }

      this.vehicle.update(this.particles);
      this.elapsedMs += dt;
      this.level.update(dt);

      const vpos = this.vehicle.getPosition();
      this._trackCamera(vpos.x, vpos.y);

      // Endless: extend world as vehicle advances
      if (this.state === STATE.ENDLESS_SIM) {
        this.endless.ensureGenerated(vpos.x + 1920);
        this.endlessDistance = Math.max(0, (vpos.x - this.level.startX) / 5);
        this.endlessScore    = Math.floor(this.endlessDistance) + this.starsCollected * 100;
      }

      // Star collection
      const got = this.level.checkStarCollect(vpos.x, vpos.y);
      this.starsCollected += got;

      // Finish (campaign)
      if (this.state === STATE.SIMULATION && this.level.checkFinish(vpos.x, vpos.y)) {
        this._onLevelComplete();
        return;
      }

      // Stuck / fallen checks
      this._stuckTimer += dt;
      if (this._stuckTimer > STUCK_DELAY_MS) {
        if (this.vehicle.isFallen(this.level.worldHeight + 80)) {
          this._onGameOver('Vehicle fell into the void!');
          return;
        }
        if (this.vehicle.isFlipped()) {
          this._onGameOver('Vehicle flipped over!');
          return;
        }
      }

      // Gesture hints during sim
      const gProg = G.getHoldProgress(gesture);
      this._updateGesturePanel(gesture, gProg);
      return;
    }

    // ── Paused ──
    if (this.state === STATE.PAUSED) {
      const gProg = G.getHoldProgress(gesture);
      this._updateGesturePanel(gesture, gProg);
      return;
    }

    // ── Post-level screens ──
    if (this.state === STATE.LEVEL_COMPLETE || this.state === STATE.GAME_OVER
        || this.state === STATE.ENDLESS_OVER) {
      const isPinch = gesture === GRB.GESTURES.PINCH;
      G.updateSelection(isPinch, nowMs);
      const selProg = G.getSelectionProgress(nowMs);

      if (this.state === STATE.ENDLESS_OVER) {
        const action = this.menu.update(cursor, selProg, gesture, 0);
        if (action) { G.resetSelection(); this._handleMenuAction(action); }
      } else if (selProg >= 1) {
        G.resetSelection();
        if (this.state === STATE.LEVEL_COMPLETE) this._nextLevel();
        else if (this.state === STATE.GAME_OVER) this._retryLevel();
      }
    }
  }

  _updateGesturePanel(gesture, progress) {
    const map = {
      [GRB.GESTURES.PINCH]:       ['🤏', 'Drawing…'],
      [GRB.GESTURES.THUMBS_UP]:   ['👍', progress > 0 ? 'Hold to Start!' : 'Thumbs Up!'],
      [GRB.GESTURES.V_SIGN]:      ['✌️', progress > 0.4 ? 'Undo Road…' : 'V Sign – Hold 0.7s'],
      [GRB.GESTURES.OPEN_PALM]:   ['🙌', progress > 0.6 ? 'Clearing All…' : 'Open Palm – Hold 1.5s'],
      [GRB.GESTURES.PALM_HIGH]:   ['🖐️', 'Hold to Clear All'],
      [GRB.GESTURES.CLOSED_FIST]: ['✊', 'Hold to Pause/Resume'],
    };
    const info = map[gesture];
    if (info && typeof window._GRB_gestureUpdate === 'function') {
      window._GRB_gestureUpdate(info[0], info[1], progress);
    } else if (typeof window._GRB_gestureUpdate === 'function') {
      window._GRB_gestureUpdate('', '', 0);
    }
  }

  // ─── Draw ──────────────────────────────────────────────────────────────────
  _draw() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, CW, CH);

    switch (this.state) {
      case STATE.LOADING:
        this._drawLoading(ctx); break;

      case STATE.TUTORIAL:
        this.ui.drawTutorial(ctx, this._tutStep, this._tutProg, this.gesture.getCursor()); break;

      case STATE.MAIN_MENU:
      case STATE.CAMPAIGN_SELECT:
      case STATE.HIGH_SCORES:
      case STATE.HOW_TO_PLAY:
      case STATE.SETTINGS:
        this.menu.draw(ctx, this.gesture.getCursor(), this.save); break;

      case STATE.DRAW:
      case STATE.ENDLESS_DRAW:
      case STATE.SIMULATION:
      case STATE.ENDLESS_SIM:
      case STATE.PAUSED:
      case STATE.LEVEL_COMPLETE:
      case STATE.GAME_OVER:
      case STATE.ENDLESS_OVER:
        this._drawGameplay(ctx); break;
    }
  }

  _drawGameplay(ctx) {
    const cam = this.camera;

    // 1. World layers
    this.level.draw(ctx, cam.x, cam.y);
    this.drawing.draw(ctx, cam.x, cam.y);
    if (this.vehicle.chassis) this.vehicle.draw(ctx, cam.x, cam.y);
    this.particles.draw(ctx, cam.x, cam.y);

    // 2. HUD
    const g      = this.gesture;
    const inSim  = this.state === STATE.SIMULATION || this.state === STATE.ENDLESS_SIM;
    const inDraw = this.state === STATE.DRAW || this.state === STATE.ENDLESS_DRAW;
    this.hud.draw(ctx, {
      gameState:      inDraw ? 'draw' : (inSim || this.state === STATE.PAUSED ? 'simulation' : 'overlay'),
      levelId:        this.currentLevelId,
      inkUsed:        this.drawing.getInkUsed(),
      inkLimit:       this.drawing.getInkLimit(),
      starsCollected: this.starsCollected,
      totalStars:     this.level.getTotalStarCount(),
      elapsedMs:      this.elapsedMs,
      gesture:        g.getCurrentGesture(),
      gestureProgress:g.getHoldProgress(g.getCurrentGesture()),
      handVisible:    g.handVisible,
      confidence:     g.confidence,
      isPaused:       this.state === STATE.PAUSED,
      isEndless:      this.isEndless,
      endlessScore:   this.endlessScore,
      endlessDistance:this.endlessDistance,
    });

    // 3. Overlay screens
    const cursor = this.gesture.getCursor();
    if (this.state === STATE.LEVEL_COMPLETE && this._levelResult) {
      const r = this._levelResult;
      this.hud.drawLevelComplete(ctx, r.stars, r.inkPct, r.timeMs, r.isNew);
      this._drawSelectionHint(ctx, 'PINCH to continue');
    }
    if (this.state === STATE.GAME_OVER) {
      this.hud.drawGameOver(ctx, this._gameOverReason);
      this._drawSelectionHint(ctx, 'PINCH to retry  •  Open Palm for menu');
    }
    if (this.state === STATE.ENDLESS_OVER) {
      this.menu.screen = 'endless_over';
      this.menu.draw(ctx, cursor, this.save); // menu draws its own cursor; return early
      return;
    }
    if (this.state === STATE.PAUSED) {
      this._drawPausedOverlay(ctx);
    }

    // 4. Cursor — always drawn LAST so it appears above everything
    if (inDraw) {
      this._drawGameCursor(ctx, cursor, g.getCurrentGesture());
    } else if (
      this.state === STATE.LEVEL_COMPLETE ||
      this.state === STATE.GAME_OVER ||
      this.state === STATE.PAUSED
    ) {
      this._drawOverlayCursor(ctx, cursor);
    }
  }

  _drawLoading(ctx) {
    ctx.fillStyle = '#0d1b2a'; ctx.fillRect(0, 0, CW, CH);
    ctx.textAlign = 'center'; ctx.fillStyle = '#fff';
    ctx.font = 'bold 28px "Segoe UI", sans-serif';
    ctx.fillText('Loading…', 480, 270); ctx.textAlign = 'left';
  }

  _drawGameCursor(ctx, c, gesture) {
    if (!c) return;
    const now = performance.now();
    const isPinch = gesture === GRB.GESTURES.PINCH;

    // Trail (last N cursor positions fade out)
    for (let i = 0; i < this._cursorTrail.length; i++) {
      const pt = this._cursorTrail[i];
      const age = (now - pt.t) / 220; // 0=newest, 1=oldest
      if (age > 1) continue;
      const alpha = (1 - age) * (isPinch ? 0.55 : 0.35);
      const r     = (1 - age) * (isPinch ? 7 : 5);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = '#ff2222';
      ctx.beginPath(); ctx.arc(pt.x, pt.y, Math.max(1, r), 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }

    // Pulsing scale (subtle sine wave)
    const pulse = 1 + Math.sin(now / 320) * 0.12;
    const baseR = isPinch ? 10 : 18;
    const r = baseR * pulse;

    // Outer glow
    const glowR = r + 14;
    const glow = ctx.createRadialGradient(c.x, c.y, r * 0.5, c.x, c.y, glowR);
    glow.addColorStop(0, isPinch ? 'rgba(255,40,40,0.50)' : 'rgba(255,40,40,0.28)');
    glow.addColorStop(1, 'rgba(255,40,40,0)');
    ctx.fillStyle = glow;
    ctx.beginPath(); ctx.arc(c.x, c.y, glowR, 0, Math.PI * 2); ctx.fill();

    // White outer ring
    ctx.strokeStyle = 'rgba(255,255,255,0.90)';
    ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(c.x, c.y, r, 0, Math.PI * 2); ctx.stroke();

    // Red fill ring (inner)
    ctx.strokeStyle = '#ff2222';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(c.x, c.y, r - 3.5, 0, Math.PI * 2); ctx.stroke();

    // Bright red center dot
    ctx.fillStyle = '#ff2222';
    ctx.beginPath(); ctx.arc(c.x, c.y, isPinch ? 5 : 4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(c.x, c.y, isPinch ? 2 : 1.5, 0, Math.PI * 2); ctx.fill();
  }

  _drawOverlayCursor(ctx, c) {
    if (!c) return;
    const now = performance.now();
    const pulse = 1 + Math.sin(now / 380) * 0.10;
    const r = 16 * pulse;

    // Soft glow
    const glow = ctx.createRadialGradient(c.x, c.y, r * 0.4, c.x, c.y, r + 10);
    glow.addColorStop(0, 'rgba(255,40,40,0.30)');
    glow.addColorStop(1, 'rgba(255,40,40,0)');
    ctx.fillStyle = glow;
    ctx.beginPath(); ctx.arc(c.x, c.y, r + 10, 0, Math.PI * 2); ctx.fill();

    // White ring
    ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(c.x, c.y, r, 0, Math.PI * 2); ctx.stroke();

    // Red center dot
    ctx.fillStyle = '#ff2222';
    ctx.beginPath(); ctx.arc(c.x, c.y, 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(c.x, c.y, 2, 0, Math.PI * 2); ctx.fill();
  }

  _drawSelectionHint(ctx, text) {
    const selProg = this.gesture.getSelectionProgress(performance.now());
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = '13px "Segoe UI", sans-serif';
    ctx.fillText(text, 480, 490);
    ctx.textAlign = 'left';

    if (selProg > 0) {
      const c = this.gesture.getCursor();
      ctx.strokeStyle = '#ff4444'; ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(c.x, c.y, 18, -Math.PI/2, -Math.PI/2 + Math.PI * 2 * selProg);
      ctx.stroke();
    }
  }

  _drawPausedOverlay(ctx) {
    ctx.fillStyle = 'rgba(0,0,0,0.62)'; ctx.fillRect(0, 0, CW, CH);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff'; ctx.font = 'bold 52px "Segoe UI", sans-serif';
    ctx.fillText('PAUSED', 480, 230);
    ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.font = '18px "Segoe UI", sans-serif';
    ctx.fillText('✊ Closed Fist (hold 1s) to resume', 480, 278);
    ctx.textAlign = 'left';
  }

  // ─── Gesture event handler ─────────────────────────────────────────────────
  _onGestureEvent(ev) {
    if (ev.type !== 'hold_complete') return;
    const { gesture } = ev;

    switch (gesture) {
      case GRB.GESTURES.THUMBS_UP:
        if (this.state === STATE.DRAW)         this._startSimulation();
        else if (this.state === STATE.ENDLESS_DRAW) this._startEndlessSim();
        break;

      case GRB.GESTURES.V_SIGN:
        if (this.state === STATE.DRAW || this.state === STATE.ENDLESS_DRAW) {
          if (this.drawing.undoLast()) this.ui.showWarning('✌️ Road removed!', 1000);
          else this.ui.showWarning('Nothing to undo', 800);
        }
        break;

      case GRB.GESTURES.OPEN_PALM:
      case GRB.GESTURES.PALM_HIGH:
        if (this.state === STATE.DRAW || this.state === STATE.ENDLESS_DRAW) {
          this.drawing.clearAll();
          this.ui.showWarning('🙌 All roads cleared!', 1500);
        }
        break;

      case GRB.GESTURES.CLOSED_FIST:
        if (this.state === STATE.SIMULATION || this.state === STATE.ENDLESS_SIM) {
          this.state = STATE.PAUSED;
        } else if (this.state === STATE.PAUSED) {
          this.state = this.isEndless ? STATE.ENDLESS_SIM : STATE.SIMULATION;
        }
        break;
    }
  }

  // ─── Tutorial ──────────────────────────────────────────────────────────────
  _startTutorial() {
    this._tutStep = 0; this._tutProg = 0;
    this._handMovedFrom = null; this._drewRoad = false;
    this.state = STATE.TUTORIAL;
  }

  _updateTutorial(dt, gesture, cursor, nowMs) {
    const G = this.gesture;
    switch (this._tutStep) {
      case 0: // Show hand
        if (G.handVisible) {
          this._tutProg = Math.min(1, this._tutProg + dt / 1200);
          if (this._tutProg >= 1) this._tutAdvance();
        } else {
          this._tutProg = Math.max(0, this._tutProg - dt / 600);
        }
        break;

      case 1: // Move cursor
        if (!this._handMovedFrom) this._handMovedFrom = { ...cursor };
        if (GRB.MathUtils.dist(cursor, this._handMovedFrom) > 80) {
          this._tutProg = Math.min(1, this._tutProg + dt / 800);
          if (this._tutProg >= 1) this._tutAdvance();
        }
        break;

      case 2: // Pinch to draw
        if (gesture === GRB.GESTURES.PINCH) {
          this._tutProg = Math.min(1, this._tutProg + dt / 800);
        } else if (this._drewRoad) {
          this._tutProg = Math.min(1, this._tutProg + dt / 400);
        } else {
          this._tutProg = Math.max(0, this._tutProg - dt / 1200);
        }
        if (this._tutProg >= 1) this._tutAdvance();
        break;

      case 3: // Thumbs up (hold)
        if (gesture === GRB.GESTURES.THUMBS_UP) {
          this._tutProg = G.getHoldProgress(GRB.GESTURES.THUMBS_UP);
          if (this._tutProg >= 1) this._tutAdvance();
        } else {
          this._tutProg = Math.max(0, this._tutProg - dt / 400);
        }
        break;

      case 4: // V Sign (hold 700ms → undo)
        if (gesture === GRB.GESTURES.V_SIGN) {
          this._tutProg = G.getHoldProgress(GRB.GESTURES.V_SIGN);
          if (this._tutProg >= 1) this._tutAdvance();
        } else {
          this._tutProg = Math.max(0, this._tutProg - dt / 400);
        }
        break;

      case 5: // Done
        this._tutProg = Math.min(1, this._tutProg + dt / 1200);
        if (this._tutProg >= 1) {
          this.save.markTutorialDone();
          this._goToMainMenu();
        }
        break;
    }
    // Update gesture panel for tutorial hints
    const icons  = ['👋', '☝️', '🤏', '👍', '✌️', '🎉'];
    const labels = [
      'Show your hand',
      'Move your finger',
      'Pinch to draw',
      'Thumbs up – hold 1s',
      'V sign – hold 0.7s',
      'All done!'
    ];
    if (typeof window._GRB_gestureUpdate === 'function') {
      window._GRB_gestureUpdate(icons[this._tutStep] || '', labels[this._tutStep] || '', this._tutProg);
    }
  }

  _tutAdvance() {
    this._tutStep++;
    this._tutProg = 0;
    this._handMovedFrom = null;
    this._drewRoad = false;
  }

  // ─── State helpers ─────────────────────────────────────────────────────────
  _isMenuState() {
    return this.state === STATE.MAIN_MENU
        || this.state === STATE.CAMPAIGN_SELECT
        || this.state === STATE.HIGH_SCORES
        || this.state === STATE.HOW_TO_PLAY
        || this.state === STATE.SETTINGS;
  }

  _goToMainMenu() {
    this.menu.setScreen('main');
    this.state = STATE.MAIN_MENU;
  }

  _handleMenuAction(action) {
    switch (action) {
      case 'campaign':
        this.menu.setScreen('campaign_select');
        this.state = STATE.CAMPAIGN_SELECT; break;
      case 'endless':    this._startEndlessMode(); break;
      case 'highscores':
        this.menu.setScreen('high_scores');
        this.state = STATE.HIGH_SCORES; break;
      case 'howtoplay':
        this.menu.setScreen('how_to_play');
        this.state = STATE.HOW_TO_PLAY; break;
      case 'settings':
        this.menu.setScreen('settings');
        this.state = STATE.SETTINGS; break;
      case 'toggle_camera':
        this.ui.toggleCameraPreview();
        break; // stay on settings screen
      case 'back':       this._goToMainMenu(); break;
      case 'resume':
        this.state = this.isEndless ? STATE.ENDLESS_SIM : STATE.SIMULATION; break;
      case 'retry':      this._retryLevel();  break;
      case 'next':       this._nextLevel();   break;
      case 'menu':       this._goToMainMenu(); break;
      default:
        if (action.startsWith('level_')) {
          const id = parseInt(action.split('_')[1]);
          if (!isNaN(id)) {
            const progress = this.save.getCampaignProgress();
            if (id <= progress + 1) this._startCampaignLevel(id);
            else this.ui.showWarning('Level locked! Complete previous levels first.', 2000);
          }
        }
    }
  }

  // ─── Campaign level setup ──────────────────────────────────────────────────
  _startCampaignLevel(levelId) {
    this.currentLevelId  = levelId;
    this.isEndless       = false;
    this.starsCollected  = 0;
    this.elapsedMs       = 0;
    this._stuckTimer     = 0;
    this._gameOverReason = '';
    this._levelResult    = null;
    this._physAccum      = 0;

    this.physics.reset();
    this.drawing.clearAll();
    this.drawing.enable();

    const ok = this.level.loadCampaign(levelId);
    if (!ok) { this._goToMainMenu(); return; }

    const ld = GRB.CAMPAIGN_LEVELS.find(l => l.id === levelId);
    this.drawing.setInkLimit(ld ? ld.ink : 99999);

    this.vehicle.destroy();
    this.vehicle.create(this.level.startX, this.level.startY);

    this.camera.x = 0; this.camera.y = 0;
    this.state = STATE.DRAW;
  }

  _startSimulation() {
    this.drawing.disable();
    this.vehicle.startDriving();
    this._stuckTimer  = 0;
    this._physAccum   = 0;
    this.state = STATE.SIMULATION;
  }

  // ─── Endless mode ──────────────────────────────────────────────────────────
  _startEndlessMode() {
    this.isEndless      = true;
    this.starsCollected = 0;
    this.elapsedMs      = 0;
    this.endlessScore   = 0;
    this.endlessDistance= 0;
    this._stuckTimer    = 0;
    this._physAccum     = 0;

    this.physics.reset();
    this.drawing.clearAll();
    this.drawing.setInkLimit(99999);
    this.drawing.enable();

    this.endless.reset();
    this.level.loadEndless(this.endless);

    this.vehicle.destroy();
    this.vehicle.create(this.level.startX, this.level.startY);

    this.camera.x = 0; this.camera.y = 0;
    this.state = STATE.ENDLESS_DRAW;
  }

  _startEndlessSim() {
    this.drawing.disable();
    this.vehicle.startDriving();
    this._stuckTimer = 0;
    this._physAccum  = 0;
    this.state = STATE.ENDLESS_SIM;
  }

  // ─── Level outcome ─────────────────────────────────────────────────────────
  _onLevelComplete() {
    this.vehicle.stopDriving();
    this.drawing.disable();

    const inkPct  = this.drawing.getInkLimit() > 0
      ? this.drawing.getInkUsed() / this.drawing.getInkLimit() : 1;
    const stars   = this._calcStars(
      this.starsCollected, this.level.getTotalStarCount(), inkPct);
    const prevBest = this.save.getLevelStars(this.currentLevelId);
    const isNew    = stars > prevBest;
    this.save.setLevelStars(this.currentLevelId, stars);

    this._levelResult = { stars, inkPct, timeMs: this.elapsedMs, isNew };
    this.state = STATE.LEVEL_COMPLETE;
  }

  _calcStars(collected, total, inkPct) {
    let s = 1; // base: completion
    if (total === 0 || collected >= total) s++; // all stars collected
    if (inkPct < 0.65) s++;                     // ink saver
    return Math.min(3, s);
  }

  _nextLevel() {
    const next = this.currentLevelId + 1;
    if (next > 50) this._goToMainMenu();
    else this._startCampaignLevel(next);
  }

  _retryLevel() {
    if (this.isEndless) this._startEndlessMode();
    else this._startCampaignLevel(this.currentLevelId);
  }

  _onGameOver(reason) {
    this.vehicle.stopDriving();
    this._gameOverReason = reason;
    if (this.isEndless) {
      this.save.submitEndlessScore(this.endlessScore, this.endlessDistance);
      this.menu.setScreen('endless_over');
      this.state = STATE.ENDLESS_OVER;
    } else {
      this.state = STATE.GAME_OVER;
    }
  }

  // ─── Camera helpers ────────────────────────────────────────────────────────
  _edgeScroll(cursor, dt) {
    if (!cursor) return;
    const ZONE = 80, SPD = 5 * (dt / 16.67);
    const maxX = Math.max(0, this.level.worldWidth - CW);
    if (cursor.x > CW - ZONE) this.camera.x = Math.min(maxX, this.camera.x + SPD);
    else if (cursor.x < ZONE) this.camera.x = Math.max(0, this.camera.x - SPD);
  }

  _trackCamera(vx, vy) {
    const tx = vx - CW * 0.35;
    const ty = vy - CH * 0.5;
    this.camera.x += (tx - this.camera.x) * 0.08;
    this.camera.y += (ty - this.camera.y) * 0.06;
    this.camera.x = Math.max(0, Math.min(Math.max(0, this.level.worldWidth - CW), this.camera.x));
    this.camera.y = Math.max(0, Math.min(Math.max(0, this.level.worldHeight - CH), this.camera.y));
  }
};
