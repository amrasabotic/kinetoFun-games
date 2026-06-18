window.GRB = window.GRB || {};

// Polyfill CanvasRenderingContext2D.roundRect for older browsers
if (!CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function(x, y, w, h, r) {
    const radius = typeof r === 'number' ? r
      : Array.isArray(r) ? (r[0] || 0) : 0;
    const R = Math.min(radius, w / 2, h / 2);
    this.moveTo(x + R, y);
    this.lineTo(x + w - R, y);
    this.quadraticCurveTo(x + w, y, x + w, y + R);
    this.lineTo(x + w, y + h - R);
    this.quadraticCurveTo(x + w, y + h, x + w - R, y + h);
    this.lineTo(x + R, y + h);
    this.quadraticCurveTo(x, y + h, x, y + h - R);
    this.lineTo(x, y + R);
    this.quadraticCurveTo(x, y, x + R, y);
    this.closePath();
    return this;
  };
}

window.addEventListener('DOMContentLoaded', async () => {
  // Verify CDN libraries loaded
  const missing = [];
  if (typeof Matter === 'undefined') missing.push('Matter.js');
  if (typeof Hands === 'undefined') missing.push('MediaPipe Hands');
  if (typeof Camera === 'undefined') missing.push('MediaPipe Camera Utils');

  const canvas = document.getElementById('game-canvas');
  const ctx = canvas.getContext('2d');

  if (missing.length > 0) {
    ctx.fillStyle = '#0d1b2a';
    ctx.fillRect(0, 0, 960, 540);
    ctx.fillStyle = '#ff6b6b';
    ctx.font = 'bold 22px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Failed to load libraries:', 480, 220);
    ctx.fillStyle = '#fff';
    ctx.font = '16px "Segoe UI", sans-serif';
    ctx.fillText(missing.join(', '), 480, 260);
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = '14px "Segoe UI", sans-serif';
    ctx.fillText('Please check your internet connection and refresh.', 480, 300);
    return;
  }

  try {
    // Create and initialize the game engine
    const game = new GRB.GameEngine();
    await game.init();

    // Expose for debugging
    window._GRB_game = game;

    // Log success
    console.log('[main.js] Game initialized successfully');
  } catch (err) {
    console.error('[main.js] Game initialization failed:', err);
    ctx.fillStyle = '#0d1b2a';
    ctx.fillRect(0, 0, 960, 540);
    ctx.fillStyle = '#ff6b6b';
    ctx.font = 'bold 20px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Game initialization failed', 480, 220);
    ctx.fillStyle = '#fff';
    ctx.font = '14px "Segoe UI", sans-serif';
    ctx.fillText(err.message, 480, 260);
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = '12px "Segoe UI", sans-serif';
    ctx.fillText('Check browser console (F12) for details', 480, 290);
  }
});
