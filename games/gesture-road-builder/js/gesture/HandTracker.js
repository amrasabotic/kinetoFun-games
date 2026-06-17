window.GRB = window.GRB || {};

GRB.HandTracker = class {
  constructor() {
    this.hands = null;
    this.landmarks = null;
    this.handedness = null;
    this.confidence = 0;
    this.onResults = null; // external callback
    this.framesWithoutHand = 0;
    this.MAX_FRAMES_WITHOUT_HAND = 30;
  }

  async initialize() {
    if (typeof Hands === 'undefined') {
      console.error('[HandTracker] MediaPipe Hands not loaded');
      return false;
    }
    this.hands = new Hands({
      locateFile: (file) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
    });
    this.hands.setOptions({
      selfieMode: true,
      maxNumHands: 1,
      modelComplexity: 1,
      minDetectionConfidence: 0.65,
      minTrackingConfidence: 0.55
    });
    this.hands.onResults((results) => this._handleResults(results));
    return true;
  }

  _handleResults(results) {
    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      this.landmarks = results.multiHandLandmarks[0];
      this.handedness = results.multiHandedness
        ? results.multiHandedness[0]
        : null;
      this.confidence = this.handedness
        ? this.handedness.score
        : 0.8;
      this.framesWithoutHand = 0;
    } else {
      this.landmarks = null;
      this.handedness = null;
      this.confidence = 0;
      this.framesWithoutHand++;
    }
    if (this.onResults) this.onResults(this.landmarks, this.confidence);
  }

  async processFrame(videoEl) {
    if (this.hands) {
      await this.hands.send({ image: videoEl });
    }
  }

  getLandmarks() { return this.landmarks; }
  getConfidence() { return this.confidence; }
  isHandVisible() { return this.landmarks !== null; }
  isLost() { return this.framesWithoutHand > this.MAX_FRAMES_WITHOUT_HAND; }
};
