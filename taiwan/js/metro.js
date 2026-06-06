import { config } from './config.js';

// ── Transition timing ─────────────────────────────────────────
const MT_TRAVEL    = 800;
const MT_START_MOVE= 260;
const MT_MID       = 380;
const MT_OUT_START = 1160;
const MT_DONE      = 1460;

// ── Network geometry ──────────────────────────────────────────
/*
  DESIGN RULES:
  1. The map is laid out on a uniform grid. Because the grid cell is
     square (GX === GY), every segment is a true horizontal, vertical
     or 45° diagonal — the "octolinear" convention of real metro maps.
  2. Lines are polylines of grid nodes. Stations sit exactly on a node.
  3. Where two lines share a node they form an interchange. Routing is
     a shortest-path search over the graph of those segments, so a trip
     runs straight, turns, transfers at a real interchange, and only
     backtracks when that genuinely is the shortest way — never a forced
     loop and never a single straight line.

  Topology mirrors central Taipei so it reads like an actual map.
  Every line runs in long, confident H / V / 45° strokes and ends only
  at a station or a real interchange — there are no stubs into empty space.

           V00·出發
              \ purple
               \
   西門 ●━━━━━━━●台北車站━━━━━━●━━━━↘
    │ \         (B×P×R)              ●象山
 g  │  \ green                      ↗ orange
 r  │   \                          /
 e  │    ●中正紀念堂━━━━━●東門━━━●
 e  │   /  (R×G)         (R×O)  \
 n  │  / green                    ↘
    │ /                            ●台北101 (red term)
  古亭●━━━●公館
  (G×O)   (green term)

  Interchanges (shared grid nodes):
    西門      Blue × Green        台北車站  Blue × Purple × Red
    中正紀念堂 Red  × Green        東門      Red  × Orange
    古亭      Green × Orange
*/
const MC_W = 900, MC_H = 650;

// Each line is an ordered list of [col,row] grid nodes (corners included).
const LINE_DEFS = [
  { color:'#0070c0', grid:[[1,3],[7,3],[11,3],[13,5]]             }, // Blue   板南線     — long E-W trunk, bends ↘ to 象山
  { color:'#7c3aed', grid:[[4,0],[7,3]]                          }, // Purple 文創設計線 — 45° feeder into 台北車站
  { color:'#e3001b', grid:[[7,3],[7,7],[10,7],[13,10]]           }, // Red    淡水信義線 — ↓ spine, → then ↘ to 台北101
  { color:'#008659', grid:[[1,3],[5,7],[7,7],[4,10],[1,10]]      }, // Green  松山新店線 — ↘ from 西門, through 中正, SW to 公館
  { color:'#f5a623', grid:[[13,5],[11,7],[10,7],[7,10],[4,10]]   }, // Orange 中和新蘆線 — ↙ from 象山, through 東門 & 古亭
  { color:'#009999', grid:[[10,7],[10,11]]                       }, // Siemens 西門子線 — ↓ spur off 東門 to the SIEMENS terminus
];

// Station (config index) → grid node it sits on.
const STA_GRID = [
  [ 4,  0],  // 0 · V00  出發站   — purple feeder top
  [ 1,  3],  // 1 · BL11 西門     — Blue × Green interchange (west end)
  [ 1, 10],  // 2 · G07  公館     — green SW terminus
  [13,  5],  // 3 · O11  象山     — Blue × Orange interchange (east end)
  [13, 10],  // 4 · R03  台北101  — red SE terminus
  [10, 11],  // 5 · S05  西門子 SIEMENS — Siemens line terminus (spur off 東門)
];

// ── 2.5D isometric projection + white foundation slab ─────────
// Everything else works in grid (col,row) space; this is the ONLY place
// grid → screen happens. Swapping it from flat to isometric tilts the whole
// map (lines, stations, route, traversal) into 2.5D with no other changes.
const ISO       = { ux: 1, uy: 0.54, zh: 0.95 }; // unit step ratios (uy<ux = tilt)
const SLAB_PAD  = 1.1;                            // how far the white block extends past the map (city ring)
const SLAB_DEPTH= 1.5;                            // block thickness (in z units)
const MARGIN    = 5;                              // smaller = zoomed in closer
const PIN_H     = 1.15;                           // station pin height (z units)

// Raw isometric (pre-fit): +z is up (toward the top of the screen).
const rawIso = (c, r, z = 0) => [ (c - r) * ISO.ux, (c + r) * ISO.uy - z * ISO.zh ];

