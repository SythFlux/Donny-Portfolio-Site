/* ═══════════════════════════════════════════════════════════════════
   interaction.js — Raycaster hover & click on orbs
   ═══════════════════════════════════════════════════════════════════ */

import * as THREE from 'three';
import { PROJECTS }         from './config.js';
import { blobs }            from './orbs.js';
import { renderer, camera } from './scene.js';
import { openProject, closePanel, state as panelState } from './panel.js';
import { playHover, playClick, playClose, resumeAudio } from './sound.js';

const rc    = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const orbLabel = document.getElementById('orb-label');

let hoveredBlob = null;

let navIdx = 0; // current keyboard-selected orb index

export function initInteraction() {
  renderer.domElement.addEventListener('pointermove', onPointerMove);
  renderer.domElement.addEventListener('click', onClick);

  // On touch devices, handle tap directly (no hover state)
  renderer.domElement.addEventListener('touchend', onTouchTap, { passive: true });

  // Resume audio context on first interaction (browser policy)
  const resumeOnce = () => {
    resumeAudio();
    window.removeEventListener('click', resumeOnce);
    window.removeEventListener('keydown', resumeOnce);
    window.removeEventListener('touchend', resumeOnce);
  };
  window.addEventListener('click', resumeOnce);
  window.addEventListener('keydown', resumeOnce);
  window.addEventListener('touchend', resumeOnce);

  // Arrow key navigation — when panel is CLOSED, cycle between orbs
  window.addEventListener('keydown', onKeyNav);
}

/** Keyboard orb navigation (when no panel is open) */
function onKeyNav(e) {
  if (panelState.panelOpen) return; // panel.js handles arrows when open

  if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
    e.preventDefault();
    navIdx = (navIdx + 1) % blobs.length;
    highlightOrb(navIdx);
  } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
    e.preventDefault();
    navIdx = (navIdx - 1 + blobs.length) % blobs.length;
    highlightOrb(navIdx);
  } else if (e.key === 'Enter') {
    e.preventDefault();
    playClick();
    openProject(navIdx);
  }
}

/** Visually highlight an orb via keyboard (fake hover) */
function highlightOrb(idx) {
  // Un-hover previous
  if (hoveredBlob) {
    hoveredBlob.hovered = false;
    hoveredBlob.hitLocal = null;
  }
  const b = blobs[idx];
  b.hovered = true;
  hoveredBlob = b;
  playHover();

  orbLabel.textContent = PROJECTS[b.projectIdx].name;
  orbLabel.classList.add('show');

  // Position label at orb's screen-space position
  const wp = new THREE.Vector3();
  b.mesh.getWorldPosition(wp);
  wp.project(camera);
  orbLabel.style.left = ((wp.x * 0.5 + 0.5) * window.innerWidth + 18) + 'px';
  orbLabel.style.top  = ((-wp.y * 0.5 + 0.5) * window.innerHeight - 14) + 'px';

  // Sync nav highlight
  document.querySelectorAll('.nav-item').forEach((el, i) =>
    el.classList.toggle('active', i === idx));
}

function onPointerMove(e) {
  mouse.x =  (e.clientX / window.innerWidth)  * 2 - 1;
  mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

  rc.setFromCamera(mouse, camera);
  const hits = rc.intersectObjects(blobs.map(b => b.hitMesh));

  if (panelState.panelOpen) {
    // While panel is open, only allow hover on the focused orb
    const focusedBlob = blobs[panelState.focusedIdx];
    if (focusedBlob && hits.length) {
      const hit = hits[0];
      if (hit.object === focusedBlob.hitMesh) {
        const localPt = focusedBlob.mesh.worldToLocal(hit.point.clone());
        focusedBlob.hitLocal = localPt;
        focusedBlob.hovered = true;
      } else {
        if (focusedBlob.hitLocal) focusedBlob.hitLocal = null;
      }
    } else if (focusedBlob) {
      if (focusedBlob.hitLocal) focusedBlob.hitLocal = null;
    }
    return;
  }

  if (hits.length) {
    const hit = hits[0];
    const b = blobs.find(b => b.hitMesh === hit.object);
    if (b) {
      // Store hit point in the mesh's local space for vertex displacement
      const localPt = b.mesh.worldToLocal(hit.point.clone());
      b.hitLocal = localPt;

      if (hoveredBlob !== b) {
        if (hoveredBlob) { hoveredBlob.hovered = false; hoveredBlob.hitLocal = null; }
        b.hovered = true;
        hoveredBlob = b;
        orbLabel.textContent = PROJECTS[b.projectIdx].name;
        orbLabel.classList.add('show');
        renderer.domElement.style.cursor = 'none';
        playHover();

        // Sync nav highlight
        document.querySelectorAll('.nav-item').forEach((el, i) =>
          el.classList.toggle('active', i === b.projectIdx));
      }
    }
    orbLabel.style.left = (e.clientX + 18) + 'px';
    orbLabel.style.top  = (e.clientY - 14) + 'px';
  } else if (hoveredBlob) {
    hoveredBlob.hovered = false;
    hoveredBlob.hitLocal = null;
    hoveredBlob = null;
    orbLabel.classList.remove('show');
    renderer.domElement.style.cursor = 'none';
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
  }
}

function onClick(e) {
  // If panel is open and click is NOT on the panel itself, close it
  if (panelState.panelOpen) {
    const panel = document.getElementById('detail-panel');
    if (!panel.contains(e.target)) {
      closePanel();  // closePanel already plays playClose()
    }
    return;
  }
  if (hoveredBlob) {
    playClick();
    openProject(hoveredBlob.projectIdx);
  }
}

/** Touch handler for mobile — raycast on tap since there's no hover */
function onTouchTap(e) {
  if (!e.changedTouches || !e.changedTouches.length) return;
  const touch = e.changedTouches[0];
  mouse.x =  (touch.clientX / window.innerWidth)  * 2 - 1;
  mouse.y = -(touch.clientY / window.innerHeight) * 2 + 1;

  // Close panel if tapping outside it
  if (panelState.panelOpen) {
    const panel = document.getElementById('detail-panel');
    const el = document.elementFromPoint(touch.clientX, touch.clientY);
    if (!panel.contains(el)) closePanel();
    return;
  }

  rc.setFromCamera(mouse, camera);
  const hits = rc.intersectObjects(blobs.map(b => b.hitMesh));
  if (hits.length) {
    const hit = hits[0];
    const b = blobs.find(b => b.hitMesh === hit.object);
    if (b) {
      playClick();
      openProject(b.projectIdx);
    }
  }
}
