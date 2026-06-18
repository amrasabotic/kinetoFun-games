window.GRB = window.GRB || {};

const GESTURES = {
  NONE: 'none',
  PINCH: 'pinch',
  V_SIGN: 'v_sign',         // ✌️ index + middle up → undo road (700ms)
  OPEN_PALM: 'open_palm',   // 🙌 all fingers open → clear all (1.5s)
  CLOSED_FIST: 'closed_fist',
  THUMBS_UP: 'thumbs_up',
  PALM_HIGH: 'palm_high'    // kept as fall-through alias for clear all
};

GRB.GestureManager = class {
  constructor(canvasWidth, canvasHeight) {
    this.CW = canvasWidth;
    this.CH = canvasHeight;

    // Smoothed cursor (canvas space)
    this.cursor = { x: canvasWidth / 2, y: canvasHeight / 2 };
    this._rawCursor = { x: canvasWidth / 2, y: canvasHeight / 2 };
    this._prevCursor = { x: canvasWidth / 2, y: canvasHeight / 2 };
    this._velocity = { x: 0, y: 0 };

    this.SMOOTH_ALPHA = 0.30;
    this.DEAD_ZONE = 4; // px

    this.currentGesture = GESTURES.NONE;
    this.prevGesture = GESTURES.NONE;

    // Dwell timers (ms)
    this._dwellStart = 0;
    this._dwellGesture = GESTURES.NONE;

    // Pinch state
    this.isPinching = false;
    this._pinchStart = null;

    // Callbacks
    this.onCursorMove = null;    // (x, y)
    this.onDrawStart  = null;    // (x, y)
    this.onDrawMove   = null;    // (x, y)
    this.onDrawEnd    = null;    // ()
    this.onGestureEvent = null;  // ({ type, ... })

    this.handVisible = false;
    this.confidence  = 0;

    // Gesture hold tracking
    this._holds = {};
    // { gestureName: { startTime, fired } }

    this.HOLD_DURATIONS = {
      [GESTURES.THUMBS_UP]:    1000,   // 1 s → start vehicle
      [GESTURES.V_SIGN]:        700,   // 0.7 s → undo last road
      [GESTURES.OPEN_PALM]:    1500,   // 1.5 s → clear all roads
      [GESTURES.PALM_HIGH]:    1500,   // 1.5 s → clear all (alias)
      [GESTURES.CLOSED_FIST]:  1000    // 1 s → pause/resume
    };

    // Selection dwell (cursor over UI button + pinch hold)
    this._selectionDwell = { active: false, startTime: 0, fired: false };
    this.SELECTION_HOLD = 700; // ms

    this.landmarks = null;
  }

  // Called every frame with latest landmarks (null if no hand)
  update(landmarks, confidence, nowMs) {
    this.landmarks = landmarks;
    this.confidence = confidence || 0;
    this.handVisible = !!landmarks;

    if (!landmarks) {
      this._emitIfNeeded(GESTURES.NONE, nowMs);
      this.isPinching = false;
      return;
    }

    // Update cursor from index tip (landmark 8)
    const raw = {
      x: landmarks[8].x * this.CW,
      y: landmarks[8].y * this.CH
    };

    // Dead-zone filter
    const moved = GRB.MathUtils.dist(raw, this._rawCursor);
    if (moved > this.DEAD_ZONE) {
      this._rawCursor = raw;
    }

    // Velocity-based predictive smoothing
    const prev = this.cursor;
    const smoothed = GRB.MathUtils.expSmooth(this.cursor, this._rawCursor, this.SMOOTH_ALPHA);
    this._velocity = {
      x: smoothed.x - prev.x,
      y: smoothed.y - prev.y
    };
    this.cursor = {
      x: smoothed.x + this._velocity.x * 0.3,
      y: smoothed.y + this._velocity.y * 0.3
    };

    if (this.onCursorMove) this.onCursorMove(this.cursor.x, this.cursor.y);

    // Detect gesture
    const gesture = this._classify(landmarks);
    this._emitIfNeeded(gesture, nowMs);

    // Handle pinch for drawing
    const pinchNow = gesture === GESTURES.PINCH;
    if (pinchNow && !this.isPinching) {
      this.isPinching = true;
      if (this.onDrawStart) this.onDrawStart(this.cursor.x, this.cursor.y);
    } else if (pinchNow && this.isPinching) {
      if (this.onDrawMove) this.onDrawMove(this.cursor.x, this.cursor.y);
    } else if (!pinchNow && this.isPinching) {
      this.isPinching = false;
      if (this.onDrawEnd) this.onDrawEnd();
    }
  }

  _classify(lm) {
    const pinchDist = GRB.MathUtils.dist2(lm[4].x, lm[4].y, lm[8].x, lm[8].y);
    if (pinchDist < 0.08) return GESTURES.PINCH;

    const indexExt  = this._fingerExtended(lm, 8,  7,  6);
    const middleExt = this._fingerExtended(lm, 12, 11, 10);
    const ringExt   = this._fingerExtended(lm, 16, 15, 14);
    const pinkyExt  = this._fingerExtended(lm, 20, 19, 18);

    const thumbUp  = lm[4].y < lm[3].y - 0.02;
    const allCurl  = !indexExt && !middleExt && !ringExt && !pinkyExt;
    const allOpen  = indexExt && middleExt && ringExt && pinkyExt;

    // ✌️ V sign: index + middle up, ring + pinky curled
    if (indexExt && middleExt && !ringExt && !pinkyExt) return GESTURES.V_SIGN;

    if (thumbUp && allCurl) return GESTURES.THUMBS_UP;
    if (allCurl) return GESTURES.CLOSED_FIST;

    if (allOpen) {
      // If hand is raised high (wrist y < 0.3 of frame)
      const wristY = lm[0].y;
      if (wristY < 0.35) return GESTURES.PALM_HIGH;
      return GESTURES.OPEN_PALM;
    }

    return GESTURES.NONE;
  }

  _fingerExtended(lm, tipIdx, dipIdx, pipIdx) {
    return lm[tipIdx].y < lm[pipIdx].y;
  }

  _emitIfNeeded(gesture, nowMs) {
    if (gesture !== this.currentGesture) {
      // Reset hold for previous gesture
      this._holds[this.currentGesture] = null;
      this.prevGesture = this.currentGesture;
      this.currentGesture = gesture;
      if (gesture !== GESTURES.NONE && gesture !== GESTURES.PINCH) {
        this._holds[gesture] = { startTime: nowMs, fired: false };
      }
      if (this.onGestureEvent) {
        this.onGestureEvent({ type: 'gesture_change', gesture, prev: this.prevGesture });
      }
    }

    // Check hold completions
    const holdData = this._holds[gesture];
    if (holdData && !holdData.fired && this.HOLD_DURATIONS[gesture]) {
      const elapsed = nowMs - holdData.startTime;
      if (elapsed >= this.HOLD_DURATIONS[gesture]) {
        holdData.fired = true;
        if (this.onGestureEvent) {
          this.onGestureEvent({ type: 'hold_complete', gesture });
        }
      }
    }
  }

  getHoldProgress(gesture) {
    const holdData = this._holds[gesture];
    if (!holdData || this.currentGesture !== gesture) return 0;
    const dur = this.HOLD_DURATIONS[gesture];
    if (!dur) return 0;
    const elapsed = performance.now() - holdData.startTime;
    return Math.min(1, elapsed / dur);
  }

  getCurrentGesture() { return this.currentGesture; }
  getCursor() { return { ...this.cursor }; }

  // For UI hover+dwell selection
  updateSelection(active, nowMs) {
    if (active && !this._selectionDwell.active) {
      this._selectionDwell = { active: true, startTime: nowMs, fired: false };
    } else if (!active) {
      this._selectionDwell = { active: false, startTime: 0, fired: false };
    }
    if (this._selectionDwell.active && !this._selectionDwell.fired) {
      const elapsed = nowMs - this._selectionDwell.startTime;
      if (elapsed >= this.SELECTION_HOLD) {
        this._selectionDwell.fired = true;
        return true; // selection fired
      }
    }
    return false;
  }

  getSelectionProgress(nowMs) {
    if (!this._selectionDwell.active) return 0;
    return Math.min(1, (nowMs - this._selectionDwell.startTime) / this.SELECTION_HOLD);
  }

  resetSelection() {
    this._selectionDwell = { active: false, startTime: 0, fired: false };
  }
};

GRB.GESTURES = GESTURES;
