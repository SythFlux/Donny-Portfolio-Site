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
  1. Define lines first as polylines of H/V/45° segments.
  2. Place each station exactly ON its line.
  3. Every route point must lie on an actual line segment — no phantom cuts.

  Hourglass layout — 4 corners connect to two vertical spines
  via exactly 45° diagonals. O11 sits on the horizontal corridor.

        V00[70,50]           BL11[490,50]
           \   purple       blue   /
            \  45°           45°  /
         [T:130,110]       [T:430,110]
             |                 |
         [T:130,140]═══════[T:430,140]   ← orange corridor (y=140)
             |                 |
         [T:130,170]       [T:430,170]
            /  red           green  \
           /  45°             45°    \
        R05[70,230]           G07[490,230]

  Left spine  x=130: Purple [V00→T110→T140] + Red [R05→T170→T140]
  Right spine x=430: Blue [BL11→T110→T140] + Green [G07→T170→T140]
  Corridor   y=140: Orange runs full width; O11[280,140] sits on it.

  Diagonal deltas are exactly 60px × 60px = true 45°.
*/
const MC_W = 560, MC_H = 280;

// [70,50]→[130,110]: Δ=(60,60) ✓45°   [490,50]→[430,110]: Δ=(-60,60) ✓45°
// [70,230]→[130,170]: Δ=(60,-60) ✓45°  [490,230]→[430,170]: Δ=(-60,-60) ✓45°
const STA_XY = [
  [ 70,  50],  // V00  — purple, top-left
  [490,  50],  // BL11 — blue,   top-right
  [490, 230],  // G07  — green,  bottom-right
  [280, 140],  // O11  — orange, centre corridor
  [ 70, 230],  // R05  — red,    bottom-left
];

// Each line is drawn as a polyline — stations sit exactly on these points
const METRO_LINES = [
  { color:'#7c3aed', pts:[[60,40],[70,50],[130,110],[130,140]]   }, // Purple: V00 → 45°diag → left spine top
  { color:'#0070c0', pts:[[500,40],[490,50],[430,110],[430,140]] }, // Blue:   BL11 → 45°diag → right spine top
  { color:'#008659', pts:[[500,240],[490,230],[430,170],[430,140]]}, // Green: G07 → 45°diag → right spine bottom
  { color:'#f5a623', pts:[[55,140],[510,140]]                    }, // Orange: full horizontal corridor, O11 on it
  { color:'#e3001b', pts:[[60,240],[70,230],[130,170],[130,140]] }, // Red:    R05 → 45°diag → left spine bottom
];

// Where two or more lines physically meet
const TRANSFERS = [
  [130, 110],  // Purple 45°-diag ↕ left spine
  [430, 110],  // Blue   45°-diag ↕ right spine
  [130, 140],  // Left spine × corridor
  [430, 140],  // Right spine × corridor
  [130, 170],  // Red    45°-diag ↕ left spine
  [430, 170],  // Green  45°-diag ↕ right spine
];

// Routes use ONLY segments that exist in METRO_LINES above — verified point-by-point
const ROUTES = {
  //            on Purple           corridor           on Blue
  '0>1': [[ 70, 50],[130,110],[130,140],[430,140],[430,110],[490, 50]],
  //            on Blue             on Green
  '1>2': [[490, 50],[430,110],[430,170],[490,230]],
  //            on Green            corridor
  '2>3': [[490,230],[430,170],[430,140],[280,140]],
  //            corridor            on Red
  '3>4': [[280,140],[130,140],[130,170],[ 70,230]],
  //            on Red              on Purple
  '4>0': [[ 70,230],[130,170],[130,110],[ 70, 50]],
};

// ── Icon offsets per station ──────────────────────────────────
const ICON_OFFSETS = [
  [-28,   0],  // V00  [70,50]   — left
  [ 28,   0],  // BL11 [490,50]  — right
  [ 28,   0],  // G07  [490,230] — right
  [  0, -28],  // O11  [280,140] — above corridor
  [-28,   0],  // R05  [70,230]  — left
];

