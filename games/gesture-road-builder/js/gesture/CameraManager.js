window.GRB = window.GRB || {};

GRB.CameraManager = class {
  constructor(videoEl, previewCanvasEl) {
    this.video = videoEl;
    this.previewCanvas = previewCanvasEl;
    this.previewCtx = previewCanvasEl.getContext('2d');
    this.mpCamera = null;
    this.ready = false;
    this.onFrameCallback = null;
  }

  async initialize() {
    if (typeof Camera === 'undefined') {
      console.error('[CameraManager] MediaPipe Camera Utils not loaded');
      return false;
    }

    // Ensure video element is properly configured
    this.video.setAttribute('autoplay', 'true');
    this.video.setAttribute('muted', 'true');
    this.video.setAttribute('playsinline', 'true');
    this.video.style.visibility = 'visible';
    this.video.style.width = '320px';
    this.video.style.height = '240px';

    console.log('[CameraManager] Video element configured:', {
      autoplay: this.video.autoplay,
      muted: this.video.muted,
      readyState: this.video.readyState,
      networkState: this.video.networkState
    });

    return new Promise((resolve) => {
      try {
        const cameraConfig = {
          onFrame: async () => {
            if (this.onFrameCallback) {
              try {
                await this.onFrameCallback(this.video);
              } catch (e) {
                console.warn('[CameraManager] onFrame callback error:', e);
              }
            }
            this._drawPreview();
          },
          width: 320,
          height: 240,
          facingMode: 'user'
        };

        console.log('[CameraManager] Creating Camera with config:', cameraConfig);
        this.mpCamera = new Camera(this.video, cameraConfig);

        console.log('[CameraManager] Calling camera.start()...');
        this.mpCamera.start()
          .then(() => {
            console.log('[CameraManager] ✓ Camera started successfully');
            this.ready = true;
            resolve(true);
          })
          .catch(err => {
            console.error('[CameraManager] ✗ Camera.start() failed');
            console.error('Error name:', err.name);
            console.error('Error message:', err.message);
            console.error('Full error:', err);

            // Try to provide helpful suggestions
            if (err.name === 'NotReadableError') {
              console.error('→ This usually means: camera is in use by another app, or browser lacks permission');
            } else if (err.name === 'NotAllowedError') {
              console.error('→ This usually means: user denied camera permission');
            }

            resolve(false);
          });
      } catch (err) {
        console.error('[CameraManager] Camera initialization error:', err);
        resolve(false);
      }
    });
  }

  setFrameCallback(fn) { this.onFrameCallback = fn; }

  _drawPreview() {
    const ctx = this.previewCtx;
    const w = this.previewCanvas.width;
    const h = this.previewCanvas.height;
    ctx.clearRect(0, 0, w, h);
    // Draw video (CSS already mirrors via scaleX(-1))
    try {
      ctx.drawImage(this.video, 0, 0, w, h);
    } catch (_) {}
  }

  drawLandmarksOnPreview(landmarks, handedness) {
    if (!landmarks || landmarks.length === 0) return;
    const ctx = this.previewCtx;
    const W = this.previewCanvas.width;
    const H = this.previewCanvas.height;

    // Skeleton connections
    const CONNECTIONS = [
      [0,1],[1,2],[2,3],[3,4],
      [0,5],[5,6],[6,7],[7,8],
      [0,9],[9,10],[10,11],[11,12],
      [0,13],[13,14],[14,15],[15,16],
      [0,17],[17,18],[18,19],[19,20],
      [5,9],[9,13],[13,17]
    ];

    ctx.strokeStyle = 'rgba(0,229,255,0.7)';
    ctx.lineWidth = 1.2;
    for (const [a, b] of CONNECTIONS) {
      const la = landmarks[a], lb = landmarks[b];
      ctx.beginPath();
      // preview canvas CSS does scaleX(-1), so we draw non-flipped
      ctx.moveTo(la.x * W, la.y * H);
      ctx.lineTo(lb.x * W, lb.y * H);
      ctx.stroke();
    }

    // Landmark dots
    ctx.fillStyle = '#fff';
    const TIPS = [4, 8, 12, 16, 20];
    for (let i = 0; i < 21; i++) {
      const lm = landmarks[i];
      const isTip = TIPS.includes(i);
      ctx.fillStyle = isTip ? '#00e5ff' : '#fff';
      ctx.beginPath();
      ctx.arc(lm.x * W, lm.y * H, isTip ? 3 : 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  stop() {
    if (this.mpCamera) this.mpCamera.stop();
    this.ready = false;
  }
};
