/* ═══════════════════════════════════════════════════════════════════
   panel.js — Detail panel logic (open / close / camera fly-to)
   ═══════════════════════════════════════════════════════════════════ */

import * as THREE from 'three';
import { PROJECTS }          from './config.js';
import { blobs }             from './orbs.js';
import { camera, controls }  from './scene.js';
import { sideNav }           from './nav.js';
import { playClose, playClick }         from './sound.js';
import { showOrbCode, clearTerminal }   from './terminal.js';
import { showHud, hideHud }             from './hud.js';

// ── DOM refs ─────────────────────────────────────────────────────────
const panel    = document.getElementById('detail-panel');
const dTag     = document.getElementById('d-tag');
const dTitle   = document.getElementById('d-title');
const dMeta    = document.getElementById('d-meta');
const dBody    = document.getElementById('d-body');
const closeBtn = document.getElementById('detail-close');
const prevBtn  = document.getElementById('detail-prev');
const nextBtn  = document.getElementById('detail-next');
const counterEl= document.getElementById('panel-counter');
const headerEl    = document.getElementById('header');
const hintEl      = document.getElementById('hover-hint');
const terminalEl  = document.getElementById('terminal-overlay');
const toggleEl    = document.getElementById('dark-toggle');
const headerRight = document.querySelector('#header .header-right');

// ── Shared mutable state (object so other modules can read & write) ──
export const state = {
  panelOpen: false,
  focusedIdx: -1,
  camFrom: null,
  camTo: null,
  camLookFrom: null,
  camLookTo: null,
  camT: 1,
  camActive: false,
  camReturning: false,
  // Saved position from before any panel was opened
  savedCamPos: null,
  savedCamTarget: null,
};

// ── Open project ─────────────────────────────────────────────────────
export function openProject(idx) {
  if (state.panelOpen && state.focusedIdx === idx) return;

  const wasAlreadyOpen = state.panelOpen;

  // Un-highlight previously focused orb
  if (state.focusedIdx >= 0 && state.focusedIdx < blobs.length) {
    blobs[state.focusedIdx].hovered = false;
  }

  // Save the camera position before the first zoom-in
  // (only if we're not already in an open panel, i.e. not navigating between orbs)
  if (!state.panelOpen) {
    state.savedCamPos    = camera.position.clone();
    state.savedCamTarget = controls.target.clone();
  }

  state.focusedIdx = idx;
  state.panelOpen  = true;

  // Highlight the newly focused orb
  blobs[idx].hovered = true;

  const proj = PROJECTS[idx];
  const b    = blobs[idx];

  showOrbCode(idx);

  dTag.textContent   = proj.tag;
  dTitle.textContent  = proj.name;
  dMeta.innerHTML     = proj.techs.map(t => `<span class="meta-chip">${t}</span>`).join('');

  // Update project counter  01 / 07
  const total = PROJECTS.length;
  counterEl.textContent = `${String(idx + 1).padStart(2, '0')} / ${String(total).padStart(2, '0')}`;

  // Image preview — wrapped in HUD frame
  let imgWrap = panel.querySelector('.detail-image-wrap');
  if (!imgWrap) {
    imgWrap = document.createElement('div');
    imgWrap.className = 'detail-image-wrap';
    const imgEl = document.createElement('img');
    imgEl.className = 'detail-image';
    imgWrap.appendChild(imgEl);
    panel.querySelector('.detail-content').insertBefore(imgWrap, dBody);
  }
  const imgEl = imgWrap.querySelector('.detail-image');
  if (proj.image) { imgEl.src = proj.image; imgWrap.style.display = 'block'; }
  else { imgWrap.style.display = 'none'; }

  dBody.innerHTML = proj.description
    + (proj.link ? `<a class="detail-link" href="${proj.link}" target="_blank"><span>View Project</span> <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M1 7h11M8 3l4 4-4 4" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg></a>` : '');

  // Re-trigger CSS animations (only on first open, not cycling)
  if (!wasAlreadyOpen) {
    panel.classList.remove('open');
    void panel.offsetWidth;
  }
  panel.classList.add('open');

  headerEl.classList.add('panel-active');
  hintEl.classList.add('hidden');
  if (terminalEl) terminalEl.classList.add('hidden');

  // Activate the HUD overlay
  showHud(idx);

  // Smoothly slide the toggle to center of visible area (only on first open, not when cycling)
  if (!wasAlreadyOpen) slideToggleToCenter();

  // Update side-nav highlight to match focused orb
  document.querySelectorAll('.nav-item').forEach((el, i) =>
    el.classList.toggle('active', i === idx));

  // hide hover tooltip
  document.getElementById('orb-label').classList.remove('show');
  document.querySelector('canvas').style.cursor = 'default';

  // Fly camera to orb from the current viewing direction
  const wp = new THREE.Vector3();
  b.mesh.getWorldPosition(wp);

  // Direction from orb toward current camera position
  const dir = camera.position.clone().sub(wp).normalize();
  // Place camera at a fixed distance along that direction, offset slightly right+up
  // so the right-side panel doesn't cover the orb
  const dist = 7.5;
  const right = new THREE.Vector3().crossVectors(dir, camera.up).normalize();
  const camTarget = wp.clone()
    .add(dir.multiplyScalar(dist))
    .add(right.multiplyScalar(-1.5))  // shift left in screen space (orb stays visible beside panel)
    .add(new THREE.Vector3(0, 0.6, 0)); // slight upward lift

  state.camFrom     = camera.position.clone();
  state.camLookFrom = controls.target.clone();
  state.camTo       = camTarget;
  state.camLookTo   = wp.clone();
  state.camT = 0;
  state.camActive = true;
  state.camReturning = false;
  controls.enabled = false;
}

