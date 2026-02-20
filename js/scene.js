/* ═══════════════════════════════════════════════════════════════════
   scene.js — Three.js renderer, scene, camera, controls & lights
   ═══════════════════════════════════════════════════════════════════ */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// ── Renderer ─────────────────────────────────────────────────────────
export const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setClearColor(0xf0f0f4);
document.body.appendChild(renderer.domElement);

// Suppress right-click context menu on the canvas so right-drag pans
renderer.domElement.addEventListener('contextmenu', (e) => e.preventDefault());

// ── Scene ────────────────────────────────────────────────────────────
export const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xf0f0f4, 28, 52);

// ── Camera ───────────────────────────────────────────────────────────
export const camera = new THREE.PerspectiveCamera(
  42, window.innerWidth / window.innerHeight, 0.1, 200
);
camera.position.set(0, 2, 22);

// ── Controls ─────────────────────────────────────────────────────────
export const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping  = true;
controls.dampingFactor  = 0.06;
controls.minDistance     = 8;
controls.maxDistance     = 40;
controls.enablePan      = true;
controls.panSpeed       = 0.6;
controls.maxPolarAngle  = Math.PI * 0.78;
controls.minPolarAngle  = Math.PI * 0.22;
controls.mouseButtons   = {
  LEFT:   THREE.MOUSE.ROTATE,
  MIDDLE: THREE.MOUSE.DOLLY,
  RIGHT:  THREE.MOUSE.PAN,
};

// ── Lighting ─────────────────────────────────────────────────────────
scene.add(new THREE.AmbientLight(0xffffff, 0.4));
const dirLight = new THREE.DirectionalLight(0xffffff, 0.25);
dirLight.position.set(5, 10, 7);
scene.add(dirLight);

// ── Resize handler ───────────────────────────────────────────────────
export function handleResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
