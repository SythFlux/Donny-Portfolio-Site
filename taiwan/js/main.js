import { config }    from './config.js';
import { Viewer }    from './viewer.js';
import { Timeline }  from './timeline.js';
import { CityScene } from './city.js';

// ── DOM refs ──────────────────────────────────────────────────
let elBgNum, elBgKanjiWrap, elBgKanji, elBgKanjiEn;
let elHudBadge, elHudLineZh, elHudLineEn, elHudCode;
let elHeroBadge, elHeroLineLabel, elHeroStationZh, elHeroStationEn;
let elHeroTitleEn, elHeroTitle, elHeroDesc, elHeroCode;
let elPanel, elSpBadge, elSpLineZh, elSpLineEn, elSpCode;
let elSpStationZh, elSpStationEn, elSpNum, elSpLabelZh, elSpLabelEn;
let elSpDesc, elSpVideo;

let city = null, isTransitioning = false, currentStopIdx = 0;

// ── Metro transition timing ───────────────────────────────────
const MT_TRAVEL    = 800;
const MT_START_MOVE= 260;
const MT_MID       = 380;
const MT_OUT_START = 1160;
const MT_DONE      = 1460;

// ── Metro map canvas geometry ─────────────────────────────────
/*
 Non-rectangular real-metro-map layout (560 × 280):

   V00 ──────────────── [corner]
    │                       │
    │                     BL11 ──── [corner]
    │                                   │
    │                                  G07
    │                                   │
   R05 ──────── O11 ────────────────────┘

 Left side:  V00 (top-left) → R05 (bottom-left), vertical
 Top:        V00 → corner → BL11 (L-bend)
 BL11 bend:  BL11 → corner → G07 (L-bend)
 Bottom:     G07 → O11 → R05 (two horizontal segments)
*/
const MC_W = 560, MC_H = 280;

// All waypoints CW around the loop. station=-1 means routing corner only.
const WAYPOINTS = [
  { xy: [90,  80],  station: 0 },  // V00
  { xy: [390, 80],  station: -1 }, // corner
  { xy: [390, 118], station: 1 },  // BL11
  { xy: [470, 118], station: -1 }, // corner
  { xy: [470, 205], station: 2 },  // G07
  { xy: [262, 205], station: 3 },  // O11
  { xy: [90,  205], station: 4 },  // R05
];

// STA_XY[stopIndex] = canvas [x,y] for that stop
const STA_XY = WAYPOINTS
  .filter(w => w.station >= 0)
  .sort((a, b) => a.station - b.station)
  .map(w => w.xy);

function segLen([a, b]) { return Math.hypot(b[0]-a[0], b[1]-a[1]); }

// Track segments between consecutive waypoints (loop closes)
const TRACK_SEGS = WAYPOINTS.map((w, i) => [w.xy, WAYPOINTS[(i+1) % WAYPOINTS.length].xy]);

// Cumulative track distance at each waypoint start
const WP_CUM = (() => {
  const c = [0];
  for (let i = 0; i < WAYPOINTS.length; i++) c.push(c[c.length-1] + segLen(TRACK_SEGS[i]));
  return c;
})();
const PERIM = WP_CUM[WAYPOINTS.length];

// Track distance of each STATION (indexed by stop order)
const STA_TRACK = WAYPOINTS.reduce((arr, w, i) => {
  if (w.station >= 0) arr[w.station] = WP_CUM[i];
  return arr;
}, new Array(5).fill(0));

