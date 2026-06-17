/* global GRB */
window.GRB = window.GRB || {};

GRB.MathUtils = {
  lerp(a, b, t) { return a + (b - a) * t; },
  clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); },
  dist(a, b) { return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2); },
  dist2(ax, ay, bx, by) { return Math.sqrt((ax - bx) ** 2 + (ay - by) ** 2); },
  angle(a, b) { return Math.atan2(b.y - a.y, b.x - a.x); },
  normalizeAngle(a) {
    while (a >  Math.PI) a -= 2 * Math.PI;
    while (a < -Math.PI) a += 2 * Math.PI;
    return a;
  },
  randomRange(lo, hi) { return lo + Math.random() * (hi - lo); },
  randomInt(lo, hi) { return lo + Math.floor(Math.random() * (hi - lo + 1)); },

  // Catmull-Rom spline – returns interpolated point at t∈[0,1] between p1 and p2
  catmullRom(p0, p1, p2, p3, t) {
    const t2 = t * t;
    const t3 = t2 * t;
    return {
      x: 0.5 * ((2 * p1.x) + (-p0.x + p2.x) * t +
          (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
          (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
      y: 0.5 * ((2 * p1.y) + (-p0.y + p2.y) * t +
          (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
          (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3)
    };
  },

  // Smooth an array of {x,y} points using Catmull-Rom, returning more dense array
  smoothPath(points, samplesPerSegment = 8) {
    if (points.length < 2) return [...points];
    if (points.length === 2) {
      const result = [];
      for (let i = 0; i <= samplesPerSegment; i++) {
        result.push({
          x: this.lerp(points[0].x, points[1].x, i / samplesPerSegment),
          y: this.lerp(points[0].y, points[1].y, i / samplesPerSegment)
        });
      }
      return result;
    }
    const result = [];
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[Math.max(0, i - 1)];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[Math.min(points.length - 1, i + 2)];
      for (let j = 0; j < samplesPerSegment; j++) {
        result.push(this.catmullRom(p0, p1, p2, p3, j / samplesPerSegment));
      }
    }
    result.push(points[points.length - 1]);
    return result;
  },

  // Exponential moving average – returns updated smoothed value
  expSmooth(prev, curr, alpha) {
    return {
      x: prev.x + alpha * (curr.x - prev.x),
      y: prev.y + alpha * (curr.y - prev.y)
    };
  },

  // Total length of a path
  pathLength(points) {
    let len = 0;
    for (let i = 1; i < points.length; i++) {
      len += this.dist(points[i - 1], points[i]);
    }
    return len;
  },

  // Downsample path keeping only points MIN_DIST apart
  downsample(points, minDist = 8) {
    if (points.length === 0) return [];
    const result = [points[0]];
    for (let i = 1; i < points.length; i++) {
      if (this.dist(result[result.length - 1], points[i]) >= minDist) {
        result.push(points[i]);
      }
    }
    return result;
  }
};