// ── Close panel ──────────────────────────────────────────────────────
export function closePanel() {
  playClose();

  // Un-highlight the focused orb
  if (state.focusedIdx >= 0 && state.focusedIdx < blobs.length) {
    blobs[state.focusedIdx].hovered = false;
  }

  clearTerminal();

  state.panelOpen  = false;
  state.focusedIdx = -1;
  panel.classList.remove('open');
  headerEl.classList.remove('panel-active');
  hintEl.classList.remove('hidden');
  if (terminalEl) terminalEl.classList.remove('hidden');

  // Deactivate HUD overlay
  hideHud();

  // Slide header-right (toggle + color picker) back to original position
  if (headerRight) headerRight.style.transform = '';

  // Clear nav highlight
  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));

  state.camFrom     = camera.position.clone();
  state.camLookFrom = controls.target.clone();
  state.camTo       = state.savedCamPos  || new THREE.Vector3(0, 2, 22);
  state.camLookTo   = state.savedCamTarget || new THREE.Vector3(0, 0, 0);
  state.camT = 0;
  state.camActive = true;
  state.camReturning = true;
}

// ── Event listeners ──────────────────────────────────────────────────
export function initPanel() {
  closeBtn.addEventListener('click', closePanel);
  prevBtn.addEventListener('click', () => navigateOrb(-1));
  nextBtn.addEventListener('click', () => navigateOrb(1));
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && state.panelOpen) closePanel();
    if ((e.key === 'ArrowUp'   || e.key === 'ArrowLeft')  && state.panelOpen) navigateOrb(-1);
    if ((e.key === 'ArrowDown' || e.key === 'ArrowRight') && state.panelOpen) navigateOrb(1);
  });
  // Re-center toggle on resize if panel is open
  window.addEventListener('resize', () => {
    if (state.panelOpen) slideToggleToCenter();
  });
}

/** Navigate to the previous (-1) or next (+1) project orb */
function navigateOrb(dir) {
  if (!state.panelOpen) return;
  playClick();
  const total = PROJECTS.length;
  const next = (state.focusedIdx + dir + total) % total;
  openProject(next);
}

/** Slide the header-right group (toggle + color picker) to the horizontal center of the visible area */
function slideToggleToCenter() {
  if (!headerRight) return;
  const panelW = panel.offsetWidth || 480;
  const visibleWidth = window.innerWidth - panelW;
  const visibleCenter = visibleWidth / 2;

  // Temporarily remove transform to measure natural position
  headerRight.style.transition = 'none';
  headerRight.style.transform = '';
  const rect = headerRight.getBoundingClientRect();
  const groupCenter = rect.left + rect.width / 2;
  // Force layout read
  void headerRight.offsetWidth;
  // Re-enable transition and apply
  headerRight.style.transition = '';
  const dx = visibleCenter - groupCenter;
  headerRight.style.transform = `translateX(${dx}px)`;
}
