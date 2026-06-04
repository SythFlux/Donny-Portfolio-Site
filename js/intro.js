/* ═══════════════════════════════════════════════════════════════════
   intro.js — Cinematic entrance for the whole scene.
   The canvas fades up from the background while the camera dollies in
   from far away, and the orbs fly out from the centre to their places.
   ═══════════════════════════════════════════════════════════════════ */

import * as THREE from 'three';
import { blobs } from './orbs.js';
import { renderer, camera, controls } from './scene.js';

let introT = 0;
let introDone = false;
const INTRO_DURATION = 2.2;  // seconds — per-orb fly-out
const STAGGER = 0.15;        // seconds between each orb
const CAM_DOLLY = 3.2;       // seconds — camera glide into place
const CANVAS_FADE = 2.4;     // seconds — whole scene fades up

// Camera dolly state
const _camRest  = new THREE.Vector3();
const _camStart = new THREE.Vector3();
const _camTarget = new THREE.Vector3();
let _origMaxDist = Infinity;

export function initIntro() {
  // Move all orbs to centre, scale to 0
  for (const b of blobs) {
    b._introTarget = b.mesh.position.clone();
    b.mesh.position.set(0, 0, 0);
    b.mesh.scale.setScalar(0.001);
    b.mesh.visible = true;
  }

  // ── Camera dolly: start pushed far back, glide in to the resting spot ──
  _camRest.copy(camera.position);
  _camTarget.copy(controls.target);
  // Push the start position back along the view direction (further from target)
  _camStart.copy(_camTarget).addScaledVector(
    _camRest.clone().sub(_camTarget), 2.4
  );
  camera.position.copy(_camStart);
  controls.enabled = false; // no user input until the intro settles
  // OrbitControls clamps to maxDistance every update() — lift it so the far
  // dolly start isn't snapped in, then restore once the intro settles.
  _origMaxDist = controls.maxDistance;
  controls.maxDistance = Infinity;

  // ── Whole canvas fades up from the background colour ──
  const canvas = renderer.domElement;
  canvas.style.opacity = '0';
  canvas.style.transition = `opacity ${CANVAS_FADE}s ease`;
  requestAnimationFrame(() => { canvas.style.opacity = '1'; });

  // Start UI fading in alongside the scene
  const fadeIn = (el) => {
    if (!el) return;
    el.style.opacity = '0';
    el.style.transition = 'opacity 1.4s ease';
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

  // ── Camera dolly-in (decelerating ease) ──
  const camP = Math.min(introT / CAM_DOLLY, 1);
  camera.position.lerpVectors(_camStart, _camRest, easeOutCubic(camP));
  if (camP < 1) allDone = false;

  // ── Orbs fly out from the centre, staggered ──
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
    // Snap to the exact resting position and hand control back to the user
    camera.position.copy(_camRest);
    controls.maxDistance = _origMaxDist;
    controls.enabled = true;
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

/** Cubic ease-out: fast start, gentle deceleration into place */
function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}
