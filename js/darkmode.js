/* ═══════════════════════════════════════════════════════════════════
   darkmode.js — Dark / light mode toggle with smooth transition
   ═══════════════════════════════════════════════════════════════════ */

import * as THREE from 'three';
import { renderer, scene } from './scene.js';
import { blobs }           from './orbs.js';
import { setParticleColor } from './particles.js';
import { setConstellationColor } from './constellation.js';
import { setBloomParams } from './postprocessing.js';
import { showShaderCompile } from './terminal.js';
import { updateConstructTheme } from './construct.js';

export let isDark = false;

/* ── Color accent system ──────────────────────────────────────────── */
const COLOR_ACCENTS = {
  default: {
    light: { wire: 0x3a3a52, hover: 0x2266dd, constellation: 0x999999 },
    dark:  { wire: 0x88bbff, hover: 0x66ddff, constellation: 0x4466aa },
  },
  blue: {
    light: { wire: 0x2244aa, hover: 0x0055ff, constellation: 0x6688bb },
    dark:  { wire: 0x4488ff, hover: 0x66aaff, constellation: 0x3366cc },
  },
  green: {
    light: { wire: 0x4a7a00, hover: 0x76b900, constellation: 0x6a9933 },
    dark:  { wire: 0x76b900, hover: 0x99dd22, constellation: 0x558800 },
  },
  purple: {
    light: { wire: 0x5522aa, hover: 0x8844ee, constellation: 0x7755bb },
    dark:  { wire: 0x9966ff, hover: 0xbb88ff, constellation: 0x6644cc },
  },
  cyan: {
    light: { wire: 0x006666, hover: 0x00aaaa, constellation: 0x448888 },
    dark:  { wire: 0x00cccc, hover: 0x44eeff, constellation: 0x228899 },
  },
  orange: {
    light: { wire: 0x884411, hover: 0xcc6622, constellation: 0x996644 },
    dark:  { wire: 0xee6622, hover: 0xff8844, constellation: 0xaa5522 },
  },
  pink: {
    light: { wire: 0x882244, hover: 0xdd4488, constellation: 0x995566 },
    dark:  { wire: 0xdd4488, hover: 0xff66aa, constellation: 0xaa3366 },
  },
};

let currentAccent = 'default';

export function setAccentColor(name) {
  if (!COLOR_ACCENTS[name]) return;
  currentAccent = name;
  applyTheme(isDark); // re-apply with new accent
}

export function getAccentColors() {
  const accent = COLOR_ACCENTS[currentAccent] || COLOR_ACCENTS.default;
  return isDark ? accent.dark : accent.light;
}

const THEMES = {
  light: {
    bg: 0xf0f0f4,
    fogColor: 0xf0f0f4,
    wire: '#3a3a52',
    wireHex: 0x3a3a52,
    wireHover: 0x2266dd,
    particleColor: 0x888888,
    constellationColor: 0x999999,
    constellationOpacity: 0.5,
    bodyBg: '#f0f0f4',
    textColor: '#1a1a1a',
    blending: THREE.NormalBlending,
  },
  dark: {
    bg: 0x06060c,
    fogColor: 0x06060c,
    wire: '#88bbff',
    wireHex: 0x88bbff,
    wireHover: 0x66ddff,
    particleColor: 0x334466,
    constellationColor: 0x4466aa,
    constellationOpacity: 0.8,
    bodyBg: '#06060c',
    textColor: '#e8e8e8',
    blending: THREE.AdditiveBlending,
  },
};

const tmpColor = new THREE.Color();

export function applyTheme(dark) {
  isDark = dark;
  const t = dark ? THEMES.dark : THEMES.light;
  const accent = getAccentColors();

  renderer.setClearColor(t.bg);
  scene.fog.color.set(t.fogColor);

  // CSS custom properties for all UI elements
  document.body.style.background = t.bodyBg;
  document.body.style.color = t.textColor;
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';

  // Set --accent CSS custom property for panel accent elements
  const accentColor = new THREE.Color(accent.wire);
  document.documentElement.style.setProperty('--accent', `#${accentColor.getHexString()}`);

  // Reset blob dot colors and blending mode — use accent wire color
  for (const b of blobs) {
    b.mat.uniforms.uColor.value.set(accent.wire);
    b.mat.blending = t.blending;
    b.mat.needsUpdate = true;

    // Switch inner core: bright glow in dark, dark core in light
    if (b.coreMat) {
      b.coreMat.color.set(dark ? accent.wire : 0x080808);
      b.coreMat.blending = dark ? THREE.AdditiveBlending : THREE.NormalBlending;
      b.coreMat.needsUpdate = true;
    }

    // Dotted label color & blending
    if (b.labelMat) {
      b.labelMat.color.set(accent.wire);
      b.labelMat.blending = dark ? THREE.AdditiveBlending : THREE.NormalBlending;
      b.labelMat.needsUpdate = true;
    }
  }

  setParticleColor(t.particleColor);
  setConstellationColor(accent.constellation, t.constellationOpacity);
  updateConstructTheme(dark, accent.wire);

  // Terminal text matches accent wire color
  const termEl = document.getElementById('terminal-overlay');
  if (termEl) {
    const c = new THREE.Color(accent.wire);
    termEl.style.color = `#${c.getHexString()}`;
  }

  // Bloom: glow for dark mode, minimal for light mode
  if (dark) {
    setBloomParams(0.5, 0.7, 0.4);
  } else {
    setBloomParams(0.1, 0.4, 1.4);
  }
}

export function toggleDarkMode() {
  const goingDark = !isDark;
  showShaderCompile(goingDark);
  applyTheme(goingDark);
}

export function getTheme() {
  const base = isDark ? THEMES.dark : THEMES.light;
  const accent = getAccentColors();
  return { ...base, wireHex: accent.wire, wireHover: accent.hover };
}