// Map extent → slab corners.
const _ext = (() => {
  let a = { c0: Infinity, c1:-Infinity, r0: Infinity, r1:-Infinity };
  LINE_DEFS.forEach(({ grid }) => grid.forEach(([c,r]) => {
    a.c0 = Math.min(a.c0,c); a.c1 = Math.max(a.c1,c);
    a.r0 = Math.min(a.r0,r); a.r1 = Math.max(a.r1,r);
  }));
  return a;
})();
const SLAB = { c0:_ext.c0-SLAB_PAD, c1:_ext.c1+SLAB_PAD, r0:_ext.r0-SLAB_PAD, r1:_ext.r1+SLAB_PAD };

// ── City buildings ────────────────────────────────────────────
// A full city of blocks spread across the whole slab — not just a frame.
// Towers, apartment flats and low houses are scattered through the interior
// AND the pad ring; each one is kept a safe clearance away from every metro
// segment so the lines, stations and route always read on top of the city.
// { c,r,w,d,hz, type } in grid space; type ∈ tower | flat | house.

// Distance from grid point p to segment a→b (for keeping clear of the lines).
function distPtSeg(p, a, b) {
  const vx = b[0]-a[0], vy = b[1]-a[1];
  const wx = p[0]-a[0], wy = p[1]-a[1];
  const c1 = vx*wx + vy*wy;
  if (c1 <= 0) return Math.hypot(wx, wy);
  const c2 = vx*vx + vy*vy;
  if (c2 <= c1) return Math.hypot(p[0]-b[0], p[1]-b[1]);
  const t = c1 / c2;
  return Math.hypot(p[0]-(a[0]+t*vx), p[1]-(a[1]+t*vy));
}
// Nearest metro segment to a grid point, across every line.
function distToNetwork(c, r) {
  let m = Infinity;
  for (const { grid } of LINE_DEFS)
    for (let i = 0; i < grid.length - 1; i++)
      m = Math.min(m, distPtSeg([c, r], grid[i], grid[i+1]));
  return m;
}

const BUILDINGS = (() => {
  let seed = 9173;
  const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  const CLEAR = 0.85;          // min grid clearance from any line to a footprint edge
  const STEP  = 1.25;          // city-block spacing
  const list = [];

  // Sweep a jittered lattice over the whole slab; drop any block whose footprint
  // would sit on (or too near) the metro network.
  for (let cc = SLAB.c0 + 0.4; cc <= SLAB.c1 - 0.9; cc += STEP) {
    for (let rr = SLAB.r0 + 0.4; rr <= SLAB.r1 - 0.9; rr += STEP) {
      const c = cc + (rnd() - 0.5) * 0.55;
      const r = rr + (rnd() - 0.5) * 0.55;
      const w = 0.5 + rnd() * 0.45, d = 0.5 + rnd() * 0.45;
      // Clearance checked against the footprint centre, padded by its half-size.
      if (distToNetwork(c + w/2, r + d/2) < CLEAR + Math.max(w, d) * 0.5) continue;

      const kind = rnd();
      const type = kind > 0.6 ? 'tower' : kind > 0.32 ? 'flat' : 'house';
      const hz   = type === 'tower' ? 1.0 + rnd() * 1.7
                 : type === 'flat'  ? 0.7 + rnd() * 0.7
                 :                     0.42 + rnd() * 0.24;
      list.push({ c, r, w, d, hz, type });
    }
  }
  return list;
})();

// Fit the whole composition (slab, pin tops, building tops) into the canvas.
const _fit = (() => {
  const pts = [];
  const corners = [[SLAB.c0,SLAB.r0],[SLAB.c1,SLAB.r0],[SLAB.c1,SLAB.r1],[SLAB.c0,SLAB.r1]];
  corners.forEach(([c,r]) => { pts.push(rawIso(c,r,0)); pts.push(rawIso(c,r,-SLAB_DEPTH)); });
  STA_GRID.forEach(([c,r]) => pts.push(rawIso(c,r,PIN_H + 2.0))); // headroom for the floating cloud + labels
  BUILDINGS.forEach(b => {                                        // building roofs (incl. antenna headroom)
    const z = b.hz + (b.type === 'tower' && b.hz > 1.5 ? 0.6 : 0.1);
    pts.push(rawIso(b.c, b.r, z)); pts.push(rawIso(b.c + b.w, b.r + b.d, z));
  });
  let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;
  pts.forEach(([x,y]) => { minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y); });
  const s  = Math.min((MC_W-2*MARGIN)/(maxX-minX), (MC_H-2*MARGIN)/(maxY-minY));
  return { s, ox:(MC_W - s*(minX+maxX))/2, oy:(MC_H - s*(minY+maxY))/2 };
})();

