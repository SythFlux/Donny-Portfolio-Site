/* ═══════════════════════════════════════════════════════════════════
   interaction.js — Raycaster hover & click on orbs
   ═══════════════════════════════════════════════════════════════════ */

import * as THREE from 'three';
import { PROJECTS }         from './config.js';
import { blobs }            from './orbs.js';
import { renderer, camera } from './scene.js';
import { openProject, closePanel, state as panelState, redirectToUrl } from './panel.js';
import { playHover, playClick, playClose, resumeAudio } from './sound.js';
import { isTouch } from './device.js';

const rc    = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const orbLabel = document.getElementById('orb-label');

let hoveredBlob = null;

let navIdx = 0; // current keyboard-selected orb index

// Touch gesture tracking — used to tell a real "tap" apart from a drag/orbit.
// Without this, orbiting the camera registers as a tap and opens a panel,
// which makes the orbs feel impossible to drag/look around on mobile.
let touchStart = null;       // { x, y, time } of a single-finger touchstart
let lastTouchEnd = 0;        // timestamp — used to ignore iOS's ghost click
const TAP_MOVE_PX  = 14;     // movement beyond this = drag, not a tap
const TAP_TIME_MS  = 500;    // held longer than this = not a tap

export function initInteraction() {
  // Touch devices have no right-click / scroll-wheel — rewrite the hint to
  // describe the gestures that actually work.
  if (isTouch) {
    const hint = document.getElementById('hover-hint');
    if (hint) {
      hint.innerHTML =
        'Tap an orb to explore &nbsp;·&nbsp; Drag to orbit &nbsp;·&nbsp; Pinch to zoom';
    }
  }

  renderer.domElement.addEventListener('pointermove', onPointerMove);
  renderer.domElement.addEventListener('click', onClick);

  // On touch devices, handle tap directly (no hover state).
  // touchend is non-passive so we can preventDefault() and stop iOS from
  // firing a synthesized "ghost click" ~300ms later — that ghost click was
  // landing on the canvas and instantly closing the panel a tap had just
  // opened (worst for left-side orbs the sliding panel hadn't covered yet).
  renderer.domElement.addEventListener('touchstart', onTouchStart, { passive: true });
  renderer.domElement.addEventListener('touchend', onTouchTap, { passive: false });

  // Block iOS Safari's edge swipe-back/forward gesture. Dragging to orbit from
  // near the screen edge otherwise peeks a blank white "previous page" in from
  // the side (and can slide it across the whole screen) — the white flicker.
  // Scoped to canvas touches near the edge so UI taps are unaffected.
  if (isTouch) {
    const EDGE_PX = 30;
    renderer.domElement.addEventListener('touchstart', (e) => {
      const t = e.touches[0];
      if (!t) return;
      if ((t.clientX <= EDGE_PX || t.clientX >= window.innerWidth - EDGE_PX) && e.cancelable) {
        e.preventDefault();
      }
    }, { passive: false });
  }

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
  // Ignore the synthesized "ghost click" iOS fires right after a touch — the
  // touchend handler already dealt with the tap. Without this, the ghost click
  // can close the panel the tap just opened.
  if (performance.now() - lastTouchEnd < 700) return;

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
    const proj = PROJECTS[hoveredBlob.projectIdx];
    // If a special redirect URL is defined on the project, run the zoom+fade redirect
    if (proj && proj.redirectUrl) {
      redirectToUrl(hoveredBlob.projectIdx, proj.redirectUrl);
    } else {
      openProject(hoveredBlob.projectIdx);
    }
  }
}

/** Record where a single-finger touch began so we can detect a tap vs a drag */
function onTouchStart(e) {
  // Multi-finger gestures (pinch-zoom / two-finger pan) are never taps
  if (e.touches.length !== 1) { touchStart = null; return; }
  const t = e.touches[0];
  touchStart = { x: t.clientX, y: t.clientY, time: performance.now() };
}

/** Touch handler for mobile — raycast on tap since there's no hover */
function onTouchTap(e) {
  if (!e.changedTouches || !e.changedTouches.length) return;

  // Suppress the synthesized ghost click that would otherwise follow.
  lastTouchEnd = performance.now();
  if (e.cancelable) e.preventDefault();

  // Ignore if other fingers are still down (mid-gesture)
  if (e.touches && e.touches.length > 0) { touchStart = null; return; }

  const touch = e.changedTouches[0];

  // Only treat this as a tap if the finger barely moved and was brief.
  // A larger move / longer hold means the user was orbiting or panning.
  const start = touchStart;
  touchStart = null;
  if (!start) return;
  const moved = Math.hypot(touch.clientX - start.x, touch.clientY - start.y);
  const held  = performance.now() - start.time;
  const isTap = moved < TAP_MOVE_PX && held < TAP_TIME_MS;

  mouse.x =  (touch.clientX / window.innerWidth)  * 2 - 1;
  mouse.y = -(touch.clientY / window.innerHeight) * 2 + 1;

  // Close panel if tapping outside it (allow even a slightly looser tap here)
  if (panelState.panelOpen) {
    const panel = document.getElementById('detail-panel');
    const el = document.elementFromPoint(touch.clientX, touch.clientY);
    if (isTap && !panel.contains(el)) closePanel();
    return;
  }

  if (!isTap) return; // it was a drag/orbit — leave the camera be

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
