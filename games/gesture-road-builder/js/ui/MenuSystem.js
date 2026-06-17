window.GRB = window.GRB || {};

// Each screen defines its items as { id, label, x, y, w, h }
const BTN = (id, label, x, y, w=220, h=52) => ({ id, label, x, y, w, h });

const SCREENS = {
  main: [
    BTN('campaign',    'Campaign',    480, 220),
    BTN('endless',     'Endless',     480, 288),
    BTN('highscores',  'High Scores', 480, 356),
    BTN('howtoplay',   'How To Play', 480, 424),
  ],
  campaign_select: [], // generated dynamically
  highscores: [
    BTN('back', '← Back', 480, 490),
  ],
  howtoplay: [
    BTN('back', '← Back', 480, 490),
  ],
  level_complete: [
    BTN('next',    'Next Level',   380, 390),
    BTN('retry',   'Retry',        520, 390, 160, 46),
    BTN('menu',    'Menu',         480, 450, 160, 40),
  ],
  game_over: [
    BTN('retry',   'Retry',        380, 340),
    BTN('menu',    'Menu',         580, 340),
  ],
  paused: [
    BTN('resume', 'Resume',     480, 280),
    BTN('retry',  'Retry',      480, 345),
    BTN('menu',   'Menu',       480, 410),
  ],
  endless_over: [
    BTN('retry', 'Play Again', 380, 380),
    BTN('menu',  'Menu',       580, 380),
  ]
};

