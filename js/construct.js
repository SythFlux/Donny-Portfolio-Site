/* ═══════════════════════════════════════════════════════════════════
   construct.js — Grand mechanical armillary construct (background)
   Massive, hyper-detailed dotted mechanical structure inspired by
   technical blueprint / sci-fi armillary sphere artwork.
   Multi-layered rings with parallel tracks, thick defined bands,
   central spire with structural detail, gear teeth, radial spokes
   with measurement marks, concentric disc layers, and debris.
   ═══════════════════════════════════════════════════════════════════ */

import * as THREE from 'three';
import { isDark } from './darkmode.js';

let group;
let mats = [];       // all materials
let time = 0;
let spinLayers = [];  // { pts, speed, axis }
let orbiters = [];    // { mesh, radius, angle, speed, tiltX, tiltZ, yOff }
let gears = [];       // { pivot, speed } — spinning gear wheels

/* ── helpers ──────────────────────────────────────────────────────── */
function dotMat(color, opacity, size) {
  const m = new THREE.PointsMaterial({
    color, size,
    sizeAttenuation: false,
    transparent: true,
    opacity,
    depthWrite: false,
    blending: THREE.NormalBlending,
  });
  m._baseOpacity = opacity;   // store so we can boost in dark mode
  m._baseColor = color;       // store base color for theme switching
  mats.push(m);
  return m;
}

function makePts(arr, mat) {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3));
  return new THREE.Points(geo, mat);
}

/** Dense ring — multiple parallel tracks to make it look THICK */
function thickRing(radius, width, tracks, dotsPerTrack, noise) {
  const pts = [];
  for (let t = 0; t < tracks; t++) {
    const r = radius - width / 2 + (width * t / (tracks - 1 || 1));
    for (let i = 0; i < dotsPerTrack; i++) {
      const a = (i / dotsPerTrack) * Math.PI * 2;
      pts.push(
        Math.cos(a) * r + (Math.random() - 0.5) * noise,
        (Math.random() - 0.5) * noise * 0.5,
        Math.sin(a) * r + (Math.random() - 0.5) * noise,
      );
    }
  }
  return pts;
}

/** Gear teeth around a ring */
function gearTeeth(radius, teethCount, toothH, dotsPerTooth) {
  const pts = [];
  for (let i = 0; i < teethCount; i++) {
    const a = (i / teethCount) * Math.PI * 2;
    const nx = Math.cos(a), nz = Math.sin(a);
    for (let d = 0; d < dotsPerTooth; d++) {
      const t = d / dotsPerTooth;
      pts.push(
        nx * (radius + toothH * t) + (Math.random() - 0.5) * 0.03,
        (Math.random() - 0.5) * 0.06,
        nz * (radius + toothH * t) + (Math.random() - 0.5) * 0.03,
      );
    }
  }
  return pts;
}

/** Dotted line between two 3D points */
function linePts(ax, ay, az, bx, by, bz, count) {
  const pts = [];
  for (let i = 0; i <= count; i++) {
    const t = i / count;
    pts.push(
      ax + (bx - ax) * t + (Math.random() - 0.5) * 0.02,
      ay + (by - ay) * t + (Math.random() - 0.5) * 0.02,
      az + (bz - az) * t + (Math.random() - 0.5) * 0.02,
    );
  }
  return pts;
}

/** Concentric disc fill */
function discFill(rMin, rMax, ringCount, dotsPerRing) {
  const pts = [];
  for (let r = 0; r < ringCount; r++) {
    const rad = rMin + (rMax - rMin) * (r / ringCount);
    const cnt = Math.floor(dotsPerRing * (0.3 + 0.7 * r / ringCount));
    for (let i = 0; i < cnt; i++) {
      const a = (i / cnt) * Math.PI * 2 + r * 0.17;
      pts.push(Math.cos(a) * rad, (Math.random() - 0.5) * 0.04, Math.sin(a) * rad);
    }
  }
  return pts;
}

/** Arc (partial ring) */
function arcPts(radius, startA, endA, count) {
  const pts = [];
  for (let i = 0; i < count; i++) {
    const a = startA + (endA - startA) * (i / count);
    pts.push(
      Math.cos(a) * radius + (Math.random() - 0.5) * 0.02,
      (Math.random() - 0.5) * 0.03,
      Math.sin(a) * radius + (Math.random() - 0.5) * 0.02,
    );
  }
  return pts;
}

/** Sphere surface dots */
function sphereDots(radius, count) {
  const pts = [];
  for (let i = 0; i < count; i++) {
    const y = (Math.random() * 2 - 1) * radius;
    const rr = Math.sqrt(radius * radius - y * y);
    const a = Math.random() * Math.PI * 2;
    pts.push(Math.cos(a) * rr, y, Math.sin(a) * rr);
  }
  return pts;
}

/** Full 3D gear wheel — thick cylindrical body with visible depth.
 *  Everything in local XZ plane with Y as the thickness axis.
 *  @param depth - total thickness of the gear body */
