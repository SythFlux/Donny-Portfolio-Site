/* ═══════════════════════════════════════════════════════════════════
   intro.js — Staggered entrance animation for orbs + UI
   Orbs start collapsed at centre then fly out to their positions.
   ═══════════════════════════════════════════════════════════════════ */

import * as THREE from 'three';
import { blobs } from './orbs.js';

let introT = 0;
let introDone = false;
const INTRO_DURATION = 2.2; // seconds
const STAGGER = 0.15;       // seconds between each orb

export function initIntro() {
  // Move all orbs to centre, scale to 0
  for (const b of blobs) {
    b._introTarget = b.mesh.position.clone();
    b.mesh.position.set(0, 0, 0);
    b.mesh.scale.setScalar(0.001);
    b.mesh.visible = true;
  }

  // Start UI fading in immediately alongside the orbs
  const fadeIn = (el) => {
    el.style.opacity = '0';
    el.style.transition = 'opacity 1.2s ease';
    // Trigger on next frame so the transition fires
    requestAnimationFrame(() => { el.style.opacity = '1'; });
  };
  fadeIn(document.getElementById('header'));
  fadeIn(document.getElementById('side-nav'));
  fadeIn(document.getElementById('hover-hint'));
}

export function updateIntro(dt) {
  if (introDone) return false;

  introT += dt;

  let allDone = true;
  blobs.forEach((b, i) => {
    const startAt = i * STAGGER;
    const local = (introT - startAt) / INTRO_DURATION;
    if (local <= 0) {
      allDone = false;
      return;
    }
    const t = Math.min(local, 1);

    // Elastic ease-out for punchy feel
    const ease = elasticOut(t);

    b.mesh.position.lerpVectors(
      new THREE.Vector3(0, 0, 0),
      b._introTarget,
      ease
    );
    b.mesh.scale.setScalar(Math.max(0.001, ease));

    if (t < 1) allDone = false;
  });

  if (allDone) {
    introDone = true;
  }

  return !introDone; // true = still playing
}

export function isIntroDone() {
  return introDone;
}

/** Elastic ease-out: overshoots then settles */
function elasticOut(t) {
  if (t === 0 || t === 1) return t;
  const p = 0.4;
  return Math.pow(2, -10 * t) * Math.sin((t - p / 4) * (2 * Math.PI) / p) + 1;
}
