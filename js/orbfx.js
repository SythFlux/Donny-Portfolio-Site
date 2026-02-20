/* ═══════════════════════════════════════════════════════════════════
   orbfx.js — Unique per-orb dotted decorations
   Every effect is 100 % points-based to match the main orb aesthetic.
   Always visible at idle, glow brighter + speed up on hover.

   0  About Me      — Saturn dotted rings (3 tilted rings)
   1  Flex Platform  — Orbiting dotted mini-moons + orbit trails
   2  Neural Canvas  — Floating dotted core + orbiting spark cloud
   3  UrbanFlow      — Atom: dotted elliptical orbits + electron dots
   4  SoundForge     — Expanding dotted pulse rings (sound waves)
   5  CryptoLens     — Double-helix spiral of dots + rung dots
   6  MediSync       — Dotted icosahedron shield cage
   ═══════════════════════════════════════════════════════════════════ */

import * as THREE from 'three';
import { blobs } from './orbs.js';
import { isDark, getTheme } from './darkmode.js';

/* ── Shared helpers ───────────────────────────────────────────────── */
function accentColor() {
  const s = getComputedStyle(document.documentElement)
    .getPropertyValue('--accent').trim();
  return new THREE.Color(s || '#5588cc');
}

/** Screen-space dot material — size is in PIXELS so dots are always visible */
function dotMat(color, opacity, size) {
  return new THREE.PointsMaterial({
    color, size, sizeAttenuation: false,
    transparent: true, opacity, depthWrite: false,
    blending: isDark ? THREE.AdditiveBlending : THREE.NormalBlending,
  });
}

/** All materials — kept in a Set so we can bulk-update blending on theme change */
const allMats = new Set();
function trackMat(mat) { allMats.add(mat); return mat; }

/** Create a ring of dots as a BufferGeometry */
function dotRingGeo(radius, count) {
  const pts = [];
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    pts.push(Math.cos(a) * radius, 0, Math.sin(a) * radius);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  return geo;
}

/** Create a dotted ellipse */
function dotEllipseGeo(rx, ry, count) {
  const pts = [];
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    pts.push(Math.cos(a) * rx, 0, Math.sin(a) * ry);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  return geo;
}

/* ── Per-orb decoration state ─────────────────────────────────────── */
const fx = [];
let _ready = false;

/* idle / hover opacity range — always clearly visible */
const IDLE = 0.7;
const HOVER = 1.0;
function vis(base, hoverT) { return base * (IDLE + (HOVER - IDLE) * hoverT); }

/* ═══════════════════════════════════════════════════════════════════
   0 — SATURN DOTTED RINGS
   ═══════════════════════════════════════════════════════════════════ */
function createRings(b) {
  const r = b.baseR;
  const rings = [];
  const defs = [
    { radius: r * 1.6,  tilt: 0.4,  dots: 120, sz: 3.0 },
    { radius: r * 1.9,  tilt: 0.28, dots: 160, sz: 2.5 },
    { radius: r * 2.2,  tilt: 0.52, dots: 100, sz: 2.0 },
  ];

  defs.forEach(d => {
    const geo = dotRingGeo(d.radius, d.dots);
    const mat = dotMat(0x88bbff, IDLE * 0.85, d.sz);
    trackMat(mat);
    const pts = new THREE.Points(geo, mat);
    pts.rotation.x = d.tilt;
    pts.rotation.z = d.tilt * 0.4;
    b.mesh.add(pts);
    rings.push({ pts, mat, speed: 0.12 + Math.random() * 0.08 });
  });

  return { type: 'rings', rings };
}

function updateRings(data, b, t, dt) {
  data.rings.forEach((r, i) => {
    r.mat.opacity = vis(0.7 + i * 0.08, b.hoverT);
    r.pts.rotation.y += r.speed * (1 + b.hoverT * 3) * dt;
  });
}