const proj = (c, r, z = 0) => {
  const [x,y] = rawIso(c, r, z);
  return [ _fit.ox + _fit.s*x, _fit.oy + _fit.s*y ];
};
const gp = (c, r) => proj(c, r, 0);   // on the slab's top face
// Flatten a circle of grid-ish radius onto the tilted ground plane.
const groundR = (rx) => [rx, rx * ISO.uy / ISO.ux];

// Pixel-space polylines for drawing the base map (on the top face).
const METRO_LINES = LINE_DEFS.map(d => ({ color:d.color, pts:d.grid.map(([c,r]) => gp(c,r)) }));
const STA_XY      = STA_GRID.map(([c,r]) => gp(c,r));

// ── Build the route graph from the line segments ──────────────
const nkey = (c, r) => `${c},${r}`;
const adj  = new Map();                       // node key → [{ k, w }]
function linkNodes(a, b) {
  const ka = nkey(a[0], a[1]), kb = nkey(b[0], b[1]);
  const w  = Math.hypot(b[0]-a[0], b[1]-a[1]);  // grid-unit distance (for Dijkstra ordering)
  if (!adj.has(ka)) adj.set(ka, []);
  if (!adj.has(kb)) adj.set(kb, []);
  adj.get(ka).push({ k: kb, w });
  adj.get(kb).push({ k: ka, w });
}
LINE_DEFS.forEach(({ grid }) => {
  for (let i = 0; i < grid.length - 1; i++) linkNodes(grid[i], grid[i+1]);
});

// Integer grid points walked by a single octolinear segment, inclusive.
function segPoints(a, b) {
  const dc = b[0]-a[0], dr = b[1]-a[1];
  const n  = Math.max(Math.abs(dc), Math.abs(dr));
  const sx = Math.sign(dc), sy = Math.sign(dr);
  const out = [];
  for (let k = 0; k <= n; k++) out.push([a[0]+sx*k, a[1]+sy*k]);
  return out;
}

// Interchange nodes = grid nodes shared by >1 line (the named transfers).
const lineCount = new Map();
LINE_DEFS.forEach(({ grid }) => {
  new Set(grid.map(([c,r]) => nkey(c,r))).forEach(k =>
    lineCount.set(k, (lineCount.get(k) || 0) + 1));
});
const stationKeys = new Set(STA_GRID.map(([c,r]) => nkey(c,r)));
const hubKeys     = new Set([...lineCount].filter(([k,n]) => n > 1 && !stationKeys.has(k)).map(([k]) => k));
const TRANSFERS   = [...hubKeys].map(k => { const [c,r] = k.split(',').map(Number); return gp(c,r); });

// Minor stations = every other grid point along a line (Beck's evenly
// spaced dots), excluding the named stations and interchanges.
const MINOR = [];
{
  const seen = new Set();
  LINE_DEFS.forEach(({ color, grid }) => {
    for (let i = 0; i < grid.length - 1; i++) {
      segPoints(grid[i], grid[i+1]).forEach(([c,r]) => {
        const k = nkey(c,r);
        if (stationKeys.has(k) || hubKeys.has(k) || seen.has(k)) return;
        seen.add(k);
        MINOR.push({ xy: gp(c,r), color });
      });
    }
  });
}

// ── Shortest path (Dijkstra) between two grid nodes ───────────
function shortestGridPath(from, to) {
  const start = nkey(from[0], from[1]);
  const goal  = nkey(to[0],   to[1]);
  if (start === goal) return [from];

  const dist = new Map([[start, 0]]);
  const prev = new Map();
  const pq   = [[0, start]];                  // tiny graph → simple array PQ is fine

  while (pq.length) {

    pq.sort((a, b) => a[0] - b[0]);
    const [d, u] = pq.shift();
    if (u === goal) break;
    if (d > (dist.get(u) ?? Infinity)) continue;
    for (const { k, w } of (adj.get(u) || [])) {
      const nd = d + w;
      if (nd < (dist.get(k) ?? Infinity)) {
        dist.set(k, nd); prev.set(k, u); pq.push([nd, k]);
      }
    }
  }

  if (!prev.has(goal)) return [from, to];     // disconnected fallback (shouldn't happen)
  const path = [];
  for (let cur = goal; cur; cur = prev.get(cur)) {
    const [c, r] = cur.split(',').map(Number);
    path.unshift([c, r]);
    if (cur === start) break;
  }
  return path;
}

// Routes are stable per station pair — resolve once, then reuse.
const ROUTE_CACHE = {};
function routePixels(fromIdx, toIdx) {
  const key = `${fromIdx}>${toIdx}`;
  if (!ROUTE_CACHE[key])
    ROUTE_CACHE[key] = shortestGridPath(STA_GRID[fromIdx], STA_GRID[toIdx]).map(([c,r]) => gp(c,r));
  return ROUTE_CACHE[key];
}