function gearWheel(radius, teethCount, toothH, rimTracks, dotsPerTrack, spokeCount, depth) {
  if (!depth) depth = radius * 0.35;          // default depth proportional to size
  const halfD = depth / 2;
  const layers = Math.max(3, Math.ceil(depth / 0.12)); // Y slices
  const pts = [];

  // ── Helper: push a flat ring at a given Y ──
  function ringAt(r, dots, yVal, noise) {
    for (let i = 0; i < dots; i++) {
      const a = (i / dots) * Math.PI * 2;
      pts.push(
        Math.cos(a) * r + (Math.random() - 0.5) * noise,
        yVal + (Math.random() - 0.5) * noise * 0.3,
        Math.sin(a) * r + (Math.random() - 0.5) * noise,
      );
    }
  }

  // ── OUTER RIM — stacked rings at every Y layer ──
  for (let ly = 0; ly < layers; ly++) {
    const y = -halfD + (depth * ly / (layers - 1));
    for (let t = 0; t < rimTracks; t++) {
      const r = radius - 0.05 * rimTracks / 2 + 0.05 * t;
      ringAt(r, dotsPerTrack, y, 0.02);
    }
  }

  // ── SIDE WALLS — filled disc faces (top & bottom) ──
  [halfD, -halfD].forEach(y => {
    // Concentric fill rings from hub to rim
    const fillRings = Math.max(4, Math.floor(radius * 2.5));
    const hubR = radius * 0.18;
    for (let fr = 0; fr < fillRings; fr++) {
      const r = hubR + (radius - hubR) * (fr / fillRings);
      const cnt = Math.floor(dotsPerTrack * 0.4 * (0.3 + 0.7 * fr / fillRings));
      ringAt(r, cnt, y, 0.02);
    }
  });

  // ── TEETH — extruded across full depth ──
  const toothLayers = Math.max(2, Math.ceil(layers * 0.6));
  for (let ly = 0; ly < toothLayers; ly++) {
    const y = -halfD + (depth * ly / (toothLayers - 1));
    for (let i = 0; i < teethCount; i++) {
      const a = (i / teethCount) * Math.PI * 2;
      const nx = Math.cos(a), nz = Math.sin(a);
      // Tooth body
      for (let d = 0; d < 6; d++) {
        const t = d / 6;
        pts.push(
          nx * (radius + toothH * t) + (Math.random() - 0.5) * 0.02,
          y + (Math.random() - 0.5) * 0.02,
          nz * (radius + toothH * t) + (Math.random() - 0.5) * 0.02,
        );
      }
      // Tooth cap (wider tip)
      const perpx = -nz * toothH * 0.28, perpz = nx * toothH * 0.28;
      for (let d = 0; d < 3; d++) {
        const t = d / 2 - 0.5;
        pts.push(
          nx * (radius + toothH) + perpx * t,
          y + (Math.random() - 0.5) * 0.02,
          nz * (radius + toothH) + perpz * t,
        );
      }
    }
  }

  // ── CENTRAL HUB — thick cylinder at centre ──
  const hubR = radius * 0.18;
  for (let ly = 0; ly < layers; ly++) {
    const y = -halfD + (depth * ly / (layers - 1));
    ringAt(hubR, 30, y, 0.015);
    ringAt(hubR * 0.5, 12, y, 0.01);
  }
  // Hub fill on faces
  [halfD, -halfD].forEach(y => {
    for (let i = 0; i < 15; i++) {
      const a = Math.random() * Math.PI * 2, r2 = Math.random() * hubR * 0.8;
      pts.push(Math.cos(a) * r2, y + (Math.random() - 0.5) * 0.01, Math.sin(a) * r2);
    }
  });

  // ── SPOKES — extruded beams connecting hub to rim ──
  for (let s = 0; s < spokeCount; s++) {
    const a = (s / spokeCount) * Math.PI * 2;
    const nx = Math.cos(a), nz = Math.sin(a);
    const count = Math.floor(radius * 7);
    for (let ly = 0; ly < Math.min(layers, 3); ly++) {
      const y = -halfD + (depth * ly / 2);
      for (let i = 0; i <= count; i++) {
        const t = i / count;
        const r2 = hubR + (radius - hubR) * t;
        pts.push(
          nx * r2 + (Math.random() - 0.5) * 0.015,
          y + (Math.random() - 0.5) * 0.02,
          nz * r2 + (Math.random() - 0.5) * 0.015,
        );
      }
    }
  }

  // ── INNER DECORATIVE RING (mid-radius, full depth) ──
  const midR = (hubR + radius) * 0.5;
  for (let ly = 0; ly < Math.min(layers, 3); ly++) {
    const y = -halfD + (depth * ly / 2);
    const midDots = Math.floor(dotsPerTrack * 0.5);
    ringAt(midR, midDots, y, 0.015);
  }

  // ── VOLUME FILL — scattered dots inside the body for solidity ──
  const fillCount = Math.floor(radius * radius * 8);
  for (let i = 0; i < fillCount; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = hubR + Math.random() * (radius - hubR);
    const y = (Math.random() - 0.5) * depth;
    pts.push(Math.cos(a) * r, y, Math.sin(a) * r);
  }

  return pts;
}