/* ═══════════════════════════════════════════════════════════════════
   1 — ORBITING DOTTED MOONS
   ═══════════════════════════════════════════════════════════════════ */
function createMoons(b) {
  const r = b.baseR;
  const moons = [];
  const defs = [
    { orbit: r * 1.8, speed: 0.9,  sz: r * 0.18, tilt: 0.45, phase: 0 },
    { orbit: r * 2.2, speed:-0.65, sz: r * 0.13, tilt:-0.35, phase: 2.1 },
    { orbit: r * 2.6, speed: 0.45, sz: r * 0.10, tilt: 0.7,  phase: 4.2 },
  ];

  defs.forEach(d => {
    // Dotted orbit trail
    const trailGeo = dotRingGeo(d.orbit, 100);
    const trailMat = dotMat(0x88bbff, IDLE * 0.6, 2.0);
    trackMat(trailMat);
    const trail = new THREE.Points(trailGeo, trailMat);
    trail.rotation.x = d.tilt;
    b.mesh.add(trail);

    // Moon — icosahedron rendered as dots
    const moonGeo = new THREE.IcosahedronGeometry(d.sz, 2);
    const moonMat = dotMat(0xaaddff, IDLE * 0.9, 3.0);
    trackMat(moonMat);
    const moonPts = new THREE.Points(moonGeo, moonMat);

    const pivot = new THREE.Group();
    pivot.rotation.x = d.tilt;
    pivot.add(moonPts);
    moonPts.position.set(d.orbit, 0, 0);
    b.mesh.add(pivot);

    moons.push({ pivot, moonPts, moonMat, trail, trailMat, angle: d.phase, ...d });
  });

  return { type: 'moons', moons };
}

function updateMoons(data, b, t, dt) {
  data.moons.forEach(m => {
    const spd = m.speed * (1 + b.hoverT * 2);
    m.angle += spd * dt;
    m.pivot.rotation.y = m.angle;
    m.moonMat.opacity = vis(0.85, b.hoverT);
    m.trailMat.opacity = vis(0.55, b.hoverT);
  });
}

/* ═══════════════════════════════════════════════════════════════════
   2 — FLOATING CORE + SPARK CLOUD
   The dotted sphere lifts on hover revealing a bright inner core
   made of dots, surrounded by orbiting spark dots.
   ═══════════════════════════════════════════════════════════════════ */
function createSplitCore(b) {
  const r = b.baseR;

  // Inner core — dense dot sphere
  const coreGeo = new THREE.IcosahedronGeometry(r * 0.38, 3);
  const coreMat = dotMat(0xff8844, IDLE * 0.7, 3.5);
  trackMat(coreMat);
  const core = new THREE.Points(coreGeo, coreMat);
  b.mesh.add(core);

  // Spark cloud — random dots in a shell around the core
  const sparkPts = [];
  const SPARKS = 80;
  for (let i = 0; i < SPARKS; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi   = Math.acos(2 * Math.random() - 1);
    const rad   = r * (0.25 + Math.random() * 0.25);
    sparkPts.push(
      rad * Math.sin(phi) * Math.cos(theta),
      rad * Math.sin(phi) * Math.sin(theta),
      rad * Math.cos(phi),
    );
  }
  const sparkGeo = new THREE.BufferGeometry();
  sparkGeo.setAttribute('position', new THREE.Float32BufferAttribute(sparkPts, 3));
  const sparkMat = dotMat(0xffaa66, IDLE * 0.65, 2.5);
  trackMat(sparkMat);
  const sparks = new THREE.Points(sparkGeo, sparkMat);
  b.mesh.add(sparks);

  return { type: 'split', core, coreMat, sparks, sparkMat, splitAmt: 0, baseR: r };
}

