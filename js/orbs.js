/* ═══════════════════════════════════════════════════════════════════
   orbs.js — Dotted particle spheres with wave-ripple hover effect
   ═══════════════════════════════════════════════════════════════════ */

import * as THREE from 'three';
import { scene }              from './scene.js';
import { parallaxGroup }      from './parallax.js';
import { PROJECTS, ORB_ORIGINS } from './config.js';
import { shDeform, randomCoeffs } from './harmonics.js';

/** All blob state objects live here */
export const blobs = [];

/** Reusable vectors */
const _v = new THREE.Vector3();
const _dir = new THREE.Vector3();

/* ─── Custom dot shader ───────────────────────────────────────────── */
function makeDotMaterial(color) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uColor:      { value: new THREE.Color(color) },
      uOpacity:    { value: 1.0 },
      uPointSize:  { value: 1.0 },
      uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
      // Wave ripple uniforms
      uHitPoint:   { value: new THREE.Vector3(0, 0, 0) },
      uWaveTime:   { value: -10.0 },  // negative = no active wave
      uWaveAmp:    { value: 1.0 },
      uWaveFreq:   { value: 6.0 },
      uWaveSpeed:  { value: 3.5 },
      uWaveDecay:  { value: 3.2 },
      // Noise / focused state uniforms
      uNoiseTime:  { value: 0.0 },
      uNoiseAmp:   { value: 0.0 },   // 0 = off, >0 = constant noise active
      uHoverAmp:   { value: 0.0 },   // interpolated hover intensity
      uPulseGlow:  { value: 0.0 },   // per-orb pulsing brightness
    },
    vertexShader: /* glsl */`
      uniform float uPointSize;
      uniform float uPixelRatio;
      uniform vec3  uHitPoint;
      uniform float uWaveTime;
      uniform float uWaveAmp;
      uniform float uWaveFreq;
      uniform float uWaveSpeed;
      uniform float uWaveDecay;
      uniform float uNoiseTime;
      uniform float uNoiseAmp;
      uniform float uHoverAmp;

      varying float vAlpha;
      varying float vDisplacement;

      // ── Simplex-style 3D noise (GPU) ──────────────────────────────
      vec3 mod289(vec3 x) { return x - floor(x * (1.0/289.0)) * 289.0; }
      vec4 mod289(vec4 x) { return x - floor(x * (1.0/289.0)) * 289.0; }
      vec4 permute(vec4 x) { return mod289((x * 34.0 + 1.0) * x); }
      vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

      float snoise(vec3 v) {
        const vec2 C = vec2(1.0/6.0, 1.0/3.0);
        const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
        vec3 i = floor(v + dot(v, C.yyy));
        vec3 x0 = v - i + dot(i, C.xxx);
        vec3 g = step(x0.yzx, x0.xyz);
        vec3 l = 1.0 - g;
        vec3 i1 = min(g.xyz, l.zxy);
        vec3 i2 = max(g.xyz, l.zxy);
        vec3 x1 = x0 - i1 + C.xxx;
        vec3 x2 = x0 - i2 + C.yyy;
        vec3 x3 = x0 - D.yyy;
        i = mod289(i);
        vec4 p = permute(permute(permute(
            i.z + vec4(0.0, i1.z, i2.z, 1.0))
          + i.y + vec4(0.0, i1.y, i2.y, 1.0))
          + i.x + vec4(0.0, i1.x, i2.x, 1.0));
        float n_ = 0.142857142857;
        vec3 ns = n_ * D.wyz - D.xzx;
        vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
        vec4 x_ = floor(j * ns.z);
        vec4 y_ = floor(j - 7.0 * x_);
        vec4 x2_ = x_ * ns.x + ns.yyyy;
        vec4 y2_ = y_ * ns.x + ns.yyyy;
        vec4 h = 1.0 - abs(x2_) - abs(y2_);
        vec4 b0 = vec4(x2_.xy, y2_.xy);
        vec4 b1 = vec4(x2_.zw, y2_.zw);
        vec4 s0 = floor(b0) * 2.0 + 1.0;
        vec4 s1 = floor(b1) * 2.0 + 1.0;
        vec4 sh = -step(h, vec4(0.0));
        vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
        vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
        vec3 p0 = vec3(a0.xy, h.x);
        vec3 p1 = vec3(a0.zw, h.y);
        vec3 p2 = vec3(a1.xy, h.z);
        vec3 p3 = vec3(a1.zw, h.w);
        vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
        p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
        vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
        m = m * m;
        return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
      }
      // ──────────────────────────────────────────────────────────────

      void main() {
        vec3 pos = position;
        vec3 dir = normalize(pos);
        float displacement = 0.0;

        // ── Hover wave ripple (from cursor hit point) ───────────────
        if (uWaveTime >= 0.0) {
          float dist = distance(pos, uHitPoint);
          float wave = sin(dist * uWaveFreq - uWaveTime * uWaveSpeed);
          float envelope = exp(-dist * uWaveDecay);
          displacement += wave * envelope * uWaveAmp;
        }

        // ── Gentle random ripples for focused/clicked orb ───────────
        if (uNoiseAmp > 0.0) {
          // Soft noise undulation across the surface
          float n = snoise(pos * 3.0 + uNoiseTime * 0.6) * 0.5
                  + snoise(pos * 5.5 - uNoiseTime * 0.9) * 0.25;

          // Gentle travelling ripple rings from drifting origins
          float ring1 = sin(length(pos - vec3(
              sin(uNoiseTime * 0.4) * 0.6,
              cos(uNoiseTime * 0.3) * 0.6,
              sin(uNoiseTime * 0.2) * 0.6
          )) * 5.0 - uNoiseTime * 2.5) * 0.3;

          float ring2 = sin(length(pos - vec3(
              cos(uNoiseTime * 0.35) * 0.5,
              sin(uNoiseTime * 0.25 + 2.0) * 0.5,
              cos(uNoiseTime * 0.45) * 0.5
          )) * 6.0 + uNoiseTime * 2.0) * 0.2;

          displacement += (n + ring1 + ring2) * uNoiseAmp;
        }

        pos += dir * displacement;
        vDisplacement = displacement;

        vec4 mv = modelViewMatrix * vec4(pos, 1.0);
        gl_Position = projectionMatrix * mv;

        // Tiny dots — small enough to see gaps between them
        gl_PointSize = uPointSize * uPixelRatio * (55.0 / -mv.z);

        // Gentle depth fade — keep back-face dots visible
        float depthFade = smoothstep(60.0, 5.0, -mv.z);
        vAlpha = depthFade;
      }
    `,
    fragmentShader: /* glsl */`
      uniform vec3  uColor;
      uniform float uOpacity;
      uniform float uPulseGlow;
      varying float vAlpha;
      varying float vDisplacement;

      void main() {
        // Crisp circular dot with soft glow halo
        float d = length(gl_PointCoord - 0.5);
        if (d > 0.5) discard;

        // Bright core + soft glow falloff
        float core = smoothstep(0.5, 0.15, d);
        float glow = exp(-d * 6.0) * 0.4;
        float alpha = core + glow;

        // Tint displaced particles with a blue highlight
        vec3 col = uColor;
        float dispStrength = abs(vDisplacement) * 3.0;
        col = mix(col, vec3(0.3, 0.6, 1.0), clamp(dispStrength, 0.0, 0.7));

        // Per-orb pulsing glow
        col *= 1.0 + uPulseGlow * 0.6;
        alpha *= 1.0 + uPulseGlow * 0.25;

        gl_FragColor = vec4(col, alpha * vAlpha * uOpacity);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
}

/**
 * Write deformed positions into a geometry using cached unit-sphere angles.
 */
export function morphGeo(geo, unitAngles, coeffs, baseR) {
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const theta = unitAngles[i * 2];
    const phi   = unitAngles[i * 2 + 1];
    const r = baseR + shDeform(theta, phi, coeffs);
    pos.setXYZ(
      i,
      r * Math.sin(theta) * Math.cos(phi),
      r * Math.cos(theta),
      r * Math.sin(theta) * Math.sin(phi)
    );
  }
  pos.needsUpdate = true;
}

/**
 * Apply wave ripple — updates the shader uniforms rather than moving vertices on CPU.
 * The vertex shader handles the actual displacement.
 */
export function applyHoverDisplacement(geo, hitLocal, strength, radius) {
  // This is now a no-op — wave displacement is done in the shader via updateWaveRipple()
}

/**
 * Update wave ripple uniforms for a blob.
 * Call each frame for hovered blobs.
 */
export function updateWaveRipple(b, dt) {
  if (!b.waveActive) return;
  b.waveElapsed += dt;
  b.mat.uniforms.uWaveTime.value = b.waveElapsed;

  // Update hit point continuously while hovering
  if (b.hitLocal) {
    b.mat.uniforms.uHitPoint.value.copy(b.hitLocal);
  }

  // Fade out wave after mouse leaves (waveElapsed keeps going)
  if (!b.hovered && b.waveElapsed > 2.5) {
    b.waveActive = false;
    b.mat.uniforms.uWaveTime.value = -10.0;
  }
}

/**
 * Start or refresh the wave ripple on a blob.
 */
export function startWave(b) {
  b.waveActive = true;
  b.waveElapsed = 0;
  if (b.hitLocal) {
    b.mat.uniforms.uHitPoint.value.copy(b.hitLocal);
  }
}

/* ─── Dotted text label helper ─────────────────────────────────────── */
const _labelCanvas = document.createElement('canvas');
const _labelCtx    = _labelCanvas.getContext('2d');

/**
 * Render text as a point cloud of dots.
 * Returns a THREE.Points that spells the text in particles.
 */
function makeDottedLabel(text, color, dotSize) {
  const fontSize = 34;
  const font = `bold ${fontSize}px "Space Grotesk", "Inter", sans-serif`;
  _labelCtx.font = font;
  const metrics = _labelCtx.measureText(text);
  const tw = Math.ceil(metrics.width) + 8;
  const th = fontSize + 16;
  _labelCanvas.width  = tw;
  _labelCanvas.height = th;

  _labelCtx.clearRect(0, 0, tw, th);
  _labelCtx.font = font;
  _labelCtx.fillStyle = '#fff';
  _labelCtx.textBaseline = 'middle';
  _labelCtx.fillText(text, 4, th / 2);

  const imgData = _labelCtx.getImageData(0, 0, tw, th).data;

  // Sample every N-th pixel that is filled → convert to 3D position
  const step = 3;            // sampling density (lower = more dots)
  const scale = 0.025;       // world-units per pixel
  const pts = [];
  for (let y = 0; y < th; y += step) {
    for (let x = 0; x < tw; x += step) {
      const alpha = imgData[(y * tw + x) * 4 + 3];
      if (alpha > 128) {
        pts.push(
          (x - tw / 2) * scale,
          -(y - th / 2) * scale,   // flip Y
          (Math.random() - 0.5) * 0.04  // tiny Z jitter for depth
        );
      }
    }
  }

  // Sort dots left-to-right by X so drawRange reveals them like a typewriter
  const dotCount = pts.length / 3;
  const indices = Array.from({ length: dotCount }, (_, i) => i);
  indices.sort((a, b) => pts[a * 3] - pts[b * 3]);
  const sorted = new Float32Array(pts.length);
  for (let i = 0; i < dotCount; i++) {
    const src = indices[i] * 3;
    sorted[i * 3]     = pts[src];
    sorted[i * 3 + 1] = pts[src + 1];
    sorted[i * 3 + 2] = pts[src + 2];
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(sorted, 3));
  // Start with 0 dots visible — typewriter reveals them
  geo.setDrawRange(0, 0);

  const mat = new THREE.PointsMaterial({
    color,
    size: dotSize || 2.5,
    sizeAttenuation: false,
    transparent: true,
    opacity: 0.85,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  return { points: new THREE.Points(geo, mat), mat, totalDots: dotCount };
}

/**
 * Instantiate one orb per project entry.
 */
export function createOrbs() {
  PROJECTS.forEach((proj, idx) => {
    const seg   = 44 + Math.floor(Math.random() * 12); // clean dot grid, ~2000 vertices
    const baseR = 1.0 + Math.random() * 0.7;
    const ampHi = baseR * 0.35;
    const coeffs = randomCoeffs(baseR, ampHi);

    // Pre-compute unit-sphere angles for this resolution
    const unitGeo = new THREE.SphereGeometry(1, seg, seg);
    const up = unitGeo.attributes.position;
    const unitAngles = new Float64Array(up.count * 2);
    for (let i = 0; i < up.count; i++) {
      const x = up.getX(i), y = up.getY(i), z = up.getZ(i);
      const r0 = Math.sqrt(x * x + y * y + z * z) || 1e-8;
      unitAngles[i * 2]     = Math.acos(Math.max(-1, Math.min(1, y / r0)));
      unitAngles[i * 2 + 1] = Math.atan2(z, x);
    }
    unitGeo.dispose();

    // Point cloud geometry
    const geo = new THREE.SphereGeometry(1, seg, seg);
    const mat = makeDotMaterial(0x3a3a52);

    // Points object for visual rendering
    const points = new THREE.Points(geo, mat);

    // Invisible mesh for raycasting (wireframe won't render, just used for hit detection)
    const hitGeo = new THREE.SphereGeometry(1, 16, 16);
    const hitMat = new THREE.MeshBasicMaterial({ visible: false });
    const hitMesh = new THREE.Mesh(hitGeo, hitMat);

    // Inner core sphere (glows in dark, dark in light)
    const coreR = baseR * 0.28;
    const coreGeo2 = new THREE.SphereGeometry(coreR, 24, 24);
    const coreMat = new THREE.MeshBasicMaterial({
      color: 0x88bbff,
      transparent: true,
      opacity: 0.3,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const coreMesh = new THREE.Mesh(coreGeo2, coreMat);

    // Group to hold all
    const group = new THREE.Group();
    group.add(points);
    group.add(hitMesh);
    group.add(coreMesh);

    // Dotted text label above the orb
    const label = makeDottedLabel(proj.name.toUpperCase(), 0x88bbff, 1.8);
    label.points.position.y = baseR + 0.9;   // float above the orb surface
    group.add(label.points);

    const o = ORB_ORIGINS[idx] ??
      [(Math.random() - 0.5) * 10, (Math.random() - 0.5) * 6, (Math.random() - 0.5) * 4];
    group.position.set(o[0], o[1], o[2]);

    morphGeo(geo, unitAngles, coeffs, baseR);
    // Also morph the hit mesh to roughly match
    morphGeo(hitGeo, (() => {
      const tmpGeo = new THREE.SphereGeometry(1, 16, 16);
      const tp = tmpGeo.attributes.position;
      const ua = new Float64Array(tp.count * 2);
      for (let i = 0; i < tp.count; i++) {
        const x = tp.getX(i), y = tp.getY(i), z = tp.getZ(i);
        const r0 = Math.sqrt(x * x + y * y + z * z) || 1e-8;
        ua[i * 2]     = Math.acos(Math.max(-1, Math.min(1, y / r0)));
        ua[i * 2 + 1] = Math.atan2(z, x);
      }
      tmpGeo.dispose();
      return ua;
    })(), coeffs, baseR);

    parallaxGroup.add(group);

    blobs.push({
      mesh: group,        // the Group — used for position, scale, rotation
      hitMesh,            // invisible mesh for raycasting
      points,             // THREE.Points for rendering
      mat,                // ShaderMaterial
      geo,                // point cloud geometry (high res)
      hitGeo,             // low res geometry for raycasting
      unitAngles, coeffs,
      coeffsTarget: randomCoeffs(baseR, ampHi),
      baseR, ampHi, seg,

      // Morphing
      lerpT: Math.random(),
      morphSpeed: 0.07 + Math.random() * 0.07,

      // Sway (Lissajous)
      origin: new THREE.Vector3(o[0], o[1], o[2]),
      swayPh:  [Math.random() * 6.28, Math.random() * 6.28, Math.random() * 6.28],
      swayAmp: [0.18 + Math.random() * 0.22, 0.12 + Math.random() * 0.18, 0.10 + Math.random() * 0.14],
      swayFrq: [0.20 + Math.random() * 0.14, 0.24 + Math.random() * 0.18, 0.17 + Math.random() * 0.12],

      // Breathing
      brPh:  Math.random() * 6.28,
      brSpd: 0.3 + Math.random() * 0.6,
      brAmp: 0.02 + Math.random() * 0.04,

      // Rotation
      rotSpd: new THREE.Vector3(
        (Math.random() - 0.5) * 0.003,
        (Math.random() - 0.5) * 0.004,
        (Math.random() - 0.5) * 0.002
      ),

      // Interaction
      hovered: false,
      hoverT: 0,
      hitLocal: null,
      projectIdx: idx,

      // Wave ripple state
      waveActive: false,
      waveElapsed: 0,
      waveFade: 0,

      // Inner core
      core: coreMesh,
      coreMat,

      // Dotted label + typewriter
      labelPts: label.points,
      labelMat: label.mat,
      labelTotalDots: label.totalDots,
      labelRevealed: 0,       // current # of dots shown
      labelRevealDone: false, // true once fully typed

      // Unique pulsing rhythm
      pulseFreq1: 1.0 + Math.random() * 2.0,
      pulseFreq2: 2.5 + Math.random() * 3.5,
      pulseMix: 0.1 + Math.random() * 0.35,
      pulsePhase: Math.random() * 6.2832,
      pulseAmp: 0.15 + Math.random() * 0.25,
    });
  });
}
