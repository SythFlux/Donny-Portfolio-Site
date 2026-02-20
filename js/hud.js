/* ═══════════════════════════════════════════════════════════════════
   hud.js — EXTREME 2D HUD overlay (neo-futurist systems aesthetic)
   Always-on ambient mode + intensified focus mode on orb click.
   ═══════════════════════════════════════════════════════════════════ */

import { blobs }    from './orbs.js';
import { camera }   from './scene.js';
import { PROJECTS } from './config.js';
import { getAccentColors, isDark } from './darkmode.js';
import * as THREE   from 'three';

/* ── Canvas setup ─────────────────────────────────────────────────── */
const canvas = document.getElementById('hud-canvas');
const ctx    = canvas.getContext('2d');

let W = 0, H = 0;
let mode = 'ambient';        // 'ambient' | 'focus'
let focusedIdx = -1;
let focusIntensity = 0;       // 0→1 lerp between ambient↔focus
let elapsed = 0;
let rafId = null;
let mouseX = 0, mouseY = 0;

document.addEventListener('mousemove', e => { mouseX = e.clientX; mouseY = e.clientY; });

/* ── Text pools ───────────────────────────────────────────────────── */
const FRAG_POOL = [
  'SECTOR_SCAN::OK', 'MEM_ALLOC 0x4F2A', 'VERTEX_COUNT:2048',
  'SIGNAL_LOCK:TRUE', 'BANDWIDTH:NOMINAL', 'HASH:9c7f3b...',
  'RENDER_PASS:3/3', 'THREAD_POOL:ACTIVE', 'LATENCY:<2ms',
  'DEPTH_BUFFER:ON', 'ANTI_ALIAS:x4', 'FRAME_SYNC:60Hz',
  'NODE_LINK:STABLE', 'COMPRESS:LZ4', 'CHECKSUM:VALID',
  'CACHE_HIT:97.2%', 'PIPELINE:READY', 'SHADER_COMPILE:OK',
  'I/O_STREAM:OPEN', 'ENTROPY:LOW', 'SYS_CLOCK:SYNC',
  'BUFFER_FLUSH:OK', 'QUEUE_DEPTH:7', 'VRAM:4096MB',
  'CPU_LOAD:23%', 'GPU_TEMP:62°C', 'HEAP_SIZE:512MB',
  'SOCKET:BOUND', 'PID:0x7FAE', 'KERNEL:ACTIVE',
  'MUTEX_LOCK:FREE', 'IRQ_HANDLER:OK', 'DMA_CHANNEL:3',
  'SYSCALL:READ', 'PAGE_FAULT:0', 'TLB_MISS:RARE',
];

const HEX_CHARS = '0123456789ABCDEF';
const BIN_CHARS = '01';

/* ── Element arrays ───────────────────────────────────────────────── */
let gridDots      = [];
let dataFragments = [];
let scanLines     = [];
let dataStreams   = [];
let hexCascades   = [];
let glitchBlocks  = [];
let pulsingRings  = [];
let floatingNums  = [];
let signalWave    = [];
let orbScreenPositions = [];
let orbScreenPos  = { x: 0, y: 0 };

/* ── Helpers ──────────────────────────────────────────────────────── */
function toScreen(mesh) {
  const v = new THREE.Vector3();
  mesh.getWorldPosition(v);
  v.project(camera);
  return { x: (v.x * 0.5 + 0.5) * W, y: (-v.y * 0.5 + 0.5) * H };
}
function rand(a, b)    { return a + Math.random() * (b - a); }
function randInt(a, b) { return Math.floor(rand(a, b + 1)); }
function randHex(n)    { let s = ''; for (let i = 0; i < n; i++) s += HEX_CHARS[randInt(0,15)]; return s; }

/* ══════════════════════════════════════════════════════════════════
   ELEMENT FACTORIES
   ══════════════════════════════════════════════════════════════════ */