function updateSplit(data, b, t, dt) {
  const hTarget = b.hovered ? 1.0 : 0.0;
  data.splitAmt += (hTarget - data.splitAmt) * 0.06;
  const s = data.splitAmt;

  // Main sphere lifts up on hover
  const offset = s * data.baseR * 0.4;
  b.points.position.y = offset;
  if (b.hitMesh) b.hitMesh.position.y = offset;

  // Core visible in gap — always a little visible, much more on hover
  data.coreMat.opacity = vis(0.7, b.hoverT) * (0.4 + s * 0.6);
    data.core.rotation.y = t * 0.6;
    data.core.rotation.x = t * 0.25;
    data.core.scale.setScalar(0.85 + s * 0.35);

  // Sparks orbit and glow
  data.sparkMat.opacity = vis(0.65, b.hoverT) * (0.4 + s * 0.6);
  data.sparks.rotation.y = t * 0.9;
  data.sparks.rotation.x = t * 0.2;
}

/* ═══════════════════════════════════════════════════════════════════
   3 — ATOM: DOTTED ELLIPTICAL ORBITS + ELECTRONS
   ═══════════════════════════════════════════════════════════════════ */
function createAtom(b) {
  const r = b.baseR;
  const electrons = [];
  const defs = [
    { rx: r * 2.0, ry: r * 1.3, tiltX: 0.0,  tiltZ: 0.0,  speed: 2.2, phase: 0 },
    { rx: r * 1.8, ry: r * 1.6, tiltX: 1.05, tiltZ: 0.3,  speed:-1.7, phase: 2.1 },
    { rx: r * 2.3, ry: r * 1.1, tiltX:-0.6,  tiltZ: 1.2,  speed: 1.3, phase: 4.0 },
  ];

  defs.forEach(d => {
    // Dotted orbit ellipse
    const pathGeo = dotEllipseGeo(d.rx, d.ry, 120);
    const pathMat = dotMat(0x44ddff, IDLE * 0.6, 2.0);
    trackMat(pathMat);
    const path = new THREE.Points(pathGeo, pathMat);
    path.rotation.x = d.tiltX;
    path.rotation.z = d.tiltZ;
    b.mesh.add(path);

    // Electron — single bright dot (large)
    const eGeo = new THREE.BufferGeometry();
    eGeo.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0], 3));
    const eMat = dotMat(0x88ffff, IDLE * 0.9, 6.0);
    trackMat(eMat);
    const electron = new THREE.Points(eGeo, eMat);
    path.add(electron);

    // Electron trail — 6 dots fading behind
    const trailPts = [];
    for (let i = 0; i < 6; i++) trailPts.push(0, 0, 0);
    const trailGeo = new THREE.BufferGeometry();
    trailGeo.setAttribute('position', new THREE.Float32BufferAttribute(trailPts, 3));
    const trailMat = dotMat(0x88ffff, IDLE * 0.55, 4.0);
    trackMat(trailMat);
    const trail = new THREE.Points(trailGeo, trailMat);
    path.add(trail);

    electrons.push({ path, pathMat, electron, eMat, trail, trailGeo, trailMat, angle: d.phase, ...d });
  });

  return { type: 'atom', electrons };
}

function updateAtom(data, b, t, dt) {
  data.electrons.forEach(e => {
    const spd = e.speed * (1 + b.hoverT * 2);
    e.angle += spd * dt;
    const a = e.angle;
    const ex = Math.cos(a) * e.rx;
    const ez = Math.sin(a) * e.ry;
    e.electron.position.set(ex, 0, ez);

    // Update trail positions
    const pos = e.trailGeo.attributes.position;
    for (let i = 0; i < 6; i++) {
      const ta = a - (i + 1) * 0.12;
      pos.setXYZ(i, Math.cos(ta) * e.rx, 0, Math.sin(ta) * e.ry);
    }
    pos.needsUpdate = true;

    e.pathMat.opacity = vis(0.6, b.hoverT);
    e.eMat.opacity    = vis(0.9, b.hoverT);
    e.trailMat.opacity = vis(0.55, b.hoverT);
  });
}

/* ═══════════════════════════════════════════════════════════════════
   4 — PULSE RINGS (expanding dotted sound-wave circles)
   ═══════════════════════════════════════════════════════════════════ */