/** Dotted pipe/shaft connecting two 3D points — thick cylindrical tube */
function pipePts(ax, ay, az, bx, by, bz, count, thickness) {
  const pts = [];
  const dx = bx - ax, dy = by - ay, dz = bz - az;
  const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
  if (len < 0.001) return pts;
  // Build a local frame
  const ux = dx / len, uy = dy / len, uz = dz / len;
  // Get a perpendicular vector
  let px, py, pz;
  if (Math.abs(uy) < 0.9) { px = -uz; py = 0; pz = ux; }
  else { px = 1; py = 0; pz = 0; }
  const pl = Math.sqrt(px * px + py * py + pz * pz);
  px /= pl; py /= pl; pz /= pl;
  // Second perp
  const qx = uy * pz - uz * py, qy = uz * px - ux * pz, qz = ux * py - uy * px;

  // 4 parallel strands along the pipe for more visible body
  const strands = 4;
  for (let s = 0; s < strands; s++) {
    const sa = (s / strands) * Math.PI * 2;
    const offX = (px * Math.cos(sa) + qx * Math.sin(sa)) * thickness;
    const offY = (py * Math.cos(sa) + qy * Math.sin(sa)) * thickness;
    const offZ = (pz * Math.cos(sa) + qz * Math.sin(sa)) * thickness;
    for (let i = 0; i <= count; i++) {
      const t = i / count;
      pts.push(
        ax + dx * t + offX + (Math.random() - 0.5) * 0.01,
        ay + dy * t + offY + (Math.random() - 0.5) * 0.01,
        az + dz * t + offZ + (Math.random() - 0.5) * 0.01,
      );
    }
  }
  // Ring cross-sections for visibility
  const rings = Math.max(4, Math.floor(len / 0.5));
  for (let r = 0; r < rings; r++) {
    const t = r / rings;
    const cx = ax + dx * t, cy = ay + dy * t, cz = az + dz * t;
    for (let j = 0; j < 10; j++) {
      const a = (j / 10) * Math.PI * 2;
      pts.push(
        cx + (px * Math.cos(a) + qx * Math.sin(a)) * thickness,
        cy + (py * Math.cos(a) + qy * Math.sin(a)) * thickness,
        cz + (pz * Math.cos(a) + qz * Math.sin(a)) * thickness,
      );
    }
  }
  return pts;
}

/* ═══════════════════════════════════════════════════════════════════
   GEAR CLUSTER BUILDER — interlocking gears + connecting pipes
   Placed on the back‑right side of the construct
   ═══════════════════════════════════════════════════════════════════ */