// Build the partial colored-line path through waypoints, clipped to progress
function buildRoutePath(fromIdx, toIdx, dir, progress, dist) {
  const fromWpIdx = WAYPOINTS.findIndex(w => w.station === fromIdx);
  const n = WAYPOINTS.length;
  const traveled = dist * Math.max(0, Math.min(1, progress));
  const pts = [[...WAYPOINTS[fromWpIdx].xy]];
  let cur = fromWpIdx, cum = 0;
  while (cum < traveled) {
    const next = dir === 'cw' ? (cur + 1) % n : (cur - 1 + n) % n;
    const a = WAYPOINTS[cur].xy, b = WAYPOINTS[next].xy;
    const sLen = Math.hypot(b[0]-a[0], b[1]-a[1]);
    if (cum + sLen <= traveled) {
      cum += sLen; pts.push([...b]);
      if (WAYPOINTS[next].station === toIdx) break;
      cur = next;
    } else {
      const t2 = (traveled - cum) / sLen;
      pts.push([a[0]+(b[0]-a[0])*t2, a[1]+(b[1]-a[1])*t2]);
      break;
    }
  }
  return pts;
}

// Shortest route between two station indices (CW or CCW)
function getRoute(fromIdx, toIdx) {
  const fp = STA_TRACK[fromIdx], tp = STA_TRACK[toIdx];
  const cw  = ((tp - fp) + PERIM) % PERIM;
  const ccw = PERIM - cw;
  return cw <= ccw
    ? { dir: 'cw',  dist: cw }
    : { dir: 'ccw', dist: ccw };
}


// ── Station icons ─────────────────────────────────────────────
function drawIcon(ctx, scene, cx, cy, color) {
  ctx.fillStyle = color;
  switch (scene) {
    case 'design':
      // Rotated square diamond
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(Math.PI/4);
      ctx.fillRect(-7,-7,14,14); ctx.restore();
      ctx.fillStyle='rgba(255,255,255,0.55)';
      ctx.save(); ctx.translate(cx,cy); ctx.rotate(Math.PI/4);
      ctx.fillRect(-3,-3,6,6); ctx.restore();
      break;
    case 'village':
      // House silhouette
      ctx.fillRect(cx-9, cy-2, 18, 14);
      ctx.beginPath(); ctx.moveTo(cx-12,cy-2); ctx.lineTo(cx,cy-16); ctx.lineTo(cx+12,cy-2);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle='rgba(255,255,255,0.3)';
      ctx.fillRect(cx-6, cy, 5, 6); ctx.fillRect(cx+1, cy, 5, 6);
      break;
    case 'runway':
      // Control tower silhouette
      ctx.fillRect(cx-4, cy-18, 8, 18);         // shaft
      ctx.fillRect(cx-9, cy-26, 18, 10);        // control room
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.fillRect(cx-7, cy-24, 14, 7);         // glass
      ctx.fillStyle = color;
      ctx.fillRect(cx-2, cy-30, 4, 5);          // antenna mast
      break;
    case 'mountain':
      // Two overlapping peaks so it clearly reads as mountains, not a person
      ctx.beginPath(); ctx.moveTo(cx-14,cy+8); ctx.lineTo(cx-2,cy-10); ctx.lineTo(cx+10,cy+8); ctx.closePath(); ctx.fill();
      ctx.fillStyle = color + 'bb';
      ctx.beginPath(); ctx.moveTo(cx-2,cy+8); ctx.lineTo(cx+10,cy-14); ctx.lineTo(cx+22,cy+8); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      ctx.beginPath(); ctx.moveTo(cx+10,cy-14); ctx.lineTo(cx+6,cy-7); ctx.lineTo(cx+14,cy-7); ctx.closePath(); ctx.fill();
      break;
    case 'city':
      // Mini skyline
      ctx.fillRect(cx-15,cy-12,8,12);
      ctx.fillRect(cx-5, cy-20,10,20);
      ctx.fillRect(cx+7, cy-8, 8, 8);
      ctx.fillStyle='rgba(255,255,255,0.22)';
      ctx.fillRect(cx-13,cy-10,3,3); ctx.fillRect(cx-13,cy-5,3,3);
      ctx.fillRect(cx-3, cy-17,3,3); ctx.fillRect(cx-3, cy-11,3,3); ctx.fillRect(cx-3,cy-5,3,3);
      break;
  }
}

