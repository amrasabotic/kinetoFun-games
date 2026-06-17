window.GRB = window.GRB || {};

const CHUNK_W = 480;
const GROUND_Y = 480;

GRB.EndlessGenerator = class {
  constructor() {
    this.chunks     = [];   // [{x, platforms, stars, crates, boulders}]
    this.nextChunkX = 0;
    this.difficulty = 0;    // increases over time
    this.totalCoins = 0;
  }

  reset() {
    this.chunks.length = 0;
    this.nextChunkX = 0;
    this.difficulty = 0;
    this.totalCoins = 0;
  }

  getWorldWidth() { return Math.max(1920, this.nextChunkX); }

  // Generate enough chunks to cover up to targetX
  ensureGenerated(targetX) {
    while (this.nextChunkX < targetX + CHUNK_W) {
      this._generateChunk();
    }
  }

  _generateChunk() {
    const cx = this.nextChunkX;
    const d  = this.difficulty;
    const R  = GRB.MathUtils;
    const chunk = { x: cx, platforms: [], stars: [], crates: [], boulders: [] };

    // First chunk is always a safe start platform
    if (cx === 0) {
      chunk.platforms.push([cx + CHUNK_W / 2, GROUND_Y, CHUNK_W, 40]);
      chunk.stars.push([cx + 180, GROUND_Y - 60]);
      this.chunks.push(chunk);
      this.nextChunkX += CHUNK_W;
      return;
    }

    const gapMin = 120 + d * 8;
    const gapMax = 200 + d * 12;
    const gapWidth = R.clamp(R.randomRange(gapMin, gapMax), 100, 420);
    const platW    = R.clamp(R.randomRange(160, 280 - d * 4), 80, 280);
    const platH    = 30;

    const gap1Start = cx + R.randomRange(20, 60);
    const gap1End   = gap1Start + gapWidth;
    const remaining = cx + CHUNK_W - gap1End;

    // Ground before gap
    if (gap1Start > cx + 20) {
      chunk.platforms.push([
        cx + (gap1Start - cx) / 2, GROUND_Y, gap1Start - cx, platH
      ]);
    }
    // Possibly a mid-air island
    if (d >= 4 && Math.random() < 0.4) {
      const iy = R.randomRange(GROUND_Y - 180, GROUND_Y - 80);
      chunk.platforms.push([ gap1Start + gapWidth / 2, iy, platW * 0.6, 18 ]);
      chunk.stars.push([gap1Start + gapWidth / 2, iy - 40]);
    }
    // Ground after gap
    if (remaining > 60) {
      chunk.platforms.push([
        gap1End + remaining / 2, GROUND_Y, remaining, platH
      ]);
    }

    // Stars
    const numStars = R.randomInt(1, 2 + Math.floor(d / 3));
    for (let i = 0; i < numStars; i++) {
      const sx = R.randomRange(cx + 30, cx + CHUNK_W - 30);
      chunk.stars.push([sx, GROUND_Y - R.randomRange(50, 120)]);
    }

    // Crates (after difficulty 3)
    if (d >= 3 && Math.random() < 0.3) {
      const bx = gap1End + R.randomRange(30, remaining * 0.5);
      chunk.crates.push([bx, GROUND_Y - 20, 28, 28]);
    }

    // Rolling boulders (after difficulty 6)
    if (d >= 6 && Math.random() < 0.35) {
      const bx = gap1Start + gapWidth * 0.5;
      chunk.boulders.push([bx, GROUND_Y - 200, 18 + d]);
    }

    this.chunks.push(chunk);
    this.nextChunkX += CHUNK_W;
    this.difficulty = Math.min(30, Math.floor(this.nextChunkX / 1500));
  }

  getAllPlatforms() {
    const out = [];
    for (const c of this.chunks) out.push(...c.platforms);
    return out;
  }
  getAllStars() {
    const out = [];
    for (const c of this.chunks) out.push(...c.stars);
    return out;
  }
  getAllCrates()   { const o=[]; for(const c of this.chunks) o.push(...c.crates); return o; }
  getAllBoulders() { const o=[]; for(const c of this.chunks) o.push(...c.boulders); return o; }
};