function buildGearCluster(parent, C1, C2, C3) {
  const cluster = new THREE.Group();
  // Position the cluster on the back‑right, slightly below centre
  cluster.position.set(-18, 3, 16);
  // Tilt the whole plate so it faces partially toward camera
  cluster.rotation.x = -0.35;
  cluster.rotation.y = 0.5;

  const gearMat1 = dotMat(C1, 0.48, 1.8);
  const gearMat2 = dotMat(C2, 0.40, 1.6);
  const gearMat3 = dotMat(C1, 0.44, 1.7);
  const pipeMat  = dotMat(C2, 0.35, 1.4);
  const pipeMat2 = dotMat(C3, 0.28, 1.3);

  /*  Gear layout — { x, z, r, teeth, toothH, speed, mat }
      Meshing: gear pairs share an edge; smaller gear spins faster.
      Speed sign alternates for interlocking. */
  const gearDefs = [
    // === Main group — tightly meshed ===
    { x: 0,     z: 0,     r: 3.0,  teeth: 28, toothH: 0.55, spokes: 6, mat: gearMat1, baseSpd: 0.3 },
    { x: 4.8,   z: 0,     r: 2.0,  teeth: 18, toothH: 0.45, spokes: 5, mat: gearMat2, baseSpd: -0.3 * (3.0 / 2.0) },
    { x: 4.8,   z: 3.5,   r: 1.5,  teeth: 14, toothH: 0.40, spokes: 4, mat: gearMat3, baseSpd: 0.3 * (3.0 / 1.5) },
    { x: -1.5,  z: 4.5,   r: 2.5,  teeth: 22, toothH: 0.50, spokes: 5, mat: gearMat1, baseSpd: -0.3 * (3.0 / 2.5) },
    { x: -4.2,  z: 3.0,   r: 1.2,  teeth: 12, toothH: 0.35, spokes: 4, mat: gearMat2, baseSpd: 0.3 * (3.0 / 1.2) },

    // === Chained off main group ===
    { x: 7.5,   z: -2.5,  r: 1.8,  teeth: 16, toothH: 0.40, spokes: 4, mat: gearMat3, baseSpd: 0.3 * (3.0 / 1.8) },
    { x: 9.0,   z: 0,     r: 1.0,  teeth: 10, toothH: 0.30, spokes: 3, mat: gearMat2, baseSpd: -0.3 * (3.0 / 1.0) },
    { x: -5.5,  z: 0.5,   r: 2.2,  teeth: 20, toothH: 0.48, spokes: 5, mat: gearMat1, baseSpd: 0.3 * (3.0 / 2.2) },

    // === Small detail gears filling gaps ===
    { x: 2.5,   z: -3.0,  r: 0.8,  teeth: 8,  toothH: 0.25, spokes: 3, mat: gearMat3, baseSpd: -0.3 * (3.0 / 0.8) },
    { x: -3.0,  z: -2.0,  r: 1.4,  teeth: 12, toothH: 0.35, spokes: 4, mat: gearMat2, baseSpd: 0.3 * (3.0 / 1.4) },
    { x: 6.5,   z: 3.0,   r: 1.0,  teeth: 10, toothH: 0.30, spokes: 3, mat: gearMat1, baseSpd: -0.3 * (3.0 / 1.0) },
    { x: -5.0,  z: 5.5,   r: 0.9,  teeth: 9,  toothH: 0.28, spokes: 3, mat: gearMat3, baseSpd: 0.3 * (3.0 / 0.9) },
  ];

  // Build each gear
  const gearPositions = []; // for pipe connections
  gearDefs.forEach(d => {
    const dotsTrack = Math.floor(d.r * 40);
    const rimTracks = Math.max(2, Math.floor(d.r * 1.5));
    const arr = gearWheel(d.r, d.teeth, d.toothH, rimTracks, dotsTrack, d.spokes);
    const pts = makePts(arr, d.mat);

    // Gear pivots around its Y axis (flat XZ plane)
    const pivot = new THREE.Group();
    pivot.position.set(d.x, 0, d.z);
    pivot.add(pts);
    cluster.add(pivot);

    gears.push({ pivot, speed: d.baseSpd });
    gearPositions.push({ x: d.x, z: d.z, r: d.r });
  });

  // === Connecting pipes / axle shafts between meshed gears ===
  const pipeConnections = [
    [0, 1], [1, 2], [0, 3], [3, 4], [1, 5],
    [5, 6], [4, 7], [0, 9], [8, 1], [2, 10],
    [4, 11], [6, 10],
  ];

  pipeConnections.forEach(([a, b]) => {
    if (a >= gearPositions.length || b >= gearPositions.length) return;
    const ga = gearPositions[a], gb = gearPositions[b];
    const thickness = 0.10 + Math.random() * 0.05;
    const dotCount = Math.floor(
      Math.hypot(gb.x - ga.x, gb.z - ga.z) * 12
    );
    // Vary Y slightly so pipes aren't all coplanar
    const yA = (Math.random() - 0.5) * 0.4;
    const yB = (Math.random() - 0.5) * 0.4;
    const arr = pipePts(ga.x, yA, ga.z, gb.x, yB, gb.z, dotCount, thickness);
    cluster.add(makePts(arr, Math.random() > 0.5 ? pipeMat : pipeMat2));
  });

  // === Extra long pipes running off to the armillary rings ===
  const longPipes = [
    { from: 0,  tx: -8,  ty: 3,  tz: -8  },   // main gear → toward spire
    { from: 7,  tx: -12, ty: 1,  tz: 4   },   // left gear → toward outer ring
    { from: 5,  tx: 14,  ty: -2, tz: -6  },   // right gear → off to side
    { from: 3,  tx: -6,  ty: 5,  tz: 10  },   // upward pipe
  ];

  longPipes.forEach(l => {
    if (l.from >= gearPositions.length) return;
    const g = gearPositions[l.from];
    const cnt = Math.floor(Math.hypot(l.tx - g.x, l.tz - g.z) * 8);
    const arr = pipePts(g.x, 0, g.z, l.tx, l.ty, l.tz, cnt, 0.12);
    cluster.add(makePts(arr, pipeMat));
  });

  // === Axle cylinders at each gear centre (vertical shafts) ===
  const axleMat = dotMat(C1, 0.50, 2.0);
  gearPositions.forEach(g => {
    // Vertical axle shaft extending above and below the gear
    const shaftH = g.r * 0.6 + 0.5;
    const arr = pipePts(g.x, -shaftH, g.z, g.x, shaftH, g.z, Math.floor(shaftH * 20), 0.08);
    cluster.add(makePts(arr, axleMat));
  });

  // === Thicker flanges / mounting brackets at each axle ===
  const flangeMat = dotMat(C1, 0.45, 2.2);
  gearPositions.forEach(g => {
    // Multiple flanges stacked vertically
    const halfD = g.r * 0.35 / 2;
    [-halfD, 0, halfD].forEach(yOff => {
      const fl = thickRing(0.25, 0.10, 3, 20, 0.01);
      const p = makePts(fl, flangeMat);
      p.position.set(g.x, yOff, g.z);
      cluster.add(p);
    });
  });

  parent.add(cluster);

  // ─── Also build a second smaller cluster on the opposite side ───
  const cluster2 = new THREE.Group();
  cluster2.position.set(20, 5, 14);
  cluster2.rotation.x = -0.2;
  cluster2.rotation.y = -0.7;
  cluster2.scale.setScalar(0.75);

  const smallDefs = [
    { x: 0,    z: 0,    r: 2.0, teeth: 18, toothH: 0.42, spokes: 5, mat: gearMat2, baseSpd: 0.4 },
    { x: 3.2,  z: 0,    r: 1.4, teeth: 12, toothH: 0.35, spokes: 4, mat: gearMat1, baseSpd: -0.4 * (2.0 / 1.4) },
    { x: 0,    z: 3.2,  r: 1.6, teeth: 14, toothH: 0.38, spokes: 4, mat: gearMat3, baseSpd: -0.4 * (2.0 / 1.6) },
    { x: -2.8, z: 1.5,  r: 1.0, teeth: 10, toothH: 0.30, spokes: 3, mat: gearMat2, baseSpd: 0.4 * (2.0 / 1.0) },
    { x: 3.5,  z: 2.8,  r: 0.8, teeth: 8,  toothH: 0.25, spokes: 3, mat: gearMat1, baseSpd: 0.4 * (2.0 / 0.8) },
  ];

  const smallPositions = [];
  smallDefs.forEach(d => {
    const dotsTrack = Math.floor(d.r * 40);
    const rimTracks = Math.max(2, Math.floor(d.r * 1.5));
    const arr = gearWheel(d.r, d.teeth, d.toothH, rimTracks, dotsTrack, d.spokes);
    const pts = makePts(arr, d.mat);
    const pivot = new THREE.Group();
    pivot.position.set(d.x, 0, d.z);
    pivot.add(pts);
    cluster2.add(pivot);
    gears.push({ pivot, speed: d.baseSpd });
    smallPositions.push({ x: d.x, z: d.z });
  });

  // Pipes for second cluster (thicker)
  [[0,1],[0,2],[2,3],[1,4],[2,4]].forEach(([a, b]) => {
    const ga = smallPositions[a], gb = smallPositions[b];
    const cnt = Math.floor(Math.hypot(gb.x - ga.x, gb.z - ga.z) * 12);
    cluster2.add(makePts(pipePts(ga.x, 0, ga.z, gb.x, 0, gb.z, cnt, 0.08), pipeMat2));
  });

  // Axle shafts + flanges on second cluster
  smallPositions.forEach((g, i) => {
    const shaftH = smallDefs[i].r * 0.5 + 0.3;
    cluster2.add(makePts(
      pipePts(g.x, -shaftH, g.z, g.x, shaftH, g.z, Math.floor(shaftH * 18), 0.06),
      axleMat
    ));
    const halfD = smallDefs[i].r * 0.35 / 2;
    [-halfD, 0, halfD].forEach(yOff => {
      const fl = thickRing(0.18, 0.08, 2, 16, 0.01);
      const p = makePts(fl, flangeMat);
      p.position.set(g.x, yOff, g.z);
      cluster2.add(p);
    });
  });

  parent.add(cluster2);
}