GRB.MenuSystem = class {
  constructor(saveSystem) {
    this.save = saveSystem;
    this.screen = 'main';
    this.hoveredId  = null;
    this.scrollY    = 0;   // for level select
    this._dragStart = null;
    this._selProgress = 0;
  }

  setScreen(s) {
    this.screen = s;
    this.hoveredId = null;
    this.scrollY = 0;
  }

  // Returns action id when an item is selected, else null
  update(cursor, selectionProgress, gestureType, gestureProgress) {
    const items = this._getItems();
    this.hoveredId = null;
    this._selProgress = 0;

    if (!cursor) return null;

    for (const item of items) {
      const ix = item.x - item.w / 2;
      const iy = item.y - item.h / 2;
      if (cursor.x >= ix && cursor.x <= ix + item.w &&
          cursor.y >= iy && cursor.y <= iy + item.h) {
        this.hoveredId = item.id;
        this._selProgress = selectionProgress;
        if (selectionProgress >= 1) return item.id;
        break;
      }
    }
    return null;
  }

  _getItems() {
    if (this.screen === 'campaign_select') return this._campaignItems();
    return SCREENS[this.screen] || SCREENS.main;
  }

  _campaignItems() {
    const progress = this.save.getCampaignProgress();
    const items = [];
    const cols = 5, rows = 10, cellW = 72, cellH = 64;
    const startX = 480 - (cols * cellW) / 2 + cellW / 2;
    const startY = 140 - this.scrollY;
    for (let i = 0; i < 50; i++) {
      const col = i % cols, row = Math.floor(i / cols);
      items.push(BTN(`level_${i+1}`, String(i+1),
        startX + col * cellW,
        startY + row * cellH,
        60, 52));
    }
    items.push(BTN('back', '← Back', 100, 510, 140, 40));
    return items;
  }

  draw(ctx, cursor, saveSystem) {
    switch (this.screen) {
      case 'main':            this._drawMain(ctx, cursor); break;
      case 'campaign_select': this._drawCampaignSelect(ctx, cursor, saveSystem); break;
      case 'highscores':      this._drawHighScores(ctx, cursor, saveSystem); break;
      case 'howtoplay':       this._drawHowToPlay(ctx, cursor); break;
      case 'level_complete':  break; // drawn by HUD
      case 'game_over':       break;
      case 'paused':          this._drawPausedMenu(ctx, cursor); break;
      case 'endless_over':    this._drawEndlessOver(ctx, cursor, saveSystem); break;
    }

    if (cursor) this._drawCursor(ctx, cursor);
  }

  _drawMain(ctx, cursor) {
    // Background gradient
    const g = ctx.createLinearGradient(0, 0, 0, 540);
    g.addColorStop(0, '#0d1b2a');
    g.addColorStop(1, '#1a2744');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 960, 540);

    // Decorative road line
    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.lineWidth = 80;
    ctx.beginPath(); ctx.moveTo(0, 490); ctx.lineTo(960, 490); ctx.stroke();
    ctx.setLineDash([40, 30]);
    ctx.strokeStyle = 'rgba(255,220,50,0.08)';
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(0, 490); ctx.lineTo(960, 490); ctx.stroke();
    ctx.setLineDash([]);

    // Logo
    ctx.textAlign = 'center';
    ctx.font = 'bold 54px "Segoe UI", sans-serif';
    const lg = ctx.createLinearGradient(0, 60, 0, 130);
    lg.addColorStop(0, '#00e5ff');
    lg.addColorStop(1, '#7b2fff');
    ctx.fillStyle = lg;
    ctx.fillText('Gesture', 480, 90);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 54px "Segoe UI", sans-serif';
    ctx.fillText('Road Builder', 480, 145);

    ctx.font = '16px "Segoe UI", sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.fillText('Control everything with your hands', 480, 175);

    // Buttons
    this._drawButtons(ctx, SCREENS.main, cursor);
    ctx.textAlign = 'left';
  }

  _drawCampaignSelect(ctx, cursor, saveSystem) {
    const g = ctx.createLinearGradient(0, 0, 0, 540);
    g.addColorStop(0, '#0d1b2a'); g.addColorStop(1, '#1a2744');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 960, 540);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 28px "Segoe UI", sans-serif';
    ctx.fillText('Choose Level', 480, 80);

    const progress = saveSystem.getCampaignProgress();
    const totalStars = saveSystem.getTotalStars();
    ctx.font = '14px "Segoe UI", sans-serif';
    ctx.fillStyle = '#fde047';
    ctx.fillText(`★ ${totalStars} / 150`, 480, 110);

    // Draw clip region for level grid
    ctx.save();
    ctx.beginPath(); ctx.rect(0, 125, 960, 375); ctx.clip();

    const cols = 5, cellW = 72, cellH = 64;
    const startX = 480 - (cols * cellW) / 2 + cellW / 2;
    const startY = 150 - this.scrollY;

    for (let i = 0; i < 50; i++) {
      const col = i % cols, row = Math.floor(i / cols);
      const x = startX + col * cellW;
      const y = startY + row * cellH;
      const levelId = i + 1;
      const locked = levelId > progress + 1;
      const stars = saveSystem.getLevelStars(levelId);
      this._drawLevelCell(ctx, x, y, levelId, stars, locked, this.hoveredId === `level_${levelId}`);
    }
    ctx.restore();

    // Back button
    this._drawButtons(ctx, [BTN('back', '← Back', 100, 510, 140, 40)], cursor);
    ctx.textAlign = 'left';
  }

  _drawLevelCell(ctx, x, y, id, stars, locked, hovered) {
    const W = 62, H = 54;
    ctx.save();
    ctx.translate(x, y);

    // Background
    ctx.fillStyle = locked ? 'rgba(255,255,255,0.05)'
      : hovered ? '#1e3a5f' : 'rgba(255,255,255,0.08)';
    ctx.beginPath(); ctx.roundRect(-W/2, -H/2, W, H, 8); ctx.fill();
    ctx.strokeStyle = hovered ? '#00e5ff' : locked ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.2)';
    ctx.lineWidth = hovered ? 2 : 1;
    ctx.stroke();

    if (locked) {
      ctx.fillStyle = 'rgba(255,255,255,0.2)';
      ctx.font = '18px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('🔒', 0, 6);
    } else {
      ctx.fillStyle = '#fff';
      ctx.font = `bold 17px "Segoe UI", sans-serif`; ctx.textAlign = 'center';
      ctx.fillText(String(id), 0, 2);
      // Stars
      ctx.font = '9px sans-serif';
      ctx.fillStyle = '#fde047';
      ctx.fillText('★'.repeat(stars) + '☆'.repeat(3 - stars), 0, 18);
    }
    ctx.restore();
  }

  _drawHighScores(ctx, cursor, saveSystem) {
    const g = ctx.createLinearGradient(0, 0, 0, 540);
    g.addColorStop(0, '#0d1b2a'); g.addColorStop(1, '#1a2744');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 960, 540);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 32px "Segoe UI", sans-serif';
    ctx.fillText('High Scores', 480, 80);

    const sections = [
      { label: 'Campaign', items: [
        ['Total Stars',    `★ ${saveSystem.getTotalStars()} / 150`],
        ['Levels Unlocked', `${Math.min(50, saveSystem.getCampaignProgress() + 1)} / 50`],
      ]},
      { label: 'Endless Mode', items: [
        ['Best Distance', `${saveSystem.getEndlessHighDistance().toFixed(0)} m`],
        ['Best Score',    `${saveSystem.getEndlessHighScore()} pts`],
      ]}
    ];

    let cy = 140;
    for (const sec of sections) {
      ctx.fillStyle = '#00e5ff';
      ctx.font = 'bold 18px "Segoe UI", sans-serif';
      ctx.fillText(sec.label, 480, cy); cy += 36;
      for (const [k, v] of sec.items) {
        ctx.fillStyle = 'rgba(255,255,255,0.65)';
        ctx.font = '15px "Segoe UI", sans-serif';
        ctx.fillText(k, 360, cy);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 15px "Segoe UI", sans-serif';
        ctx.fillText(v, 600, cy);
        cy += 30;
      }
      cy += 20;
    }

    this._drawButtons(ctx, SCREENS.highscores, cursor);
    ctx.textAlign = 'left';
  }

  _drawHowToPlay(ctx, cursor) {
    const g = ctx.createLinearGradient(0, 0, 0, 540);
    g.addColorStop(0, '#0d1b2a'); g.addColorStop(1, '#1a2744');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 960, 540);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 28px "Segoe UI", sans-serif';
    ctx.fillText('How To Play', 480, 60);

    const gestures = [
      ['✌️', 'Pinch', 'Hold thumb+index together to draw roads'],
      ['👍', 'Thumbs Up', 'Hold 1 second to start the vehicle'],
      ['✋', 'Open Palm', 'Hold 1.5s to undo last road drawn'],
      ['🖐️', 'Palm High', 'Raise hand high + hold 2s to clear all'],
      ['✊', 'Closed Fist', 'Hold 1 second to pause / resume'],
    ];

    let cy = 110;
    for (const [icon, name, desc] of gestures) {
      ctx.fillStyle = 'rgba(255,255,255,0.06)';
      ctx.beginPath(); ctx.roundRect(240, cy - 10, 480, 50, 8); ctx.fill();
      ctx.font = '26px sans-serif'; ctx.fillText(icon, 280, cy + 24);
      ctx.fillStyle = '#00e5ff';
      ctx.font = 'bold 15px "Segoe UI", sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(name, 320, cy + 14);
      ctx.fillStyle = 'rgba(255,255,255,0.65)';
      ctx.font = '13px "Segoe UI", sans-serif';
      ctx.fillText(desc, 320, cy + 32);
      ctx.textAlign = 'center';
      cy += 62;
    }

    this._drawButtons(ctx, SCREENS.howtoplay, cursor);
    ctx.textAlign = 'left';
  }

  _drawPausedMenu(ctx, cursor) {
    ctx.fillStyle = 'rgba(0,0,0,0.72)';
    ctx.fillRect(0, 0, 960, 540);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 44px "Segoe UI", sans-serif';
    ctx.fillText('PAUSED', 480, 200);
    this._drawButtons(ctx, SCREENS.paused, cursor);
    ctx.textAlign = 'left';
  }

  _drawEndlessOver(ctx, cursor, saveSystem) {
    // Drawn on top of gameplay canvas
    ctx.fillStyle = 'rgba(0,0,0,0.78)';
    ctx.fillRect(0, 0, 960, 540);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ff6b6b';
    ctx.font = 'bold 42px "Segoe UI", sans-serif';
    ctx.fillText('Game Over', 480, 180);
    ctx.fillStyle = '#fde047';
    ctx.font = '22px "Segoe UI", sans-serif';
    ctx.fillText(`Best Distance: ${saveSystem.getEndlessHighDistance().toFixed(0)} m`, 480, 240);
    ctx.fillStyle = '#cbd5e1';
    ctx.font = '18px "Segoe UI", sans-serif';
    ctx.fillText(`Best Score: ${saveSystem.getEndlessHighScore()} pts`, 480, 278);
    this._drawButtons(ctx, SCREENS.endless_over, cursor);
    ctx.textAlign = 'left';
  }

  _drawButtons(ctx, items, cursor) {
    for (const item of items) {
      const hovered = this.hoveredId === item.id;
      const x = item.x - item.w / 2;
      const y = item.y - item.h / 2;

      // Shadow
      ctx.shadowColor = hovered ? '#00e5ff' : 'transparent';
      ctx.shadowBlur  = hovered ? 18 : 0;

      // Background
      ctx.fillStyle = hovered ? '#00e5ff' : 'rgba(255,255,255,0.08)';
      ctx.beginPath(); ctx.roundRect(x, y, item.w, item.h, 10); ctx.fill();

      // Border
      ctx.strokeStyle = hovered ? '#00e5ff' : 'rgba(255,255,255,0.2)';
      ctx.lineWidth = hovered ? 2 : 1;
      ctx.stroke();

      // Selection progress arc
      if (hovered && this._selProgress > 0) {
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(item.x, item.y, item.h * 0.44, -Math.PI / 2,
          -Math.PI / 2 + Math.PI * 2 * this._selProgress);
        ctx.stroke();
      }

      ctx.shadowBlur = 0;
      ctx.fillStyle = hovered ? '#000' : '#fff';
      ctx.font = `bold ${item.h > 44 ? 17 : 14}px "Segoe UI", sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(item.label, item.x, item.y + 6);
    }
    ctx.textAlign = 'left';
  }

  _drawCursor(ctx, cursor) {
    const { x, y } = cursor;
    // Outer ring
    ctx.strokeStyle = 'rgba(0,229,255,0.6)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x, y, 16, 0, Math.PI * 2); ctx.stroke();
    // Inner dot
    ctx.fillStyle = '#00e5ff';
    ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.fill();
  }

  handleScroll(dy) {
    if (this.screen !== 'campaign_select') return;
    this.scrollY = Math.max(0, Math.min(500, this.scrollY + dy));
  }
};