function makeDataFragment() {
  return {
    text: FRAG_POOL[randInt(0, FRAG_POOL.length - 1)],
    x: rand(30, W - 100), y: rand(40, H - 60),
    delay: rand(0, 6), cycleDuration: rand(3, 8),
    fontSize: randInt(8, 11),
    driftVx: rand(-0.15, 0.15), driftVy: rand(-0.1, 0.1),
  };
}
function makeScanLine() {
  const h = Math.random() > 0.35;
  return {
    horizontal: h, pos: h ? rand(0, H) : rand(0, W),
    speed: rand(20, 80) * (Math.random() > 0.5 ? 1 : -1),
    length: rand(100, 400), thickness: rand(0.5, 1.5),
  };
}
function makeStreamParticle() {
  return {
    x: rand(0, W), y: rand(0, H),
    vx: rand(-2, 2), vy: rand(-1.5, 1.5),
    size: rand(0.5, 2.5), alpha: rand(0.1, 0.4),
    life: 0, maxLife: rand(2, 6),
    shape: Math.random() > 0.6 ? 'rect' : 'circle',
  };
}
function makeHexCascade() {
  return {
    x: rand(20, W - 20),
    chars: Array.from({ length: randInt(8, 20) }, () => randHex(2)),
    speed: rand(30, 80), offset: rand(0, 500),
    fontSize: randInt(8, 11), spacing: randInt(12, 16),
    alpha: rand(0.05, 0.15),
  };
}
function makeGlitchBlock() {
  return {
    x: rand(0, W), y: rand(0, H),
    w: rand(20, 120), h: rand(2, 8),
    nextFlash: rand(0.5, 4), flashDuration: rand(0.03, 0.12),
    flashing: false, timer: 0,
  };
}
function makePulsingRing() {
  return {
    x: rand(50, W - 50), y: rand(50, H - 50),
    radius: 0, maxRadius: rand(30, 80),
    speed: rand(15, 40), life: 0, maxLife: rand(2, 5),
  };
}
function makeFloatingNumber() {
  const bin = Math.random() > 0.5;
  return {
    text: bin
      ? Array.from({ length: randInt(4, 8) }, () => BIN_CHARS[randInt(0, 1)]).join('')
      : '0x' + randHex(randInt(2, 6)),
    x: rand(10, W - 80), y: rand(10, H - 30),
    vx: rand(-0.3, 0.3), vy: rand(-0.5, -0.1),
    alpha: rand(0.05, 0.18), life: 0, maxLife: rand(4, 12),
    fontSize: randInt(8, 12),
  };
}

/* ── Generate all ambient elements ────────────────────────────────── */
function generateAmbientElements() {
  // Grid dots
  gridDots = [];
  const sp = 50;
  for (let x = sp; x < W; x += sp)
    for (let y = sp; y < H; y += sp)
      if (Math.random() < 0.35)
        gridDots.push({ x, y, phase: rand(0, 6.28), speed: rand(0.5, 2), size: rand(0.8, 2) });

  dataFragments = Array.from({ length: 25 }, makeDataFragment);
  scanLines     = Array.from({ length: 7 },  makeScanLine);
  dataStreams   = Array.from({ length: 60 }, makeStreamParticle);
  hexCascades   = Array.from({ length: 12 },  makeHexCascade);
  glitchBlocks  = Array.from({ length: 20 }, makeGlitchBlock);
  pulsingRings  = Array.from({ length: 10 },  makePulsingRing);
  floatingNums  = Array.from({ length: 40 }, makeFloatingNumber);
  signalWave    = new Array(120).fill(0);
}

/* ══════════════════════════════════════════════════════════════════
   RESIZE / PUBLIC API
   ══════════════════════════════════════════════════════════════════ */
export function resizeHud() {
  W = window.innerWidth;
  H = window.innerHeight;
  canvas.width  = W * devicePixelRatio;
  canvas.height = H * devicePixelRatio;
  canvas.style.width  = W + 'px';
  canvas.style.height = H + 'px';
  ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
  generateAmbientElements();
}

export function showHud(idx) {
  focusedIdx = idx;
  mode = 'focus';
}

export function hideHud() {
  mode = 'ambient';
  focusedIdx = -1;
}

/* ══════════════════════════════════════════════════════════════════
   DRAW FUNCTIONS
   ══════════════════════════════════════════════════════════════════ */
function I() { return 0.65 + focusIntensity * 0.35; }  // intensity helper