/* ═══════════════════════════════════════════════════════════════════
   BUILD THE CONSTRUCT
   ═══════════════════════════════════════════════════════════════════ */
export function createConstruct() {
  group = new THREE.Group();
  group.position.set(0, -1, -14);  // well behind the orbs
  group.rotation.x = 0.55;        // tilted like the reference
  group.rotation.z = 0.15;
  group.scale.setScalar(1.3);     // BIG

  const C1 = 0x222233; // dark structural
  const C2 = 0x444455; // medium
  const C3 = 0x555566; // lighter detail
  const C4 = 0x333344; // accent

  /* ═══════════════════════════════════════════════════════════════
     CENTRAL SPIRE — thick, defined, with structural rings
     ═══════════════════════════════════════════════════════════════ */
  const spireH = 28;
  // Main spire shaft — 4 parallel lines
  for (let s = 0; s < 4; s++) {
    const off = s * 0.06 - 0.09;
    const arr = linePts(off, -spireH / 2, off, off, spireH / 2, off, 500);
    group.add(makePts(arr, dotMat(C1, 0.55, 2.0)));
  }

  // Structural rings along the spire
  for (let y = -spireH / 2; y <= spireH / 2; y += 1.8) {
    const r = 0.25 + Math.abs(y) * 0.008;
    const arr = thickRing(r, 0.08, 2, 40, 0.01);
    const p = makePts(arr, dotMat(C2, 0.45, 1.5));
    p.position.y = y;
    group.add(p);
  }

  // Spire tip ornaments — larger defined rings
  [spireH / 2, -spireH / 2].forEach(y => {
    const arr = thickRing(0.5, 0.2, 3, 60, 0.01);
    const p = makePts(arr, dotMat(C1, 0.6, 2.0));
    p.position.y = y;
    group.add(p);
    // Dot cluster at tip
    const sp = makePts(sphereDots(0.25, 40), dotMat(C1, 0.5, 2.5));
    sp.position.y = y + (y > 0 ? 0.6 : -0.6);
    group.add(sp);
  });

  /* ═══════════════════════════════════════════════════════════════
     MAJOR RINGS — thick multi-track bands at different tilts
     These are the primary visual — dense, defined, mechanical
     ═══════════════════════════════════════════════════════════════ */
  const majorRings = [
    { r: 16, w: 1.2,  tracks: 8,  dpt: 400, tX: 0,    tZ: 0,    op: 0.45, sz: 1.8, spd: 0.03  },
    { r: 13, w: 0.9,  tracks: 6,  dpt: 350, tX: 0.15, tZ: 0.08, op: 0.40, sz: 1.6, spd: -0.025 },
    { r: 19, w: 0.7,  tracks: 5,  dpt: 500, tX: -0.1, tZ: 0.05, op: 0.30, sz: 1.5, spd: 0.018 },
    { r: 10, w: 1.0,  tracks: 7,  dpt: 300, tX: 0.25, tZ: -0.12, op: 0.42, sz: 1.7, spd: -0.04 },
    { r: 22, w: 0.5,  tracks: 4,  dpt: 600, tX: 0.08, tZ: 0.03, op: 0.22, sz: 1.3, spd: 0.012 },
  ];

  majorRings.forEach(d => {
    const arr = thickRing(d.r, d.w, d.tracks, d.dpt, 0.04);
    const mat = dotMat(C1, d.op, d.sz);
    const pts = makePts(arr, mat);
    pts.rotation.x = d.tX;
    pts.rotation.z = d.tZ;
    group.add(pts);
    spinLayers.push({ pts, speed: d.spd, axis: 'y' });
  });

  /* ═══════════════════════════════════════════════════════════════
     SECONDARY TILTED RINGS — thinner, at sharper angles
     ═══════════════════════════════════════════════════════════════ */
  const secRings = [
    { r: 14, w: 0.4, tracks: 3, dpt: 300, tX: 0.7,   tZ: 0.2,   op: 0.30, sz: 1.4, spd: 0.05  },
    { r: 11, w: 0.4, tracks: 3, dpt: 250, tX: -0.5,  tZ: -0.15, op: 0.28, sz: 1.3, spd: -0.06 },
    { r: 17, w: 0.3, tracks: 2, dpt: 400, tX: 0.4,   tZ: 0.35,  op: 0.22, sz: 1.2, spd: 0.035 },
    { r: 8,  w: 0.5, tracks: 4, dpt: 200, tX: -0.8,  tZ: 0.4,   op: 0.35, sz: 1.5, spd: -0.08 },
    { r: 20, w: 0.3, tracks: 2, dpt: 500, tX: 0.3,   tZ: -0.25, op: 0.18, sz: 1.1, spd: 0.015 },
    { r: 6,  w: 0.6, tracks: 4, dpt: 180, tX: 1.0,   tZ: -0.1,  op: 0.38, sz: 1.6, spd: 0.10  },
  ];

  secRings.forEach(d => {
    const arr = thickRing(d.r, d.w, d.tracks, d.dpt, 0.03);
    const mat = dotMat(C2, d.op, d.sz);
    const pts = makePts(arr, mat);
    pts.rotation.x = d.tX;
    pts.rotation.z = d.tZ;
    group.add(pts);
    spinLayers.push({ pts, speed: d.spd, axis: 'y' });
  });

  /* ═══════════════════════════════════════════════════════════════
     GEAR TEETH on major rings (mechanical detail)
     ═══════════════════════════════════════════════════════════════ */
  const gearMat = dotMat(C2, 0.35, 1.4);
  [16, 13, 10].forEach((r, i) => {
    const teeth = gearTeeth(r, 80 + i * 20, 0.4, 4);
    const g = makePts(teeth, gearMat);
    g.rotation.x = [0, 0.15, 0.25][i];
    g.rotation.z = [0, 0.08, -0.12][i];
    group.add(g);
    spinLayers.push({ pts: g, speed: majorRings[i].spd, axis: 'y' });
  });

  /* ═══════════════════════════════════════════════════════════════
     CONCENTRIC DISC LAYERS — flat planes at different heights
     ═══════════════════════════════════════════════════════════════ */
  const discMat1 = dotMat(C3, 0.15, 1.0);
  const discMat2 = dotMat(C3, 0.10, 0.9);
  [-0.3, 0, 0.3].forEach((yOff, i) => {
    const d = makePts(discFill(1, 15 + i * 2, 40, 80), [discMat1, discMat2, discMat1][i]);
    d.position.y = yOff;
    group.add(d);
    spinLayers.push({ pts: d, speed: 0.005 + i * 0.003, axis: 'y' });
  });

  /* ═══════════════════════════════════════════════════════════════
     RADIAL SPOKES — structural beams with measurement ticks
     ═══════════════════════════════════════════════════════════════ */
  const spokeMat  = dotMat(C2, 0.30, 1.5);
  const tickMat   = dotMat(C3, 0.25, 1.2);
  const spokeCount = 16;
  for (let i = 0; i < spokeCount; i++) {
    const a  = (i / spokeCount) * Math.PI * 2;
    const len = 18 + (i % 3) * 3;
    const nx = Math.cos(a), nz = Math.sin(a);

    // Main spoke — double line
    for (let s = -1; s <= 1; s += 2) {
      const off = s * 0.06;
      const arr = linePts(off, 0, off, nx * len + off, 0, nz * len + off, 100);
      group.add(makePts(arr, spokeMat));
    }

    // Measurement ticks along spoke
    for (let d = 2; d < len; d += 1.5) {
      const cx = nx * d, cz = nz * d;
      const perpX = -nz * 0.2, perpZ = nx * 0.2;
      const tick = linePts(cx - perpX, 0, cz - perpZ, cx + perpX, 0, cz + perpZ, 6);
      group.add(makePts(tick, tickMat));
    }
  }

  /* ═══════════════════════════════════════════════════════════════
     INNER MECHANICAL CORE — dense, fast-spinning detail
     ═══════════════════════════════════════════════════════════════ */
  // Gyroscope-like nested rings
  const gyroDefs = [
    { r: 3.5, w: 0.5, tracks: 4, dpt: 200, tX: Math.PI / 2, tZ: 0,    spd: 0.15  },
    { r: 4.5, w: 0.4, tracks: 3, dpt: 220, tX: 0,           tZ: Math.PI / 2, spd: -0.12 },
    { r: 3,   w: 0.3, tracks: 3, dpt: 180, tX: 1.1,         tZ: 0.6,  spd: 0.18  },
    { r: 5.5, w: 0.3, tracks: 3, dpt: 250, tX: 0.5,         tZ: -0.8, spd: -0.10 },
    { r: 2,   w: 0.4, tracks: 3, dpt: 120, tX: -0.7,        tZ: 1.0,  spd: 0.22  },
  ];

  const gyroMat = dotMat(C1, 0.50, 1.8);
  gyroDefs.forEach(d => {
    const arr = thickRing(d.r, d.w, d.tracks, d.dpt, 0.02);
    const pts = makePts(arr, gyroMat);
    pts.rotation.x = d.tX;
    pts.rotation.z = d.tZ;
    group.add(pts);
    spinLayers.push({ pts, speed: d.spd, axis: 'y' });
  });

  // Core sphere — dense dot ball at center
  const coreMat = dotMat(C1, 0.55, 2.0);
  group.add(makePts(sphereDots(1.2, 300), coreMat));
  // Inner core
  group.add(makePts(sphereDots(0.5, 100), dotMat(C4, 0.65, 2.5)));

  /* ═══════════════════════════════════════════════════════════════
     SWEEPING ARCS — partial rings that trail off (like the ref)
     ═══════════════════════════════════════════════════════════════ */
  const arcMat = dotMat(C2, 0.28, 1.4);
  const arcDefs = [
    { r: 24, start: -0.8, end: 1.5,  count: 400, tX: 0.1,  tZ: 0.05, spd: 0.008 },
    { r: 21, start:  0.3, end: 2.8,  count: 350, tX: -0.15, tZ: 0.1, spd: -0.01 },
    { r: 26, start: -1.5, end: 0.8,  count: 500, tX: 0.2,  tZ: -0.08, spd: 0.006 },
    { r: 18, start:  1.0, end: 3.5,  count: 300, tX: 0.35, tZ: 0.2, spd: -0.015 },
    { r: 28, start: -0.3, end: 1.2,  count: 400, tX: 0.05, tZ: 0.02, spd: 0.005 },
  ];

  arcDefs.forEach(d => {
    const arr = arcPts(d.r, d.start, d.end, d.count);
    const pts = makePts(arr, arcMat);
    pts.rotation.x = d.tX;
    pts.rotation.z = d.tZ;
    group.add(pts);
    spinLayers.push({ pts, speed: d.spd, axis: 'y' });
  });

  /* ═══════════════════════════════════════════════════════════════
     DEBRIS FIELD — scattered particles in the volume
     ═══════════════════════════════════════════════════════════════ */
  const debrisArr = [];
  for (let i = 0; i < 1200; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = 2 + Math.random() * 24;
    const y = (Math.random() - 0.5) * 10;
    debrisArr.push(
      Math.cos(a) * r + (Math.random() - 0.5) * 0.8,
      y,
      Math.sin(a) * r + (Math.random() - 0.5) * 0.8,
    );
  }
  group.add(makePts(debrisArr, dotMat(C3, 0.12, 1.0)));

  /* ═══════════════════════════════════════════════════════════════
     NODE CLUSTERS — small spheres at key ring intersections
     ═══════════════════════════════════════════════════════════════ */
  const nodeClusterMat = dotMat(C1, 0.50, 2.5);
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2 + Math.random() * 0.3;
    const r = 8 + Math.random() * 12;
    const y = (Math.random() - 0.5) * 4;
    const sd = sphereDots(0.35, 30);
    const n = makePts(sd, nodeClusterMat);
    n.position.set(Math.cos(a) * r, y, Math.sin(a) * r);
    group.add(n);
  }

  // Small orbiting nodes on the major rings (like the reference's black dots)
  const orbitNodeMat = dotMat(C1, 0.60, 3.0);
  for (let i = 0; i < 20; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = 8 + Math.random() * 14;
    const sd = sphereDots(0.2, 20);
    const n = makePts(sd, orbitNodeMat);
    n.position.set(Math.cos(a) * r, (Math.random() - 0.5) * 1, Math.sin(a) * r);
    group.add(n);
  }

  /* ═══════════════════════════════════════════════════════════════
     GUIDE / MEASUREMENT LINES — technical blueprint look
     ═══════════════════════════════════════════════════════════════ */
  const guideMat = dotMat(C3, 0.12, 0.9);
  // Major axes
  group.add(makePts(linePts(-28, 0, 0, 28, 0, 0, 200), guideMat));
  group.add(makePts(linePts(0, 0, -28, 0, 0, 28, 200), guideMat));
  // Diagonals
  group.add(makePts(linePts(-20, 0, -20, 20, 0, 20, 150), guideMat));
  group.add(makePts(linePts(-20, 0, 20, 20, 0, -20, 150), guideMat));

  // Extension lines from spire tips
  const extMat = dotMat(C3, 0.14, 1.0);
  group.add(makePts(linePts(0, spireH / 2, 0, 12, spireH / 2 + 4, 8, 80), extMat));
  group.add(makePts(linePts(0, spireH / 2, 0, -10, spireH / 2 + 3, -6, 70), extMat));
  group.add(makePts(linePts(0, -spireH / 2, 0, 8, -spireH / 2 - 5, 10, 80), extMat));
  group.add(makePts(linePts(0, -spireH / 2, 0, -12, -spireH / 2 - 3, -8, 70), extMat));

  /* ═══════════════════════════════════════════════════════════════
     GEAR MECHANISM CLUSTER — back side of the construct
     Interlocking dotted gears with connecting pipes
     ═══════════════════════════════════════════════════════════════ */
  buildGearCluster(group, C1, C2, C3);

  /* ═══════════════════════════════════════════════════════════════
     ORBITING DOTTED SPHERES — small orbs traveling along rings
     ═══════════════════════════════════════════════════════════════ */
  const orbiterDefs = [
    // On major rings
    { r: 16,  tX: 0,    tZ: 0,     spd: 0.18,  sz: 0.45, dots: 50, startA: 0     },
    { r: 16,  tX: 0,    tZ: 0,     spd: 0.18,  sz: 0.35, dots: 35, startA: Math.PI },
    { r: 13,  tX: 0.15, tZ: 0.08,  spd: -0.22, sz: 0.40, dots: 45, startA: 1.2   },
    { r: 13,  tX: 0.15, tZ: 0.08,  spd: -0.22, sz: 0.30, dots: 30, startA: 3.8   },
    { r: 19,  tX: -0.1, tZ: 0.05,  spd: 0.12,  sz: 0.50, dots: 55, startA: 0.7   },
    { r: 10,  tX: 0.25, tZ: -0.12, spd: -0.28, sz: 0.38, dots: 40, startA: 2.5   },
    { r: 10,  tX: 0.25, tZ: -0.12, spd: -0.28, sz: 0.28, dots: 25, startA: 5.0   },
    { r: 22,  tX: 0.08, tZ: 0.03,  spd: 0.09,  sz: 0.42, dots: 48, startA: 4.0   },
    // On secondary rings
    { r: 14,  tX: 0.7,  tZ: 0.2,   spd: 0.25,  sz: 0.35, dots: 35, startA: 1.0   },
    { r: 11,  tX: -0.5, tZ: -0.15, spd: -0.30, sz: 0.32, dots: 30, startA: 3.0   },
    { r: 17,  tX: 0.4,  tZ: 0.35,  spd: 0.15,  sz: 0.38, dots: 38, startA: 5.5   },
    { r: 8,   tX: -0.8, tZ: 0.4,   spd: -0.35, sz: 0.45, dots: 50, startA: 0.5   },
    { r: 6,   tX: 1.0,  tZ: -0.1,  spd: 0.40,  sz: 0.30, dots: 28, startA: 2.0   },
    // Inner gyroscope orbiters
    { r: 3.5, tX: Math.PI / 2, tZ: 0,   spd: 0.55,  sz: 0.25, dots: 22, startA: 0.0 },
    { r: 4.5, tX: 0, tZ: Math.PI / 2,   spd: -0.45, sz: 0.28, dots: 25, startA: 1.5 },
  ];

  const orbiterMat = dotMat(C1, 0.65, 2.8);
  orbiterDefs.forEach(d => {
    const sd = sphereDots(d.sz, d.dots);
    const mesh = makePts(sd, orbiterMat);
    // Create a pivot so the orbiter travels in the same tilted plane as its ring
    const pivot = new THREE.Group();
    pivot.rotation.x = d.tX;
    pivot.rotation.z = d.tZ;
    pivot.add(mesh);
    group.add(pivot);
    orbiters.push({
      mesh,
      pivot,
      radius: d.r,
      angle: d.startA,
      speed: d.spd,
    });
  });

  return group;
}