// ── Station label configs [dx, dy, textAlign, stack direction] ──
const LABEL_CFG = [
  { dx:  16, dy:   8, align: 'left',   dir:  1 }, // V00  — right, below (icon is above)
  { dx: -16, dy:   0, align: 'right',  dir: -1 }, // BL11 — left,  above (icon is left)
  { dx: -16, dy:   0, align: 'right',  dir: -1 }, // G07  — left,  above (icon is right)
  { dx:   0, dy: -12, align: 'center', dir: -1 }, // O11  — center,above (icon is below)
  { dx:  16, dy: -12, align: 'left',   dir: -1 }, // R05  — right, above (icon is below)
];

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

// ── Draw metro map frame (real metro-map style: thick lines) ─────
function drawMetroFrame(ctx, fromIdx, toIdx, progress) {
  const BG = 'rgba(245,243,238,1)';
  ctx.clearRect(0, 0, MC_W, MC_H);

  // ── Full loop background track — thick neutral gray ──
  ctx.strokeStyle = 'rgba(0,0,0,0.14)';
  ctx.lineWidth = 10; ctx.lineCap = 'square'; ctx.lineJoin = 'miter';
  ctx.beginPath(); ctx.moveTo(WAYPOINTS[0].xy[0], WAYPOINTS[0].xy[1]);
  for (let i = 1; i < WAYPOINTS.length; i++) ctx.lineTo(WAYPOINTS[i].xy[0], WAYPOINTS[i].xy[1]);
  ctx.closePath(); ctx.stroke();

  // ── Animated colored route ──
  const { dir, dist } = getRoute(fromIdx, toIdx);
  const routePts = buildRoutePath(fromIdx, toIdx, dir, progress, dist);
  const toColor  = config.timelineItems[toIdx].lineColor;

  if (routePts.length >= 2) {
    ctx.strokeStyle = toColor;
    ctx.lineWidth = 10; ctx.lineCap = 'square'; ctx.lineJoin = 'miter';
    ctx.beginPath(); ctx.moveTo(routePts[0][0], routePts[0][1]);
    for (let i = 1; i < routePts.length; i++) ctx.lineTo(routePts[i][0], routePts[i][1]);
    ctx.stroke();
  }

  // ── Train head ──
  const [tx, ty] = routePts[routePts.length - 1];
  ctx.beginPath(); ctx.arc(tx, ty, 11, 0, Math.PI * 2);
  ctx.fillStyle = toColor; ctx.fill();
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.stroke();
  ctx.beginPath(); ctx.arc(tx, ty, 18, 0, Math.PI * 2);
  ctx.strokeStyle = toColor + '44'; ctx.lineWidth = 3; ctx.stroke();

  // ── Station circles + icons + labels ──
  // icon offsets: [dx, dy] relative to station circle centre
  const iconOffsets = [
    [0,   -42],  // V00  — above (y=80 → icon at y=38)
    [-44,   0],  // BL11 — left  (x=390 → icon at x=346)
    [42,    0],  // G07  — right (x=470 → icon at x=512, within 560)
    [0,    42],  // O11  — below (y=205 → icon at y=247, within 280)
    [0,    42],  // R05  — below (y=205 → icon at y=247)
  ];

  config.timelineItems.forEach((item, i) => {
    const [sx, sy] = STA_XY[i];
    const isDest = i === toIdx;
    const staR   = isDest ? 14 : 11;

    // Station circle
    ctx.beginPath(); ctx.arc(sx, sy, staR, 0, Math.PI * 2);
    ctx.fillStyle   = isDest ? item.lineColor : BG;
    ctx.strokeStyle = item.lineColor;
    ctx.lineWidth   = 3.5; ctx.fill(); ctx.stroke();

    // Line code badge inside circle
    ctx.font = 'bold 8px "Courier New"';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = isDest ? '#fff' : item.lineColor;
    ctx.fillText(item.lineCode, sx, sy);

    // Scene icon
    const [ix, iy] = iconOffsets[i];
    drawIcon(ctx, item.scene, sx + ix, sy + iy, item.lineColor);

    // Large readable label
    drawLabel(ctx, item, sx, sy, i);
  });
}