// ── Label placement per station ───────────────────────────────
// Each label block (name + code) is pushed into open map space, clear
// of the lines. dx/dy = block-centre offset from the station marker.
const LABEL_CFG = [
  { dx: -26, dy:  4, align: 'right' }, // 0 V00     — left
  { dx: -26, dy:  0, align: 'right' }, // 1 西門     — left (west edge)
  { dx: -26, dy:  0, align: 'right' }, // 2 公館     — left (SW corner)
  { dx:  26, dy:  0, align: 'left'  }, // 3 象山     — right (east edge)
  { dx: -26, dy:  0, align: 'right' }, // 4 台北101  — left (off the right edge)
  { dx:  26, dy:  2, align: 'left'  }, // 5 西門子    — right of the Siemens spur terminus
];

// ── Path builder ──────────────────────────────────────────────
// Resolves the shortest network path between the two stations, then
// returns the leading slice of it for the current animation progress.
function buildRoutePath(fromIdx, toIdx, progress) {
  const pts = routePixels(fromIdx, toIdx).map(p => [...p]);

  let totalDist = 0;
  for (let i = 0; i < pts.length - 1; i++)
    totalDist += Math.hypot(pts[i+1][0]-pts[i][0], pts[i+1][1]-pts[i][1]);

  const traveled = totalDist * Math.max(0, Math.min(1, progress));
  const result = [[...pts[0]]];
  let cum = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i+1];
    const sLen = Math.hypot(b[0]-a[0], b[1]-a[1]);
    if (cum + sLen <= traveled) {
      cum += sLen; result.push([...b]);
    } else {
      const t = (traveled - cum) / sLen;
      result.push([a[0]+(b[0]-a[0])*t, a[1]+(b[1]-a[1])*t]);
      break;
    }
  }
  return result;
}

// ── Station label renderer ────────────────────────────────────
// Name + code, two lines, with a soft background halo so the text stays
// legible wherever it sits over the map.
const BG = '#f5f3ee';
function drawLabel(ctx, item, sx, sy, i, isDest) {
  const { dx, dy, align } = LABEL_CFG[i];
  const x = sx + dx;
  ctx.save();
  ctx.textAlign = align; ctx.textBaseline = 'middle';
  const halo = (text, yy, font, fill) => {
    ctx.font = font;
    ctx.lineWidth = 4; ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(245,243,238,0.95)';
    ctx.strokeText(text, x, yy);
    ctx.fillStyle = fill;
    ctx.fillText(text, x, yy);
  };
  halo(item.stationName, sy + dy - 8, `${isDest ? '900' : 'bold'} 15px "Noto Sans SC", sans-serif`, '#0a0a0a');
  halo(item.stationCode, sy + dy + 9, 'bold 11px "JetBrains Mono", monospace', item.lineColor);
  ctx.restore();
}

// ── 2.5D drawing helpers ──────────────────────────────────────
function fillPoly(ctx, pts, fill, stroke, lw) {
  ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.closePath();
  if (fill)   { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw || 1; ctx.stroke(); }
}

// A circle lying flat on the tilted ground reads as a squashed ellipse.
function groundDot(ctx, x, y, rx, fill, stroke, lw) {
  const ry = rx * ISO.uy / ISO.ux;
  ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  if (fill)   { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw || 1; ctx.stroke(); }
}

// The clean white extruded foundation block (top face + two side walls).
function drawSlab(ctx) {
  const At = proj(SLAB.c0,SLAB.r0,0), Bt = proj(SLAB.c1,SLAB.r0,0),
        Ct = proj(SLAB.c1,SLAB.r1,0), Dt = proj(SLAB.c0,SLAB.r1,0);
  const Bb = proj(SLAB.c1,SLAB.r0,-SLAB_DEPTH),
        Cb = proj(SLAB.c1,SLAB.r1,-SLAB_DEPTH),
        Db = proj(SLAB.c0,SLAB.r1,-SLAB_DEPTH);

  fillPoly(ctx, [Bt,Ct,Cb,Bb], '#dcd8cf');                          // right side wall
  fillPoly(ctx, [Ct,Dt,Db,Cb], '#cac6bc');                          // left/front side wall
  fillPoly(ctx, [At,Bt,Ct,Dt], '#fbfaf6', 'rgba(0,0,0,0.12)', 1.5); // white top
}

// Bilinear point on a quad q = [TL, TR, BR, BL]; u across (TL→TR), v down (TL→BL).
function quadUV(q, u, v) {
  const tx = q[0][0] + (q[1][0]-q[0][0])*u, ty = q[0][1] + (q[1][1]-q[0][1])*u;
  const bx = q[3][0] + (q[2][0]-q[3][0])*u, by = q[3][1] + (q[2][1]-q[3][1])*u;
  return [ tx + (bx-tx)*v, ty + (by-ty)*v ];
}