/* ── Update (call from animation loop) ────────────────────────────── */
export function updateConstruct(dt) {
  if (!group) return;
  time += dt;

  // Slow majestic overall rotation
  group.rotation.y += dt * 0.012;

  // Each layer spins independently
  spinLayers.forEach(l => {
    l.pts.rotation.y += l.speed * dt;
  });

  // Orbiting spheres travel along their ring paths
  orbiters.forEach(o => {
    o.angle += o.speed * dt;
    o.mesh.position.x = Math.cos(o.angle) * o.radius;
    o.mesh.position.z = Math.sin(o.angle) * o.radius;
  });

  // Spin gear wheels (gears lie flat in XZ plane, spin around Y)
  gears.forEach(g => {
    g.pivot.rotation.y += g.speed * dt;
  });
}

/* ── Intensity tiers for each base color category ───────────────── */
// C1 (0x222233) = primary structural — full accent color
// C2 (0x444455) = medium detail     — lighter / desaturated accent
// C3 (0x555566) = faint detail      — even lighter, more muted
// C4 (0x333344) = accent highlight  — slightly brighter than C1
const _tmpC = new THREE.Color();
const _tmpAccent = new THREE.Color();

function accentVariant(accentHex, lighten, desaturate) {
  _tmpC.set(accentHex);
  const hsl = {};
  _tmpC.getHSL(hsl);
  hsl.l = Math.min(hsl.l + lighten, 1.0);
  hsl.s = Math.max(hsl.s - desaturate, 0.0);
  _tmpC.setHSL(hsl.h, hsl.s, hsl.l);
  return _tmpC.getHex();
}