function createPulseRings(b) {
  const r = b.baseR;
  const N = 5;
  const rings = [];

  for (let i = 0; i < N; i++) {
    // Each ring is a circle of dots that will be scaled outward
    const geo = dotRingGeo(1.0, 80); // unit circle, scaled in update
    const mat = dotMat(0x88bbff, IDLE * 0.7, 2.5);
    trackMat(mat);
    const pts = new THREE.Points(geo, mat);
    pts.rotation.x = -Math.PI / 2; // lie flat
    b.mesh.add(pts);
    rings.push({ pts, mat, progress: i / N });
  }

  return { type: 'pulse', rings, baseR: r };
}

function updatePulse(data, b, t, dt) {
  const speed = 0.4 + b.hoverT * 0.3;

  data.rings.forEach(r => {
    r.progress += dt * speed;
    if (r.progress >= 1.0) r.progress -= 1.0;

    const scale = data.baseR * (1.2 + r.progress * 2.0);
    r.pts.scale.setScalar(scale);

    const fade = 1.0 - r.progress;
    r.mat.opacity = vis(0.75, b.hoverT) * fade * fade;
  });
}

/* ═══════════════════════════════════════════════════════════════════
   5 — DOUBLE HELIX (two spirals of dots + rung dots)
   ═══════════════════════════════════════════════════════════════════ */