// A grid of windows painted onto one extruded wall (a quad). cols/rows scale
// with the wall's real size; a sprinkling of warm "lit" panes adds life.
function drawWindows(ctx, q, cols, rows, lz) {
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const lit = (((c * 7 + r * 13 + lz) % 5) === 0);
      fillPoly(ctx, [
        quadUV(q, (c+0.28)/cols, (r+0.22)/rows), quadUV(q, (c+0.72)/cols, (r+0.22)/rows),
        quadUV(q, (c+0.72)/cols, (r+0.74)/rows), quadUV(q, (c+0.28)/cols, (r+0.74)/rows),
      ], lit ? 'rgba(255,214,130,0.9)' : 'rgba(96,120,146,0.32)');
    }
  }
}

// One extruded building: shaded east/south walls, a window grid, and either a
// pitched roof + door (house) or a flat roof + antenna warning light (tower).
function drawBuilding(ctx, b) {
  const { c, r, w, d, hz, type } = b;
  const aT = proj(c, r, hz),     bT = proj(c+w, r, hz),
        cT = proj(c+w, r+d, hz), dT = proj(c, r+d, hz);
  const bB = proj(c+w, r, 0), cB = proj(c+w, r+d, 0), dB = proj(c, r+d, 0);
  const right = [bT, cT, cB, bB];   // east wall
  const front = [cT, dT, dB, cB];   // south wall

  fillPoly(ctx, right, '#e6e3da');
  fillPoly(ctx, front, '#d7d4ca');

  if (type === 'house') {
    const rh = hz * 0.45 + 0.2;
    const ridgeW = proj(c, r+d/2, hz+rh), ridgeE = proj(c+w, r+d/2, hz+rh);
    fillPoly(ctx, [bT, ridgeE, cT],         '#cbc7bd', 'rgba(0,0,0,0.10)', 1); // east gable
    fillPoly(ctx, [dT, ridgeW, ridgeE, cT], '#b6b1a5', 'rgba(0,0,0,0.12)', 1); // south slope
    fillPoly(ctx, [quadUV(front,0.42,0.50),quadUV(front,0.64,0.50),quadUV(front,0.64,0.97),quadUV(front,0.42,0.97)], 'rgba(70,65,60,0.55)');   // door
    fillPoly(ctx, [quadUV(front,0.12,0.32),quadUV(front,0.34,0.32),quadUV(front,0.34,0.64),quadUV(front,0.12,0.64)], 'rgba(96,120,146,0.42)'); // window
    return;
  }

  fillPoly(ctx, [aT,bT,cT,dT], '#fbfaf6', 'rgba(0,0,0,0.07)', 1);              // flat roof
  const lz = Math.floor((c + r) * 4) & 7;
  drawWindows(ctx, right, Math.max(2, Math.round(d*4)), Math.max(2, Math.round(hz*3)), lz);
  drawWindows(ctx, front, Math.max(2, Math.round(w*4)), Math.max(2, Math.round(hz*3)), lz+2);

  if (type === 'tower' && hz > 1.5) {
    const baseTop = proj(c + w/2, r + d/2, hz), tip = proj(c + w/2, r + d/2, hz + 0.55);
    ctx.strokeStyle = 'rgba(40,40,40,0.55)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(baseTop[0], baseTop[1]); ctx.lineTo(tip[0], tip[1]); ctx.stroke();
    const blink = 0.4 + 0.6 * Math.abs(Math.sin(performance.now() * 0.004 + c));
    ctx.beginPath(); ctx.arc(tip[0], tip[1], 2.2, 0, Math.PI*2);
    ctx.fillStyle = `rgba(227,0,27,${blink})`; ctx.fill();
  }
}

function drawLandscape(ctx) {
  // Buildings, back-to-front so nearer ones overlap farther ones.
  [...BUILDINGS]
    .sort((a, b) => (a.c+a.r) - (b.c+b.r))
    .forEach(b => drawBuilding(ctx, b));

  // English region labels (billboard, faint watermark).
  const region = (en, c, r) => {
    const [x, y] = proj(c, r, 0);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = '700 11px "Inter", sans-serif';
    ctx.fillStyle = 'rgba(45,65,85,0.22)';
    ctx.fillText(en, x, y);
  };
  region('TAIPEI CITY', 10.4, 1.4);
  region('NEW TAIPEI',   2.2, 0.6);

  // Compass at the slab's back corner.
  const [cx, cy] = proj(SLAB.c0 + 0.7, SLAB.r0 + 0.7, 0);
  ctx.strokeStyle = 'rgba(45,65,85,0.45)'; ctx.fillStyle = 'rgba(45,65,85,0.55)'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(cx, cy + 7); ctx.lineTo(cx, cy - 7); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx, cy - 9); ctx.lineTo(cx - 3.5, cy - 3); ctx.lineTo(cx + 3.5, cy - 3); ctx.closePath(); ctx.fill();
  ctx.font = 'bold 8px "Inter", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
  ctx.fillText('N', cx, cy - 10);
}