/* ── Theme switch (receives accent wire color) ────────────────────── */
export function updateConstructTheme(dark, accentWire) {
  const blend = dark ? THREE.AdditiveBlending : THREE.NormalBlending;

  // Build color variants from the accent
  const accent = accentWire || (dark ? 0x88bbff : 0x3a3a52);
  const colorMap = dark ? {
    0x222233: accentVariant(accent, 0.0,  0.0),   // C1 → full accent
    0x444455: accentVariant(accent, 0.12, 0.15),   // C2 → lighter
    0x555566: accentVariant(accent, 0.22, 0.25),   // C3 → muted/light
    0x333344: accentVariant(accent, 0.05, -0.05),  // C4 → slightly brighter
  } : {
    // Light mode: tint the base grays toward the accent
    0x222233: accentVariant(accent, -0.15, 0.3),
    0x444455: accentVariant(accent, -0.05, 0.35),
    0x555566: accentVariant(accent, 0.05,  0.4),
    0x333344: accentVariant(accent, -0.10, 0.25),
  };

  mats.forEach(m => {
    m.blending = blend;
    const mapped = colorMap[m._baseColor];
    if (mapped !== undefined) m.color.set(mapped);
    // Dark mode: boost opacity for visibility
    m.opacity = dark ? Math.min(m._baseOpacity * 2.2, 1.0) : m._baseOpacity;
    m.needsUpdate = true;
  });
}