/* ── Corner brackets ──────────────────────────────────────────────── */
function drawCornerBrackets(color) {
  const m = 22, L = 40 + focusIntensity * 15;
  ctx.strokeStyle = color;
  ctx.lineWidth = 1 + focusIntensity * 0.5;
  ctx.globalAlpha = I() * 0.6;
  [[m,m+L,m,m,m+L,m],[W-m-L,m,W-m,m,W-m,m+L],
   [m,H-m-L,m,H-m,m+L,H-m],[W-m-L,H-m,W-m,H-m,W-m,H-m-L]].forEach(([x1,y1,x2,y2,x3,y3])=>{
    ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.lineTo(x3,y3); ctx.stroke();
  });
  if (true) {
    const im = 60, iL = 25;
    ctx.globalAlpha = I() * 0.3;
    [[im,im+iL,im,im,im+iL,im],[W-im-iL,im,W-im,im,W-im,im+iL],
     [im,H-im-iL,im,H-im,im+iL,H-im],[W-im-iL,H-im,W-im,H-im,W-im,H-im-iL]].forEach(([x1,y1,x2,y2,x3,y3])=>{
      ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.lineTo(x3,y3); ctx.stroke();
    });
  }
  ctx.globalAlpha = 1;
}

/* ── Grid dots ────────────────────────────────────────────────────── */
function drawGridDots(color) {
  ctx.fillStyle = color;
  for (const d of gridDots) {
    const p = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(elapsed * d.speed + d.phase));
    ctx.globalAlpha = I() * p * 0.45;
    ctx.beginPath(); ctx.arc(d.x, d.y, d.size, 0, 6.28); ctx.fill();
  }
  ctx.globalAlpha = 1;
}