// A station marker. Non-destinations are short pins; the destination is a
// big dot that floats up and down above its spot.
function drawPin(ctx, c, r, i, item, isDest) {
  const base = proj(c, r, 0);

  if (isDest) {
    const now  = performance.now();
    const bob  = Math.sin(now * 0.0035) * 8;                       // float up/down
    const puls = 0.5 + 0.5 * Math.sin(now * 0.004);                // halo pulse
    const [cx, cyRaw] = proj(c, r, PIN_H + 0.7);
    const cy = cyRaw - bob;

    groundDot(ctx, base[0], base[1], Math.max(5, 9 - bob*0.18), 'rgba(0,0,0,0.10)'); // shadow
    // floating trail dots from the ground up to the dot
    for (let k = 1; k <= 3; k++) {
      const [px, py] = proj(c, r, (PIN_H + 0.7) * (k/4));
      ctx.globalAlpha = 0.32 * (1 - k/4) + 0.12;
      ctx.beginPath(); ctx.arc(px, py - bob*(k/4), 2.3, 0, Math.PI*2);
      ctx.fillStyle = item.lineColor; ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Big floating dot — same style as a normal stop, just larger + glowing.
    ctx.beginPath(); ctx.arc(cx, cy, 20 + puls*4, 0, Math.PI*2);
    ctx.fillStyle = item.lineColor + '22'; ctx.fill();
    ctx.beginPath(); ctx.arc(cx, cy, 15, 0, Math.PI*2);
    ctx.fillStyle = item.lineColor; ctx.strokeStyle = '#fff'; ctx.lineWidth = 4;
    ctx.fill(); ctx.stroke();

    ctx.font = 'bold 10px "JetBrains Mono", monospace';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#fff';
    ctx.fillText(item.lineCode, cx, cy);
    drawLabel(ctx, item, cx, cy - 6, i, true);
    return;
  }

  const top = proj(c, r, PIN_H);
  groundDot(ctx, base[0], base[1], 9,   'rgba(0,0,0,0.10)');       // ground shadow
  groundDot(ctx, base[0], base[1], 7.5, BG, item.lineColor, 2.5); // base collar

  ctx.strokeStyle = item.lineColor; ctx.lineWidth = 4; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(base[0],base[1]); ctx.lineTo(top[0],top[1]); ctx.stroke();

  ctx.beginPath(); ctx.arc(top[0],top[1],13,0,Math.PI*2);
  ctx.fillStyle = '#fff'; ctx.strokeStyle = item.lineColor; ctx.lineWidth = 4; ctx.fill(); ctx.stroke();

  ctx.font = 'bold 11px "JetBrains Mono", monospace';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = item.lineColor;
  ctx.fillText(item.lineCode, top[0], top[1]);

  drawLabel(ctx, item, top[0], top[1], i, false);
}

// ── Metro map frame renderer (2.5D) ───────────────────────────
function drawMetroFrame(ctx, fromIdx, toIdx, progress) {
  ctx.clearRect(0, 0, MC_W, MC_H);
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';

  const tracePath = (pts) => {
    ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.stroke();
  };

  // 1) White foundation block + Taipei landscape (regions, compass).
  drawSlab(ctx);
  drawLandscape(ctx);

  // 2) Base network — laid on the slab's top face.
  ctx.globalAlpha = 0.62;
  METRO_LINES.forEach(({ color, pts }) => { ctx.strokeStyle = color; ctx.lineWidth = 8; tracePath(pts); });
  ctx.globalAlpha = 1;

  // 3) Minor stations (flat on the ground).
  MINOR.forEach(({ xy: [mx, my], color }) => groundDot(ctx, mx, my, 4.2, BG, color, 2));

  // 4) Travelling route — white casing + bright colour.
  const routePts  = buildRoutePath(fromIdx, toIdx, progress);
  const fromColor = config.timelineItems[fromIdx].lineColor;
  if (routePts.length >= 2) {
    ctx.strokeStyle = BG;        ctx.lineWidth = 14; tracePath(routePts);
    ctx.strokeStyle = fromColor; ctx.lineWidth = 8;  tracePath(routePts);
  }

  // 5) Interchanges (flat ground rings).
  TRANSFERS.forEach(([nx, ny]) => groundDot(ctx, nx, ny, 7, BG, '#3a3a3a', 3));

  // 6) Travelling head.
  const [tx, ty] = routePts[routePts.length - 1];
  ctx.beginPath(); ctx.arc(tx, ty, 15, 0, Math.PI * 2); ctx.fillStyle = fromColor + '33'; ctx.fill();
  ctx.beginPath(); ctx.arc(tx, ty,  8, 0, Math.PI * 2); ctx.fillStyle = fromColor;        ctx.fill();
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.stroke();

  // 7) Station pins — drawn back-to-front so nearer pins overlap farther ones.
  config.timelineItems
    .map((_, i) => i)
    .sort((a, b) => (STA_GRID[a][0]+STA_GRID[a][1]) - (STA_GRID[b][0]+STA_GRID[b][1]))
    .forEach((i) => {
      const [c, r] = STA_GRID[i];
      drawPin(ctx, c, r, i, config.timelineItems[i], i === toIdx);
    });
}

// ── Interactive map frame renderer (2.5D, browse mode) ────────
// Same composition as the transition frame but with no travelling route:
// every station is a pickable target. The current stop floats (the "you are
// here" cloud); the hovered stop gets a pulsing selection ring.
function drawBrowseFrame(ctx, currentIdx, hoverIdx) {
  ctx.clearRect(0, 0, MC_W, MC_H);
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';

  const tracePath = (pts) => {
    ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.stroke();
  };

  // 1) White foundation block + Taipei landscape.
  drawSlab(ctx);
  drawLandscape(ctx);

  // 2) Base network.
  ctx.globalAlpha = 0.62;
  METRO_LINES.forEach(({ color, pts }) => { ctx.strokeStyle = color; ctx.lineWidth = 8; tracePath(pts); });
  ctx.globalAlpha = 1;

  // 3) Minor stations + interchanges (flat on the ground).
  MINOR.forEach(({ xy: [mx, my], color }) => groundDot(ctx, mx, my, 4.2, BG, color, 2));
  TRANSFERS.forEach(([nx, ny]) => groundDot(ctx, nx, ny, 7, BG, '#3a3a3a', 3));

  // 4) Station pins — back-to-front so nearer pins overlap farther ones.
  config.timelineItems
    .map((_, i) => i)
    .sort((a, b) => (STA_GRID[a][0]+STA_GRID[a][1]) - (STA_GRID[b][0]+STA_GRID[b][1]))
    .forEach((i) => {
      const [c, r] = STA_GRID[i];
      // Every pickable (non-current) station wears a tappable ring so it clearly
      // reads as a button; the hovered one pulses bigger and brighter.
      if (i !== currentIdx) {
        const [hx, hy] = proj(c, r, PIN_H);
        const color = config.timelineItems[i].lineColor;
        const isHover = i === hoverIdx;
        const puls = 0.5 + 0.5 * Math.sin(performance.now() * 0.006);
        // Soft filled halo — gives the target visible surface area.
        ctx.beginPath(); ctx.arc(hx, hy, isHover ? 24 : 19, 0, Math.PI * 2);
        ctx.fillStyle = color + (isHover ? '2e' : '1c'); ctx.fill();
        // Dashed "click me" ring.
        ctx.beginPath(); ctx.arc(hx, hy, isHover ? 22 + puls * 6 : 19, 0, Math.PI * 2);
        ctx.strokeStyle = color; ctx.lineWidth = isHover ? 3.5 : 2.5;
        ctx.setLineDash(isHover ? [] : [4, 4]);
        ctx.globalAlpha = isHover ? (0.55 + 0.35 * puls) : 0.6;
        ctx.stroke();
        ctx.setLineDash([]); ctx.globalAlpha = 1;
      }
      drawPin(ctx, c, r, i, config.timelineItems[i], i === currentIdx);
    });
}

// ── Interactive map controller ────────────────────────────────
// Opens the full network as a clickable map. Hover a station, click to travel.
// currentIdx — the stop the traveller is parked at (rendered as "you are here")
// onSelect   — called with the chosen station index once the map closes
export function openMetroMap(currentIdx, onSelect) {
  const overlay = document.getElementById('metro-map');
  const canvas  = document.getElementById('mm-canvas');
  const ctx     = canvas.getContext('2d');
  const exitBtn = document.getElementById('mm-exit');

  overlay.style.setProperty('--lc', config.timelineItems[currentIdx].lineColor);

  let hoverIdx = -1, rafId = null, closed = false;

  const render = () => { drawBrowseFrame(ctx, currentIdx, hoverIdx); rafId = requestAnimationFrame(render); };

  // Client pixel → station index (hit-tests the pin tops). -1 if none.
  const pickStation = (clientX, clientY) => {
    const rect = canvas.getBoundingClientRect();
    const scale = MC_W / rect.width;                 // canvas-px per screen-px
    const x = (clientX - rect.left) * scale;
    const y = (clientY - rect.top)  * (MC_H / rect.height);
    // Keep the tap target a generous ~38px on screen regardless of how small the
    // canvas is rendered (so it's big and forgiving on phones too).
    let best = -1, bestD = 38 * scale;
    config.timelineItems.forEach((_, i) => {
      if (i === currentIdx) return;                  // can't travel to where we are
      const [c, r] = STA_GRID[i];
      const [px, py] = proj(c, r, PIN_H);
      const d = Math.hypot(px - x, py - y);
      if (d < bestD) { bestD = d; best = i; }
    });
    return best;
  };

  const onMove = (e) => {
    hoverIdx = pickStation(e.clientX, e.clientY);
    document.body.classList.toggle('cursor-hover', hoverIdx >= 0);
  };
  const onClick = (e) => {
    const idx = pickStation(e.clientX, e.clientY);
    if (idx < 0) return;
    // Seamless hand-off: launch the trip (its overlay fades in ON TOP of the map),
    // stop interaction now, then drop the map once it's hidden behind the trip.
    onSelect(idx);
    canvas.removeEventListener('mousemove', onMove);
    canvas.removeEventListener('click', onClick);
    document.body.classList.remove('cursor-hover');
    setTimeout(close, 320);
  };
  const onKey = (e) => { if (e.key === 'Escape') close(); };

  function close() {
    if (closed) return;
    closed = true;
    overlay.classList.remove('mm-show');
    overlay.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('cursor-hover');
    canvas.removeEventListener('mousemove', onMove);
    canvas.removeEventListener('click', onClick);
    exitBtn.removeEventListener('click', close);
    window.removeEventListener('keydown', onKey);
    if (rafId) cancelAnimationFrame(rafId);
  }

  canvas.addEventListener('mousemove', onMove);
  canvas.addEventListener('click', onClick);
  exitBtn.addEventListener('click', close);
  window.addEventListener('keydown', onKey);

  overlay.setAttribute('aria-hidden', 'false');
  overlay.classList.add('mm-show');
  render();

  return { close };
}

// ── Metro transition orchestrator ─────────────────────────────
// panelEl — the stop panel DOM node (for slide-in/out CSS classes)
// onMid   — called mid-animation to swap DOM content
// onDone  — called when the full transition is complete
export function showMetroTransition(fromIdx, toIdx, panelEl, onMid, onDone) {
  const toItem   = config.timelineItems[toIdx];
  const fromItem = config.timelineItems[fromIdx];
  const overlay  = document.getElementById('metro-trans');
  const canvas   = document.getElementById('mt-canvas');
  const ctx      = canvas.getContext('2d');
  const fromZh   = document.getElementById('mt-from-zh');
  const toZh     = document.getElementById('mt-to-zh');
  const enLabel  = document.getElementById('mt-en-label');

  overlay.style.setProperty('--lc', toItem.lineColor);
  fromZh.textContent  = fromItem.stationName;
  toZh.textContent    = toItem.stationName;
  enLabel.textContent = `${fromItem.stationNameEn.toUpperCase()} → ${toItem.stationNameEn.toUpperCase()}`;

  drawMetroFrame(ctx, fromIdx, toIdx, 0);
  panelEl.classList.add('sp-exit');
  overlay.classList.add('mt-show');

  let startTs = null, midFired = false, rafId = null;

  const animate = (ts) => {
    if (!startTs) startTs = ts;
    const elapsed  = ts - startTs;
    const progress = Math.min(1, elapsed / MT_TRAVEL);
    if (!midFired && elapsed >= MT_MID - MT_START_MOVE) { midFired = true; onMid(); }
    drawMetroFrame(ctx, fromIdx, toIdx, progress);
    // Keep rendering after the route completes so the destination cloud keeps
    // bobbing until the overlay is dismissed (cancelled at MT_DONE).
    rafId = requestAnimationFrame(animate);
  };

  setTimeout(() => { rafId = requestAnimationFrame(animate); }, MT_START_MOVE);
  setTimeout(() => { panelEl.classList.remove('sp-exit', 'sp-hidden'); }, MT_OUT_START - 100);
  setTimeout(() => overlay.classList.remove('mt-show'), MT_OUT_START);
  setTimeout(() => { if (rafId) cancelAnimationFrame(rafId); onDone(); }, MT_DONE);
}