// ── Metro transition ──────────────────────────────────────────
function showMetroTransition(fromIdx, toIdx, onDone) {
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
  elPanel.classList.add('sp-exit');
  overlay.classList.add('mt-show');

  let startTs = null, midFired = false, rafId = null;

  const animate = (ts) => {
    if (!startTs) startTs = ts;
    const elapsed  = ts - startTs;
    const progress = Math.min(1, elapsed / MT_TRAVEL);

    if (!midFired && elapsed >= MT_MID - MT_START_MOVE) {
      midFired = true; updateDOM(toIdx);
    }
    drawMetroFrame(ctx, fromIdx, toIdx, progress);
    if (progress < 1) rafId = requestAnimationFrame(animate);
  };

  setTimeout(() => { rafId = requestAnimationFrame(animate); }, MT_START_MOVE);
  setTimeout(() => { elPanel.classList.remove('sp-exit', 'sp-hidden'); }, MT_OUT_START - 100);
  setTimeout(() => overlay.classList.remove('mt-show'), MT_OUT_START);
  setTimeout(() => { if (rafId) cancelAnimationFrame(rafId); onDone(); }, MT_DONE);
}

// ── DOM update (instant, no animation) ───────────────────────
function updateDOM(index) {
  const item = config.timelineItems[index];
  if (!item) return;
  document.documentElement.style.setProperty('--lc', item.lineColor);
  if (city) city.setScene(item.scene, item.lineColor);

  if (elHudBadge)   { elHudBadge.textContent  = item.lineCode;  elHudBadge.style.background  = item.lineColor; }
  if (elHudLineZh)    elHudLineZh.textContent  = item.lineName;
  if (elHudLineEn)    elHudLineEn.textContent  = item.lineNameEn;
  if (elHudCode)      elHudCode.textContent    = item.stationCode;

  if (elHeroBadge)   { elHeroBadge.textContent   = item.lineCode;  elHeroBadge.style.background = item.lineColor; }
  if (elHeroLineLabel) elHeroLineLabel.textContent = `${item.lineName} · ${item.lineNameEn.toUpperCase()}`;
  if (elHeroStationZh) elHeroStationZh.textContent = item.stationName;
  if (elHeroStationEn) elHeroStationEn.textContent = item.stationNameEn.toUpperCase();
  if (elHeroTitleEn)   elHeroTitleEn.textContent   = item.labelEn;
  if (elHeroTitle)     elHeroTitle.textContent     = item.label;
  if (elHeroDesc)      elHeroDesc.textContent      = item.desc;
  if (elHeroCode)      elHeroCode.textContent      = item.stationCode;

  if (elBgNum) { elBgNum.textContent = item.id; elBgNum.style.color = item.lineColor; }
  if (elBgKanjiWrap) elBgKanjiWrap.style.color = item.lineColor;
  if (elBgKanji)    elBgKanji.textContent    = item.stationName;
  if (elBgKanjiEn)  elBgKanjiEn.textContent  = item.stationNameEn.toUpperCase();

  if (elSpBadge)    { elSpBadge.textContent    = item.lineCode;  elSpBadge.style.background  = item.lineColor; }
  if (elSpLineZh)     elSpLineZh.textContent   = item.lineName;
  if (elSpLineEn)     elSpLineEn.textContent   = item.lineNameEn;
  if (elSpCode)       elSpCode.textContent     = item.stationCode;
  if (elSpStationZh)  elSpStationZh.textContent = item.stationName;
  if (elSpStationEn)  elSpStationEn.textContent = item.stationNameEn.toUpperCase();
  if (elSpNum)        elSpNum.textContent      = item.id;
  if (elSpLabelZh)    elSpLabelZh.textContent  = item.label;
  if (elSpLabelEn)    elSpLabelEn.textContent  = item.labelEn;
  if (elSpDesc)       elSpDesc.textContent     = item.desc;
  if (elSpVideo)      elSpVideo.dataset.stop   = item.id;
}

