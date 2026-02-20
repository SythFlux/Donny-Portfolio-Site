/* ═══════════════════════════════════════════════════════════════════
   parallax.js — Subtle scene tilt following the mouse cursor
   Adds a gentle rotation to the whole scene group, making the 3D
   feel more immersive even when not dragging.
   ═══════════════════════════════════════════════════════════════════ */

import * as THREE from 'three';

/** Container group that holds everything — rotate this for parallax. */
export const parallaxGroup = new THREE.Group();
// Added to scene in main.js

const target = { x: 0, y: 0 };
const current = { x: 0, y: 0 };
const STRENGTH = 0.015;  // max tilt in radians
const EASE     = 0.04;   // lerp speed

export function initParallax() {
  window.addEventListener('pointermove', (e) => {
    // Normalise cursor to [-1, 1]
    target.x = (e.clientY / window.innerHeight - 0.5) * 2;
    target.y = (e.clientX / window.innerWidth  - 0.5) * 2;
  });
}

export function updateParallax() {
  current.x += (target.x - current.x) * EASE;
  current.y += (target.y - current.y) * EASE;

  parallaxGroup.rotation.x = current.x * STRENGTH;
  parallaxGroup.rotation.y = current.y * STRENGTH;
}