const LABEL_CFG = [
  { dx:  18, dy:  0, align: 'left',   dir: -1 }, // V00  — right, above
  { dx: -18, dy:  0, align: 'right',  dir: -1 }, // BL11 — left,  above
  { dx: -18, dy:  0, align: 'right',  dir:  1 }, // G07  — left,  below
  { dx:   0, dy:-16, align: 'center', dir: -1 }, // O11  — centred above
  { dx:  18, dy:  0, align: 'left',   dir:  1 }, // R05  — right, below
];

// ── Path builder ──────────────────────────────────────────────
// Chains adjacent route segments to build any multi-hop path.
// Picks the shortest direction around the circular loop automatically.
function buildRoutePath(fromIdx, toIdx, progress) {
  const key    = `${fromIdx}>${toIdx}`;
  const revKey = `${toIdx}>${fromIdx}`;
  let pts;

  if (ROUTES[key]) {
    pts = ROUTES[key].map(p => [...p]);
  } else if (ROUTES[revKey]) {
    pts = [...ROUTES[revKey]].reverse().map(p => [...p]);
  } else {
    const n   = Object.keys(ROUTES).length; // station count = number of adjacent pairs
    const fwd = (toIdx - fromIdx + n) % n;
    const bwd = (fromIdx - toIdx + n) % n;
    pts = [];

    if (fwd <= bwd) {
      for (let i = 0; i < fwd; i++) {
        const a   = (fromIdx + i) % n;
        const b   = (a + 1) % n;
        const seg = ROUTES[`${a}>${b}`].map(p => [...p]);
        pts = pts.length ? [...pts, ...seg.slice(1)] : seg;
      }
    } else {
      for (let i = 0; i < bwd; i++) {
        const a   = (fromIdx - i + n) % n;
        const b   = (a - 1 + n) % n;
        const seg = [...ROUTES[`${b}>${a}`]].reverse().map(p => [...p]);
        pts = pts.length ? [...pts, ...seg.slice(1)] : seg;
      }
    }
  }

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

// ── Station icon renderer ─────────────────────────────────────
function drawIcon(ctx, scene, cx, cy, color) {
  ctx.fillStyle = color;
  switch (scene) {
    case 'design':
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(Math.PI/4);
      ctx.fillRect(-7,-7,14,14); ctx.restore();
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.save(); ctx.translate(cx,cy); ctx.rotate(Math.PI/4);
      ctx.fillRect(-3,-3,6,6); ctx.restore();
      break;
    case 'village':
      ctx.fillRect(cx-9, cy-2, 18, 14);
      ctx.beginPath(); ctx.moveTo(cx-12,cy-2); ctx.lineTo(cx,cy-16); ctx.lineTo(cx+12,cy-2);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.fillRect(cx-6, cy, 5, 6); ctx.fillRect(cx+1, cy, 5, 6);
      break;
    case 'runway':
      ctx.fillRect(cx-4, cy-18, 8, 18);
      ctx.fillRect(cx-9, cy-26, 18, 10);
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.fillRect(cx-7, cy-24, 14, 7);
      ctx.fillStyle = color;
      ctx.fillRect(cx-2, cy-30, 4, 5);
      break;
    case 'mountain':
      ctx.beginPath(); ctx.moveTo(cx-14,cy+8); ctx.lineTo(cx-2,cy-10); ctx.lineTo(cx+10,cy+8); ctx.closePath(); ctx.fill();
      ctx.fillStyle = color + 'bb';
      ctx.beginPath(); ctx.moveTo(cx-2,cy+8); ctx.lineTo(cx+10,cy-14); ctx.lineTo(cx+22,cy+8); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      ctx.beginPath(); ctx.moveTo(cx+10,cy-14); ctx.lineTo(cx+6,cy-7); ctx.lineTo(cx+14,cy-7); ctx.closePath(); ctx.fill();
      break;
    case 'city':
      ctx.fillRect(cx-15,cy-12,8,12);
      ctx.fillRect(cx-5, cy-20,10,20);
      ctx.fillRect(cx+7, cy-8, 8, 8);
      ctx.fillStyle = 'rgba(255,255,255,0.22)';
      ctx.fillRect(cx-13,cy-10,3,3); ctx.fillRect(cx-13,cy-5,3,3);
      ctx.fillRect(cx-3, cy-17,3,3); ctx.fillRect(cx-3, cy-11,3,3); ctx.fillRect(cx-3,cy-5,3,3);
      break;
  }
}

function drawLabel(ctx, item, sx, sy, cfgIdx) {
  const { dx, dy, align, dir } = LABEL_CFG[cfgIdx];
  ctx.save();
  ctx.textAlign = align;
  ctx.textBaseline = dir === 1 ? 'top' : 'bottom';
  ctx.font = 'bold 14px "Noto Sans SC", sans-serif';
  ctx.fillStyle = '#111';
  ctx.fillText(item.stationName, sx + dx, sy + dy);
  ctx.font = 'bold 11px "Courier New"';
  ctx.fillStyle = item.lineColor;
  ctx.fillText(item.stationCode, sx + dx, sy + dy + dir * 19);
  ctx.restore();
}

// ── Metro map frame renderer ──────────────────────────────────
function drawMetroFrame(ctx, fromIdx, toIdx, progress) {
  const BG = 'rgba(245,243,238,1)';
  ctx.clearRect(0, 0, MC_W, MC_H);

  METRO_LINES.forEach(({ color, pts }) => {
    ctx.strokeStyle = color + '60';
    ctx.lineWidth = 9; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.stroke();
  });

  const routePts  = buildRoutePath(fromIdx, toIdx, progress);
  const fromColor = config.timelineItems[fromIdx].lineColor;

  if (routePts.length >= 2) {
    ctx.strokeStyle = fromColor;
    ctx.lineWidth = 9; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(routePts[0][0], routePts[0][1]);
    for (let i = 1; i < routePts.length; i++) ctx.lineTo(routePts[i][0], routePts[i][1]);
    ctx.stroke();
  }

  const [tx, ty] = routePts[routePts.length - 1];
  ctx.beginPath(); ctx.arc(tx, ty, 11, 0, Math.PI * 2);
  ctx.fillStyle = fromColor; ctx.fill();
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.stroke();
  ctx.beginPath(); ctx.arc(tx, ty, 18, 0, Math.PI * 2);
  ctx.strokeStyle = fromColor + '44'; ctx.lineWidth = 3; ctx.stroke();

  TRANSFERS.forEach(([nx, ny]) => {
    ctx.beginPath(); ctx.arc(nx, ny, 5, 0, Math.PI * 2);
    ctx.fillStyle = BG; ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.18)'; ctx.lineWidth = 1.5; ctx.stroke();
  });

  config.timelineItems.forEach((item, i) => {
    const [sx, sy] = STA_XY[i];
    const isDest = i === toIdx;
    const staR   = isDest ? 14 : 11;

    ctx.beginPath(); ctx.arc(sx, sy, staR, 0, Math.PI * 2);
    ctx.fillStyle   = isDest ? item.lineColor : BG;
    ctx.strokeStyle = item.lineColor;
    ctx.lineWidth   = 3.5; ctx.fill(); ctx.stroke();

    ctx.font = 'bold 8px "Courier New"';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = isDest ? '#fff' : item.lineColor;
    ctx.fillText(item.lineCode, sx, sy);

    const [ix, iy] = ICON_OFFSETS[i];
    drawIcon(ctx, item.scene, sx + ix, sy + iy, item.lineColor);
    drawLabel(ctx, item, sx, sy, i);
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