/* ── Scan lines ───────────────────────────────────────────────────── */
function drawScanLines(color) {
  const dt = 1 / 60;
  for (const s of scanLines) {
    s.pos += s.speed * dt * (1 + focusIntensity);
    if (s.horizontal) { if (s.pos > H + 50) s.pos = -50; if (s.pos < -50) s.pos = H + 50; }
    else              { if (s.pos > W + 50) s.pos = -50; if (s.pos < -50) s.pos = W + 50; }
    ctx.globalAlpha = I() * 0.25 * (1 + focusIntensity * 0.5);
    const g = s.horizontal
      ? ctx.createLinearGradient(0, s.pos, s.length, s.pos)
      : ctx.createLinearGradient(s.pos, 0, s.pos, s.length);
    g.addColorStop(0, 'transparent'); g.addColorStop(0.5, color); g.addColorStop(1, 'transparent');
    ctx.strokeStyle = g; ctx.lineWidth = s.thickness;
    ctx.beginPath();
    if (s.horizontal) { ctx.moveTo(0, s.pos); ctx.lineTo(W, s.pos); }
    else              { ctx.moveTo(s.pos, 0); ctx.lineTo(s.pos, H); }
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

/* ── Data fragments (floating text) ───────────────────────────────── */
function drawDataFragments(color) {
  for (const f of dataFragments) {
    const cycle = (elapsed + f.delay) % f.cycleDuration;
    const n = cycle / f.cycleDuration;
    let a = n < 0.15 ? n / 0.15 : n > 0.85 ? (1 - n) / 0.15 : 1;
    a *= 0.28 + focusIntensity * 0.15;
    f.x += f.driftVx; f.y += f.driftVy;
    if (f.x < -80) f.x = W + 20; if (f.x > W + 80) f.x = -20;
    if (f.y < -20) f.y = H + 20; if (f.y > H + 20) f.y = -20;
    ctx.globalAlpha = I() * a;
    ctx.fillStyle = color;
    ctx.font = `500 ${f.fontSize}px "Courier New",monospace`;
    ctx.fillText(f.text, f.x, f.y);
    ctx.beginPath(); ctx.arc(f.x - 6, f.y - 3, 1.5, 0, 6.28); ctx.fill();
  }
  ctx.globalAlpha = 1;
}

/* ── Data stream particles ────────────────────────────────────────── */
function drawDataStreams(color) {
  for (const p of dataStreams) {
    p.x += p.vx * (1 + focusIntensity); p.y += p.vy; p.life += 1 / 60;
    if (p.life > p.maxLife || p.x > W + 10 || p.x < -10 || p.y > H + 10 || p.y < -10)
      Object.assign(p, makeStreamParticle());
    const la = 1 - p.life / p.maxLife;
    ctx.globalAlpha = I() * p.alpha * la * 0.8;
    ctx.fillStyle = color;
    if (p.shape === 'rect') ctx.fillRect(p.x, p.y, p.size * 3, p.size * 0.8);
    else { ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, 6.28); ctx.fill(); }
  }
  ctx.globalAlpha = 1;
}

/* ── Hex cascades (Matrix-style columns) ──────────────────────────── */
function drawHexCascades(color) {
  ctx.fillStyle = color;
  for (const c of hexCascades) {
    const yOff = (elapsed * c.speed + c.offset) % (c.chars.length * c.spacing + H);
    ctx.font = `${c.fontSize}px "Courier New",monospace`;
    for (let i = 0; i < c.chars.length; i++) {
      const cy = yOff - i * c.spacing;
      if (cy < -20 || cy > H + 20) continue;
      ctx.globalAlpha = I() * c.alpha * 2.0 * (1 - i / c.chars.length) * (0.6 + focusIntensity * 0.4);
      if (Math.random() < 0.02) c.chars[i] = randHex(2);
      ctx.fillText(c.chars[i], c.x, cy);
    }
  }
  ctx.globalAlpha = 1;
}

/* ── Glitch blocks ────────────────────────────────────────────────── */
function drawGlitchBlocks(color) {
  const dt = 1 / 60;
  for (const g of glitchBlocks) {
    g.timer += dt;
    if (!g.flashing && g.timer > g.nextFlash) {
      g.flashing = true; g.timer = 0;
      g.x = rand(0, W); g.y = rand(0, H); g.w = rand(20, 150); g.h = rand(1, 6);
    }
    if (g.flashing) {
      if (g.timer > g.flashDuration) {
        g.flashing = false; g.timer = 0;
        g.nextFlash = rand(0.3, 3) / (1 + focusIntensity * 2);
      } else {
        ctx.globalAlpha = I() * rand(0.06, 0.2) * (1 + focusIntensity);
        ctx.fillStyle = color;
        ctx.fillRect(g.x, g.y, g.w, g.h);
      }
    }
  }
  ctx.globalAlpha = 1;
}

/* ── Pulsing rings ────────────────────────────────────────────────── */
function drawPulsingRings(color) {
  const dt = 1 / 60;
  for (const r of pulsingRings) {
    r.life += dt; r.radius += r.speed * dt;
    if (r.life > r.maxLife || r.radius > r.maxRadius) Object.assign(r, makePulsingRing());
    ctx.globalAlpha = I() * 0.3 * (1 - r.radius / r.maxRadius) * (0.6 + focusIntensity * 0.4);
    ctx.strokeStyle = color; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.arc(r.x, r.y, r.radius, 0, 6.28); ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

/* ── Floating binary / hex numbers ────────────────────────────────── */
function drawFloatingNumbers(color) {
  ctx.fillStyle = color;
  for (const n of floatingNums) {
    n.x += n.vx; n.y += n.vy; n.life += 1 / 60;
    if (n.life > n.maxLife || n.y < -30 || n.x < -80 || n.x > W + 80)
      Object.assign(n, makeFloatingNumber());
    const la = Math.min(1, n.life) * Math.max(0, 1 - n.life / n.maxLife);
    ctx.globalAlpha = I() * n.alpha * la;
    ctx.font = `${n.fontSize}px "Courier New",monospace`;
    ctx.fillText(n.text, n.x, n.y);
  }
  ctx.globalAlpha = 1;
}

/* ── Signal wave (oscilloscope) ───────────────────────────────────── */
function drawSignalWave(color) {
  const wy = H - 70, ww = 240, sx = 30;
  signalWave.shift();
  signalWave.push(
    Math.sin(elapsed * 3.7) * 0.5
    + Math.sin(elapsed * 7.1) * 0.3
    + Math.sin(elapsed * 13.3) * 0.15
    + focusIntensity * Math.sin(elapsed * 11) * 0.4
    + (Math.random() - 0.5) * 0.1
  );
  ctx.globalAlpha = I() * 0.45;
  ctx.strokeStyle = color; ctx.lineWidth = 1.2;
  ctx.beginPath();
  for (let i = 0; i < signalWave.length; i++) {
    const x = sx + (i / signalWave.length) * ww;
    const y = wy + signalWave[i] * 15;
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.globalAlpha = I() * 0.2;
  ctx.strokeRect(sx - 5, wy - 22, ww + 10, 44);
  ctx.globalAlpha = I() * 0.35;
  ctx.font = '8px "Courier New",monospace';
  ctx.fillStyle = color;
  ctx.fillText('SIGNAL_MONITOR', sx, wy - 26);
  ctx.globalAlpha = 1;
}

/* ── Orb connection web ───────────────────────────────────────────── */
function drawOrbWeb(color) {
  if (blobs.length < 2) return;
  orbScreenPositions = blobs.map(b => toScreen(b.mesh));
  ctx.strokeStyle = color; ctx.lineWidth = 0.5;
  for (let i = 0; i < orbScreenPositions.length; i++) {
    for (let j = i + 1; j < orbScreenPositions.length; j++) {
      const a = orbScreenPositions[i], b = orbScreenPositions[j];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (d > 600) continue;
      ctx.globalAlpha = I() * 0.1 * (1 - d / 600) * (0.6 + focusIntensity * 0.4);
      ctx.setLineDash([2, 6]);
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    }
  }
  ctx.setLineDash([]);
  ctx.fillStyle = color;
  for (const p of orbScreenPositions) {
    ctx.globalAlpha = I() * 0.3;
    ctx.beginPath(); ctx.arc(p.x, p.y, 2, 0, 6.28); ctx.fill();
  }
  ctx.globalAlpha = 1;
}

/* ── Cursor tracking reticle ──────────────────────────────────────── */
function drawCursorReticle(color) {
  const x = mouseX, y = mouseY;
  const r1 = 18 + Math.sin(elapsed * 2) * 3;
  const r2 = 28 + Math.cos(elapsed * 1.5) * 4;
  ctx.strokeStyle = color; ctx.lineWidth = 0.6;
  // Inner arcs (rotating)
  ctx.globalAlpha = I() * 0.25;
  const a1 = elapsed * 1.5;
  ctx.beginPath(); ctx.arc(x, y, r1, a1, a1 + 2.2); ctx.stroke();
  ctx.beginPath(); ctx.arc(x, y, r1, a1 + 3.14, a1 + 4.7); ctx.stroke();
  // Outer arcs (counter-rotating)
  ctx.globalAlpha = I() * 0.15;
  const a2 = -elapsed * 1.2;
  for (let k = 0; k < 3; k++) {
    ctx.beginPath(); ctx.arc(x, y, r2, a2 + k * 2.1, a2 + k * 2.1 + 1.1); ctx.stroke();
  }
  // Coordinate
  ctx.globalAlpha = I() * 0.3;
  ctx.fillStyle = color; ctx.font = '8px "Courier New",monospace';
  ctx.fillText(`${Math.floor(x)},${Math.floor(y)}`, x + r2 + 5, y - 5);
  ctx.globalAlpha = 1;
}

/* ── Edge glow pulses ─────────────────────────────────────────────── */
function drawEdgeGlow(color) {
  const edges = [
    [0, 0, 0, 30, 1.2],   // top
    [0, H-25, 0, H, 0.9], // bottom
  ];
  edges.forEach(([y1, y2, gy1, gy2, spd], idx) => {
    const pulse = 0.5 + 0.5 * Math.sin(elapsed * spd + idx);
    const g = ctx.createLinearGradient(0, y1, 0, y2);
    g.addColorStop(idx === 0 ? 0 : 1, color);
    g.addColorStop(idx === 0 ? 1 : 0, 'transparent');
    ctx.globalAlpha = I() * 0.06 * pulse;
    ctx.fillStyle = g;
    ctx.fillRect(0, y1, W, y2 - y1);
  });
  // Left edge
  const lp = 0.5 + 0.5 * Math.sin(elapsed * 1.5 + 2);
  const lg = ctx.createLinearGradient(0, 0, 20, 0);
  lg.addColorStop(0, color); lg.addColorStop(1, 'transparent');
  ctx.globalAlpha = I() * 0.05 * lp;
  ctx.fillStyle = lg; ctx.fillRect(0, 0, 20, H);
  ctx.globalAlpha = 1;
}

/* ── Spectrum bars ────────────────────────────────────────────────── */
function drawSpectrumBars(color) {
  const n = 16, bw = 3, gap = 2, bx = W - 120, by = H - 70, maxH = 25;
  ctx.fillStyle = color;
  for (let i = 0; i < n; i++) {
    const h = (0.3 + 0.7 * Math.abs(Math.sin(elapsed * (2 + i * 0.5) + i))) * maxH;
    ctx.globalAlpha = I() * 0.3;
    ctx.fillRect(bx + i * (bw + gap), by - h, bw, h);
  }
  ctx.globalAlpha = I() * 0.25;
  ctx.font = '7px "Courier New",monospace';
  ctx.fillText('FREQ_ANALYSIS', bx, by + 10);
  ctx.globalAlpha = 1;
}

/* ── Scrolling ticker ─────────────────────────────────────────────── */
let tickerOff = 0;
const TICKER = '  //  DONNY_VO::PORTFOLIO  //  SYSTEM_ONLINE  //  ALL_NODES_ACTIVE  //  RENDER_ENGINE:THREE.JS  //  STATUS:NOMINAL  //  BUILD:2025.06  //  ';
function drawTicker(color) {
  tickerOff = (tickerOff + 0.5 * (1 + focusIntensity)) % (TICKER.length * 6.5);
  ctx.globalAlpha = I() * 0.18;
  ctx.fillStyle = color; ctx.font = '9px "Courier New",monospace';
  const tw = TICKER.length * 6.5;
  ctx.fillText(TICKER, -tickerOff, 15);
  ctx.fillText(TICKER, -tickerOff + tw, 15);
  ctx.globalAlpha = 1;
}

/* ── Faint grid lines ─────────────────────────────────────────────── */
function drawGridLines(color) {
  ctx.strokeStyle = color; ctx.lineWidth = 0.3;
  ctx.globalAlpha = I() * 0.08;
  for (let x = 100; x < W; x += 200) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
  for (let y = 100; y < H; y += 200) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
  ctx.globalAlpha = 1;
}

/* ── Status block (top-left) ──────────────────────────────────────── */
function drawStatusBlock(color) {
  ctx.fillStyle = color;
  ctx.font = '500 9px "Courier New",monospace';
  const x = 35, y = 100;
  const lines = mode === 'focus' && focusedIdx >= 0
    ? ['SYSTEM_STATUS: ACTIVE', `PROJECT_ID: ${String(focusedIdx).padStart(3,'0')}`,
       `PROTOCOL: ${(PROJECTS[focusedIdx]?.tag||'').toUpperCase().replace(/ /g,'_')}`,
       `RENDER_T: ${elapsed.toFixed(1)}s`, `NODES: ${blobs.length} ONLINE`, '──────────────────────']
    : ['AMBIENT_SCAN: ACTIVE', `NODES_ONLINE: ${blobs.length}`,
       `UPTIME: ${elapsed.toFixed(1)}s`, `FPS: ${(60+Math.sin(elapsed)*3).toFixed(0)}`,
       '──────────────────────'];
  lines.forEach((l, i) => {
    const d = mode === 'focus' ? 0.12 * i : 0.08 * i;
    const cc = Math.min(l.length, Math.floor(Math.max(0, elapsed - d) * 50));
    if (cc <= 0) return;
    ctx.globalAlpha = I() * 0.4;
    ctx.fillText(l.substring(0, cc), x, y + i * 14);
  });
  ctx.globalAlpha = 1;
}

/* ── Bottom bar ───────────────────────────────────────────────────── */
function drawBottomBar(color) {
  const y = H - 35;
  ctx.globalAlpha = I() * 0.2;
  ctx.strokeStyle = color; ctx.lineWidth = 0.5;
  ctx.beginPath(); ctx.moveTo(25, y); ctx.lineTo(W - 25, y); ctx.stroke();
  // Animated dashes
  ctx.fillStyle = color;
  ctx.globalAlpha = I() * 0.55;
  ctx.fillRect(25 + (elapsed * 90) % (W - 50), y - 1, 25, 2);
  ctx.globalAlpha = I() * 0.35;
  ctx.fillRect(W - 25 - (elapsed * 60) % (W - 50), y - 1, 15, 2);
  // Text
  ctx.globalAlpha = I() * 0.3;
  ctx.font = '500 8px "Courier New",monospace';
  ctx.fillText('BOUNDARY_SCAN::NOMINAL', 25, y + 13);
  ctx.fillText(new Date().toISOString().substring(0, 19), W - 190, y + 13);
  ctx.globalAlpha = 1;
}

/* ── Focus: connector to panel ────────────────────────────────────── */
function drawConnector(color) {
  if (focusedIdx < 0 || focusedIdx >= blobs.length) return;
  const sp = toScreen(blobs[focusedIdx].mesh);
  orbScreenPos = sp;
  const px = W - 480, py = H * 0.35;
  ctx.globalAlpha = I() * 0.25 * focusIntensity;
  ctx.strokeStyle = color; ctx.lineWidth = 1;
  ctx.setLineDash([4, 6]);
  ctx.beginPath(); ctx.moveTo(sp.x, sp.y);
  const cpx = sp.x + (px - sp.x) * 0.6;
  ctx.bezierCurveTo(cpx, sp.y, cpx, py, px, py);
  ctx.stroke(); ctx.setLineDash([]);
  // Crosshair
  ctx.globalAlpha = I() * 0.2 * focusIntensity;
  const ch = 18;
  ctx.beginPath();
  ctx.moveTo(sp.x-ch,sp.y); ctx.lineTo(sp.x+ch,sp.y);
  ctx.moveTo(sp.x,sp.y-ch); ctx.lineTo(sp.x,sp.y+ch);
  ctx.stroke();
  ctx.beginPath(); ctx.arc(sp.x, sp.y, 8, 0, 6.28); ctx.stroke();
  ctx.globalAlpha = 1;
}

/* ── Focus: radar sweep ───────────────────────────────────────────── */
function drawRadarSweep(color) {
  if (focusedIdx < 0) return;
  const sp = orbScreenPos;
  const r = 50 + Math.sin(elapsed * 0.5) * 10;
  const ang = elapsed * 1.5;
  ctx.strokeStyle = color; ctx.lineWidth = 0.8;
  ctx.globalAlpha = I() * 0.1 * focusIntensity;
  ctx.beginPath(); ctx.arc(sp.x, sp.y, r, 0, 6.28); ctx.stroke();
  ctx.globalAlpha = I() * 0.06 * focusIntensity;
  ctx.beginPath(); ctx.arc(sp.x, sp.y, r + 20, 0, 6.28); ctx.stroke();
  // Sweep
  ctx.globalAlpha = I() * 0.2 * focusIntensity;
  ctx.beginPath(); ctx.moveTo(sp.x, sp.y);
  ctx.arc(sp.x, sp.y, r, ang, ang + 0.9); ctx.closePath();
  const g = ctx.createRadialGradient(sp.x, sp.y, 0, sp.x, sp.y, r);
  g.addColorStop(0, 'transparent'); g.addColorStop(1, color);
  ctx.fillStyle = g; ctx.fill();
  ctx.globalAlpha = 1;
}

/* ── Focus: orb coordinates ───────────────────────────────────────── */
function drawOrbCoords(color) {
  if (focusedIdx < 0 || focusedIdx >= blobs.length) return;
  const sp = orbScreenPos, proj = PROJECTS[focusedIdx];
  ctx.fillStyle = color; ctx.font = '500 9px "Courier New",monospace';
  const ox = sp.x + 25, oy = sp.y - 35;
  ctx.globalAlpha = I() * 0.4 * focusIntensity;
  ctx.fillText(`X:${sp.x.toFixed(0)} Y:${sp.y.toFixed(0)}`, ox, oy);
  ctx.fillText(`NODE_${String(focusedIdx).padStart(2,'0')} // ${proj.tag.toUpperCase()}`, ox, oy + 13);
  const bw = 60, pr = Math.sin(elapsed * 0.8) * 0.5 + 0.5;
  ctx.globalAlpha = I() * 0.15 * focusIntensity;
  ctx.fillRect(ox, oy + 18, bw, 3);
  ctx.globalAlpha = I() * 0.5 * focusIntensity;
  ctx.fillRect(ox, oy + 18, bw * pr, 3);
  ctx.globalAlpha = 1;
}

/* ── Horizontal CRT scanline sweep (full-screen) ─────────────────── */
let crtY = 0;
function drawCRTSweep(color) {
  crtY = (crtY + 1.5 * (1 + focusIntensity)) % H;
  const g = ctx.createLinearGradient(0, crtY - 40, 0, crtY + 40);
  g.addColorStop(0, 'transparent');
  g.addColorStop(0.5, color);
  g.addColorStop(1, 'transparent');
  ctx.globalAlpha = I() * 0.045;
  ctx.fillStyle = g;
  ctx.fillRect(0, crtY - 40, W, 80);
  ctx.globalAlpha = 1;
}

/* ── Tiny diagnostic boxes (top-right, bottom-left) ───────────────── */
function drawDiagBoxes(color) {
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.font = '7px "Courier New",monospace';

  // Top-right memory gauge (below header)
  const bx = W - 180, by = 100, bw = 100, bh = 6;
  ctx.globalAlpha = I() * 0.2;
  ctx.strokeRect(bx, by, bw, bh);
  const fill = 0.3 + 0.4 * (Math.sin(elapsed * 0.7) * 0.5 + 0.5) + focusIntensity * 0.25;
  ctx.globalAlpha = I() * 0.4;
  ctx.fillRect(bx + 1, by + 1, (bw - 2) * fill, bh - 2);
  ctx.globalAlpha = I() * 0.3;
  ctx.fillText(`MEM: ${(fill * 100).toFixed(0)}%`, bx, by - 4);

  // Second gauge
  const by2 = by + 20;
  const fill2 = 0.5 + 0.3 * Math.sin(elapsed * 1.1 + 1);
  ctx.globalAlpha = I() * 0.2;
  ctx.strokeRect(bx, by2, bw, bh);
  ctx.globalAlpha = I() * 0.4;
  ctx.fillRect(bx + 1, by2 + 1, (bw - 2) * fill2, bh - 2);
  ctx.globalAlpha = I() * 0.3;
  ctx.fillText(`GPU: ${(fill2 * 100).toFixed(0)}%`, bx, by2 - 4);

  ctx.globalAlpha = 1;
}

/* ── Noise / static dots ──────────────────────────────────────────── */
function drawNoise(color) {
  ctx.fillStyle = color;
  const count = 60 + Math.floor(focusIntensity * 80);
  for (let i = 0; i < count; i++) {
    ctx.globalAlpha = I() * rand(0.02, 0.09);
    const s = rand(0.5, 2);
    ctx.fillRect(rand(0, W), rand(0, H), s, s);
  }
  ctx.globalAlpha = 1;
}

/* ══════════════════════════════════════════════════════════════════
   MAIN TICK
   ══════════════════════════════════════════════════════════════════ */
function tick() {
  rafId = requestAnimationFrame(tick);
  elapsed += 1 / 60;

  // Lerp focus intensity
  const target = mode === 'focus' ? 1 : 0;
  focusIntensity += (target - focusIntensity) * 0.035;

  ctx.clearRect(0, 0, W, H);

  const accent = getAccentColors();
  const c = new THREE.Color(accent.wire);
  const color = `#${c.getHexString()}`;

  // ─── Always-on layers ───
  drawCRTSweep(color);
  drawGridLines(color);
  drawEdgeGlow(color);
  drawNoise(color);
  drawCornerBrackets(color);
  drawGridDots(color);
  drawScanLines(color);
  drawDataFragments(color);
  drawDataStreams(color);
  drawHexCascades(color);
  drawGlitchBlocks(color);
  drawPulsingRings(color);
  drawFloatingNumbers(color);
  drawOrbWeb(color);
  drawSignalWave(color);
  drawCursorReticle(color);
  drawStatusBlock(color);
  drawBottomBar(color);
  drawSpectrumBars(color);
  drawTicker(color);
  drawDiagBoxes(color);

  // ─── Focus-only layers ───
  if (focusIntensity > 0.01) {
    drawConnector(color);
    drawRadarSweep(color);
    drawOrbCoords(color);
  }
}

/* ── Init ─────────────────────────────────────────────────────────── */
export function initHud() {
  resizeHud();
  canvas.classList.add('active');   // always visible
  tick();                           // start immediately
}
