window.GRB = window.GRB || {};

GRB.SaveSystem = class {
  constructor() {
    this.NS = 'grb_'; // namespace prefix
    this._data = this._load();
  }

  _load() {
    try {
      const raw = localStorage.getItem(this.NS + 'save');
      return raw ? JSON.parse(raw) : this._defaultData();
    } catch { return this._defaultData(); }
  }

  _defaultData() {
    return {
      tutorialDone: false,
      campaignProgress: 0,       // highest unlocked level (0-based index)
      levelStars: {},            // { "1": 3, "2": 2, ... }
      endlessHighScore: 0,
      endlessHighDistance: 0,
      totalStars: 0,
      settings: {
        sfxVolume: 0.8,
        musicVolume: 0.5,
        showCameraPreview: true
      }
    };
  }

  _persist() {
    try {
      localStorage.setItem(this.NS + 'save', JSON.stringify(this._data));
    } catch (e) {
      console.warn('[SaveSystem] localStorage write failed:', e.message);
    }
  }

  get(key, fallback = null) {
    const keys = key.split('.');
    let cur = this._data;
    for (const k of keys) {
      if (cur == null || typeof cur !== 'object') return fallback;
      cur = cur[k];
    }
    return cur !== undefined ? cur : fallback;
  }

  set(key, value) {
    const keys = key.split('.');
    let cur = this._data;
    for (let i = 0; i < keys.length - 1; i++) {
      if (cur[keys[i]] === undefined) cur[keys[i]] = {};
      cur = cur[keys[i]];
    }
    cur[keys[keys.length - 1]] = value;
    this._persist();
  }

  setLevelStars(levelId, stars) {
    const prev = this._data.levelStars[String(levelId)] || 0;
    const best = Math.max(prev, stars);
    this._data.levelStars[String(levelId)] = best;
    if (best > prev) {
      this._data.totalStars = Object.values(this._data.levelStars)
        .reduce((s, v) => s + v, 0);
    }
    if (levelId >= this._data.campaignProgress && stars > 0) {
      this._data.campaignProgress = levelId + 1;
    }
    this._persist();
  }

  getLevelStars(levelId) {
    return this._data.levelStars[String(levelId)] || 0;
  }

  submitEndlessScore(score, distance) {
    let changed = false;
    if (score > this._data.endlessHighScore) {
      this._data.endlessHighScore = score;
      changed = true;
    }
    if (distance > this._data.endlessHighDistance) {
      this._data.endlessHighDistance = distance;
      changed = true;
    }
    if (changed) this._persist();
    return changed;
  }

  isTutorialDone() { return !!this._data.tutorialDone; }
  markTutorialDone() { this.set('tutorialDone', true); }

  getCampaignProgress() { return this._data.campaignProgress; }
  getTotalStars() { return this._data.totalStars; }
  getEndlessHighScore() { return this._data.endlessHighScore; }
  getEndlessHighDistance() { return this._data.endlessHighDistance; }

  reset() {
    this._data = this._defaultData();
    this._persist();
  }
};
