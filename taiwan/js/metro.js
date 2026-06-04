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
const MC_W = 640, MC_H = 480;

// Grid → pixel. Square cell (GX === GY) keeps every diagonal a true 45°.
const OX = 55, OY = 40, GX = 40, GY = 40;
const gp = (c, r) => [OX + c * GX, OY + r * GY];

// Each line is an ordered list of [col,row] grid nodes (corners included).
const LINE_DEFS = [
  { color:'#0070c0', grid:[[1,3],[7,3],[11,3],[13,5]]             }, // Blue   板南線     — long E-W trunk, bends ↘ to 象山
  { color:'#7c3aed', grid:[[4,0],[7,3]]                          }, // Purple 文創設計線 — 45° feeder into 台北車站
  { color:'#e3001b', grid:[[7,3],[7,7],[10,7],[13,10]]           }, // Red    淡水信義線 — ↓ spine, → then ↘ to 台北101
  { color:'#008659', grid:[[1,3],[5,7],[7,7],[4,10],[1,10]]      }, // Green  松山新店線 — ↘ from 西門, through 中正, SW to 公館
  { color:'#f5a623', grid:[[13,5],[11,7],[10,7],[7,10],[4,10]]   }, // Orange 中和新蘆線 — ↙ from 象山, through 東門 & 古亭
];

// Station (config index) → grid node it sits on.
const STA_GRID = [
  [ 4,  0],  // 0 · V00  出發站   — purple feeder top
  [ 1,  3],  // 1 · BL11 西門     — Blue × Green interchange (west end)
  [ 1, 10],  // 2 · G07  公館     — green SW terminus
  [13,  5],  // 3 · O11  象山     — Blue × Orange interchange (east end)
  [13, 10],  // 4 · R03  台北101  — red SE terminus
];

// Pixel-space polylines for drawing the base map.
const METRO_LINES = LINE_DEFS.map(d => ({ color:d.color, pts:d.grid.map(([c,r]) => gp(c,r)) }));
const STA_XY      = STA_GRID.map(([c,r]) => gp(c,r));

// ── Build the route graph from the line segments ──────────────
const nkey = (c, r) => `${c},${r}`;
const adj  = new Map();                       // node key → [{ k, w }]
function linkNodes(a, b) {
  const ka = nkey(a[0], a[1]), kb = nkey(b[0], b[1]);
  const w  = Math.hypot((b[0]-a[0]) * GX, (b[1]-a[1]) * GY);
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
    ctx.strokeStyle = 'rgba(245,243,238,0.92)';
    ctx.strokeText(text, x, yy);
    ctx.fillStyle = fill;
    ctx.fillText(text, x, yy);
  };
  halo(item.stationName, sy + dy - 8, `${isDest ? '900' : 'bold'} 15px "Noto Sans SC", sans-serif`, '#0a0a0a');
  halo(item.stationCode, sy + dy + 9, 'bold 11px "JetBrains Mono", monospace', item.lineColor);
  ctx.restore();
}

// ── Metro map frame renderer ──────────────────────────────────
function drawMetroFrame(ctx, fromIdx, toIdx, progress) {
  ctx.clearRect(0, 0, MC_W, MC_H);
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';

  const tracePath = (pts) => {
    ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.stroke();
  };

  // 1) Base network — full colour, long confident strokes.
  ctx.globalAlpha = 0.6;
  METRO_LINES.forEach(({ color, pts }) => {
    ctx.strokeStyle = color; ctx.lineWidth = 10; tracePath(pts);
  });
  ctx.globalAlpha = 1;

  // 2) Evenly-spaced minor stations along every line.
  MINOR.forEach(({ xy: [mx, my], color }) => {
    ctx.beginPath(); ctx.arc(mx, my, 3.2, 0, Math.PI * 2);
    ctx.fillStyle = BG; ctx.fill();
    ctx.globalAlpha = 0.65; ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.stroke();
    ctx.globalAlpha = 1;
  });

  // 3) The travelling route — white casing lifts it above the network,
  //    then the bright line colour rides on top.
  const routePts  = buildRoutePath(fromIdx, toIdx, progress);
  const fromColor = config.timelineItems[fromIdx].lineColor;
  if (routePts.length >= 2) {
    ctx.strokeStyle = BG;        ctx.lineWidth = 16; tracePath(routePts);
    ctx.strokeStyle = fromColor; ctx.lineWidth = 10; tracePath(routePts);
  }

  // 4) Interchange symbols (drawn over the lines).
  TRANSFERS.forEach(([nx, ny]) => {
    ctx.beginPath(); ctx.arc(nx, ny, 7, 0, Math.PI * 2);
    ctx.fillStyle = BG; ctx.fill();
    ctx.strokeStyle = '#3a3a3a'; ctx.lineWidth = 3; ctx.stroke();
  });

  // 5) Travelling head.
  const [tx, ty] = routePts[routePts.length - 1];
  ctx.beginPath(); ctx.arc(tx, ty, 17, 0, Math.PI * 2); ctx.fillStyle = fromColor + '33'; ctx.fill();
  ctx.beginPath(); ctx.arc(tx, ty,  9, 0, Math.PI * 2); ctx.fillStyle = fromColor;        ctx.fill();
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.stroke();

  // 6) The five journey stations + labels (drawn last, on top).
  config.timelineItems.forEach((item, i) => {
    const [sx, sy] = STA_XY[i];
    const isDest = i === toIdx;

    if (isDest) {
      ctx.beginPath(); ctx.arc(sx, sy, 21, 0, Math.PI * 2);
      ctx.fillStyle = item.lineColor + '22'; ctx.fill();
    }

    const r = isDest ? 13 : 10;
    ctx.beginPath(); ctx.arc(sx, sy, r, 0, Math.PI * 2);
    ctx.fillStyle   = isDest ? item.lineColor : '#fff';
    ctx.strokeStyle = item.lineColor; ctx.lineWidth = 4;
    ctx.fill(); ctx.stroke();

    ctx.font = 'bold 9px "JetBrains Mono", monospace';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = isDest ? '#fff' : item.lineColor;
    ctx.fillText(item.lineCode, sx, sy);

    drawLabel(ctx, item, sx, sy, i, isDest);
  });
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
    if (progress < 1) rafId = requestAnimationFrame(animate);
  };

  setTimeout(() => { rafId = requestAnimationFrame(animate); }, MT_START_MOVE);
  setTimeout(() => { panelEl.classList.remove('sp-exit', 'sp-hidden'); }, MT_OUT_START - 100);
  setTimeout(() => overlay.classList.remove('mt-show'), MT_OUT_START);
  setTimeout(() => { if (rafId) cancelAnimationFrame(rafId); onDone(); }, MT_DONE);
}