function createHelix(b) {
  const r = b.baseR;
  const DOTS = 80;
  const HEIGHT = r * 3.8;
  const RADIUS = r * 1.5;
  const strands = [];

  for (let s = 0; s < 2; s++) {
    const pts = [];
    const off = s * Math.PI;
    for (let i = 0; i < DOTS; i++) {
      const frac = i / DOTS;
      const y = (frac - 0.5) * HEIGHT;
      const a = frac * Math.PI * 4 + off;
      pts.push(Math.cos(a) * RADIUS, y, Math.sin(a) * RADIUS);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    const mat = dotMat(s === 0 ? 0x88ddff : 0xffaa44, IDLE * 0.75, 3.0);
    trackMat(mat);
    const points = new THREE.Points(geo, mat);
    b.mesh.add(points);
    strands.push({ points, mat });
  }

  // Rung dots — dots along connecting bars between strands
  const rungPts = [];
  for (let i = 0; i < DOTS; i += 3) {
    const frac = i / DOTS;
    const y = (frac - 0.5) * HEIGHT;
    const a0 = frac * Math.PI * 4;
    const a1 = a0 + Math.PI;

    // 4 dots between each pair
    for (let j = 0; j <= 3; j++) {
      const f = j / 3;
      const x = Math.cos(a0) * RADIUS * (1 - f) + Math.cos(a1) * RADIUS * f;
      const z = Math.sin(a0) * RADIUS * (1 - f) + Math.sin(a1) * RADIUS * f;
      rungPts.push(x, y, z);
    }
  }
  const rungGeo = new THREE.BufferGeometry();
  rungGeo.setAttribute('position', new THREE.Float32BufferAttribute(rungPts, 3));
  const rungMat = dotMat(0x88bbff, IDLE * 0.55, 2.0);
  trackMat(rungMat);
  const rungs = new THREE.Points(rungGeo, rungMat);
  b.mesh.add(rungs);

  return { type: 'helix', strands, rungs, rungMat, rotY: 0 };
}

function updateHelix(data, b, t, dt) {
  data.rotY += 0.25 * (1 + b.hoverT * 1.5) * dt;
  data.strands.forEach(s => {
    s.mat.opacity = vis(0.75, b.hoverT);
    s.points.rotation.y = data.rotY;
  });
  data.rungMat.opacity = vis(0.55, b.hoverT);
  data.rungs.rotation.y = data.rotY;
}

/* ═══════════════════════════════════════════════════════════════════
   6 — DOTTED SHIELD CAGE (icosahedron vertices + edge dots)
   ═══════════════════════════════════════════════════════════════════ */
function createShield(b) {
  const r = b.baseR;

  // Inner cage — icosahedron subdivision 1, edge dots
  const ico1 = new THREE.IcosahedronGeometry(r * 1.6, 1);
  const edges1 = new THREE.EdgesGeometry(ico1);
  // Sample dots along every edge
  const edgePts1 = sampleEdgeDots(edges1, 4);
  const edgeGeo1 = new THREE.BufferGeometry();
  edgeGeo1.setAttribute('position', new THREE.Float32BufferAttribute(edgePts1, 3));
  const edgeMat1 = dotMat(0x88bbff, IDLE * 0.7, 2.5);
  trackMat(edgeMat1);
  const edgeDots1 = new THREE.Points(edgeGeo1, edgeMat1);
  b.mesh.add(edgeDots1);

  // Vertex dots (bright)
  const vertGeo1 = new THREE.BufferGeometry();
  vertGeo1.setAttribute('position', ico1.attributes.position.clone());
  const vertMat1 = dotMat(0xaaddff, IDLE * 0.85, 4.5);
  trackMat(vertMat1);
  const vertDots1 = new THREE.Points(vertGeo1, vertMat1);
  b.mesh.add(vertDots1);

  // Outer cage — icosahedron subdivision 0, sparser
  const ico2 = new THREE.IcosahedronGeometry(r * 2.1, 0);
  const edges2 = new THREE.EdgesGeometry(ico2);
  const edgePts2 = sampleEdgeDots(edges2, 3);
  const edgeGeo2 = new THREE.BufferGeometry();
  edgeGeo2.setAttribute('position', new THREE.Float32BufferAttribute(edgePts2, 3));
  const edgeMat2 = dotMat(0x88bbff, IDLE * 0.5, 2.0);
  trackMat(edgeMat2);
  const edgeDots2 = new THREE.Points(edgeGeo2, edgeMat2);
  b.mesh.add(edgeDots2);

  const vertGeo2 = new THREE.BufferGeometry();
  vertGeo2.setAttribute('position', ico2.attributes.position.clone());
  const vertMat2 = dotMat(0xaaddff, IDLE * 0.65, 3.5);
  trackMat(vertMat2);
  const vertDots2 = new THREE.Points(vertGeo2, vertMat2);
  b.mesh.add(vertDots2);

  return {
    type: 'shield',
    edgeDots1, edgeMat1, vertDots1, vertMat1,
    edgeDots2, edgeMat2, vertDots2, vertMat2,
  };
}

/** Sample N dots along each edge segment of an EdgesGeometry */
function sampleEdgeDots(edgesGeo, dotsPerEdge) {
  const ePos = edgesGeo.attributes.position;
  const pts = [];
  for (let i = 0; i < ePos.count; i += 2) {
    const ax = ePos.getX(i), ay = ePos.getY(i), az = ePos.getZ(i);
    const bx = ePos.getX(i + 1), by = ePos.getY(i + 1), bz = ePos.getZ(i + 1);
    for (let j = 0; j <= dotsPerEdge; j++) {
      const f = j / dotsPerEdge;
      pts.push(ax + (bx - ax) * f, ay + (by - ay) * f, az + (bz - az) * f);
    }
  }
  return pts;
}

function updateShield(data, b, t, dt) {
  const v1 = vis(0.7, b.hoverT);
  const v2 = vis(0.5, b.hoverT);

  data.edgeMat1.opacity = v1;
  data.vertMat1.opacity = vis(0.85, b.hoverT);
  data.edgeMat2.opacity = v2;
  data.vertMat2.opacity = vis(0.65, b.hoverT);

  // Slow counter-rotate
  const ry1 = t * 0.12, rx1 = t * 0.07;
  data.edgeDots1.rotation.set(rx1, ry1, 0);
  data.vertDots1.rotation.set(rx1, ry1, 0);

  const ry2 = -t * 0.08, rz2 = t * 0.05;
  data.edgeDots2.rotation.set(0, ry2, rz2);
  data.vertDots2.rotation.set(0, ry2, rz2);

  // Pulse
  const p = 1.0 + Math.sin(t * 2.5) * 0.025 * (0.3 + b.hoverT * 0.7);
  data.edgeDots1.scale.setScalar(p);
  data.vertDots1.scale.setScalar(p);
}

/* ═══════════════════════════════════════════════════════════════════
   PUBLIC API
   ═══════════════════════════════════════════════════════════════════ */

export function initOrbFx() {
  if (_ready) return;
  _ready = true;

  const creators = [
    createRings,      // 0
    createMoons,      // 1
    createSplitCore,  // 2
    createAtom,       // 3
    createPulseRings, // 4
    createHelix,      // 5
    createShield,     // 6
  ];

  blobs.forEach((b, i) => {
    if (creators[i]) fx[i] = creators[i](b);
  });
}

export function updateOrbFx(t, dt) {
  if (!_ready) return;

  const updaters = [updateRings, updateMoons, updateSplit, updateAtom,
                    updatePulse, updateHelix, updateShield];
  const accent = accentColor();

  const theme = getTheme();
  const hoverCol = new THREE.Color(theme.wireHover);

  blobs.forEach((b, i) => {
    const data = fx[i];
    if (!data || !updaters[i]) return;
    updaters[i](data, b, t, dt);
    recolorFx(data, accent, hoverCol, b.hoverT);
  });
}

let _lastDark = isDark;
function recolorFx(data, accent, hoverCol, hoverT) {
  /* Base palette */
  const baseBright = isDark
    ? accent.clone().lerp(new THREE.Color(0xffffff), 0.4)
    : accent.clone().lerp(new THREE.Color(0x000000), 0.1);
  const baseDim = isDark
    ? accent.clone().lerp(new THREE.Color(0x000000), 0.15)
    : accent.clone().lerp(new THREE.Color(0xffffff), 0.3);

  /* Hover palette — lerp toward the orb's highlighted color */
  const hBright = hoverCol.clone().lerp(new THREE.Color(isDark ? 0xffffff : 0x000000), 0.15);
  const hDim    = hoverCol.clone().lerp(new THREE.Color(isDark ? 0x000000 : 0xffffff), 0.25);

  /* Blend base → hover based on hoverT */
  const bright = baseBright.lerp(hBright, hoverT);
  const dim    = baseDim.lerp(hDim, hoverT);

  /* If theme changed, flip blending mode on all tracked materials */
  if (_lastDark !== isDark) {
    _lastDark = isDark;
    const blend = isDark ? THREE.AdditiveBlending : THREE.NormalBlending;
    allMats.forEach(m => { m.blending = blend; m.needsUpdate = true; });
  }

  switch (data.type) {
    case 'rings':
      data.rings.forEach(r => r.mat.color.copy(bright));
      break;
    case 'moons':
      data.moons.forEach(m => { m.moonMat.color.copy(bright); m.trailMat.color.copy(dim); });
      break;
    case 'split':
      data.coreMat.color.copy(accent);
      data.sparkMat.color.copy(bright);
      break;
    case 'atom':
      data.electrons.forEach(e => {
        e.pathMat.color.copy(dim);
        e.eMat.color.copy(bright);
        e.trailMat.color.copy(accent);
      });
      break;
    case 'pulse':
      data.rings.forEach(r => r.mat.color.copy(accent));
      break;
    case 'helix':
      data.strands[0].mat.color.copy(bright);
      data.strands[1].mat.color.copy(accent);
      data.rungMat.color.copy(dim);
      break;
    case 'shield':
      data.edgeMat1.color.copy(accent);
      data.vertMat1.color.copy(bright);
      data.edgeMat2.color.copy(dim);
      data.vertMat2.color.copy(bright);
      break;
  }
}