// ── Boot ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  elBgNum         = document.getElementById('bg-number');
  elBgKanjiWrap   = document.getElementById('bg-kanji-wrap');
  elBgKanji       = document.getElementById('bg-kanji');
  elBgKanjiEn     = document.getElementById('bg-kanji-en');
  elHudBadge      = document.getElementById('hud-line-badge');
  elHudLineZh     = document.getElementById('hud-line-zh');
  elHudLineEn     = document.getElementById('hud-line-en');
  elHudCode       = document.getElementById('hud-station-code');
  elHeroBadge     = document.getElementById('hero-line-badge');
  elHeroLineLabel = document.getElementById('hero-line-label');
  elHeroStationZh = document.getElementById('hero-station-zh');
  elHeroStationEn = document.getElementById('hero-station-en');
  elHeroTitleEn   = document.getElementById('hero-title-en');
  elHeroTitle     = document.getElementById('hero-title');
  elHeroDesc      = document.getElementById('hero-desc');
  elHeroCode      = document.getElementById('hero-code-val');
  elPanel         = document.getElementById('stop-panel');
  elSpBadge       = document.getElementById('sp-badge');
  elSpLineZh      = document.getElementById('sp-line-zh');
  elSpLineEn      = document.getElementById('sp-line-en');
  elSpCode        = document.getElementById('sp-code');
  elSpStationZh   = document.getElementById('sp-station-zh');
  elSpStationEn   = document.getElementById('sp-station-en');
  elSpNum         = document.getElementById('sp-num');
  elSpLabelZh     = document.getElementById('sp-label-zh');
  elSpLabelEn     = document.getElementById('sp-label-en');
  elSpDesc        = document.getElementById('sp-desc');
  elSpVideo       = document.getElementById('sp-video');

  updateDOM(0);

  const cityCanvas = document.getElementById('city-canvas');
  if (cityCanvas) {
    city = new CityScene(cityCanvas);
    city.setScene(config.timelineItems[0].scene, config.timelineItems[0].lineColor);
    city.start();
  }

  const viewerEl = document.getElementById('viewer');
  const viewer   = new Viewer(viewerEl, config.modelUrl, config.viewDefaults, config.timelineItems);
  await viewer.init();

  const heroEl     = document.getElementById('hero-text');
  const exploreBtn = document.getElementById('explore-btn');
  const timelineEl = document.getElementById('timeline');

  exploreBtn.addEventListener('click', () => {
    heroEl?.classList.add('hidden');
    exploreBtn.classList.add('hidden');
    timelineEl.classList.remove('hidden');
    timelineEl.classList.add('visible');

    const timeline = new Timeline(timelineEl, config.timelineItems);
    timeline.activeIndex = 0;
    timeline.commitProgress();

    // Block viewer updates during the metro transition so the DJI animation
    // only starts AFTER the overlay fades out.
    let viewerBlocked = false;
    let pendingProgress = 0;
    timeline.onProgress((p) => {
      pendingProgress = p;
      if (!viewerBlocked) viewer.setModelProgress(p);
    });
    setTimeout(() => elPanel.classList.remove('sp-hidden'), 800);

    timeline.onStopChange((toIdx) => {
      if (isTransitioning) return;
      isTransitioning = true;
      viewerBlocked = true;
      timeline.lock();
      const fromIdx  = currentStopIdx;
      currentStopIdx = toIdx;
      showMetroTransition(fromIdx, toIdx, () => {
        isTransitioning = false;
        timeline.unlock();
        // Metro done — now start the DJI camera move
        viewerBlocked = false;
        viewer.setModelProgress(pendingProgress);
      });
    });
  });
});
