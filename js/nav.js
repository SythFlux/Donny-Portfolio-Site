/* ═══════════════════════════════════════════════════════════════════
   nav.js — Side navigation (populated from project data)
   ═══════════════════════════════════════════════════════════════════ */

import { PROJECTS } from './config.js';
import { blobs }    from './orbs.js';
import { openProject } from './panel.js';
import { playHover, playClick } from './sound.js';

export const sideNav = document.getElementById('side-nav');

/**
 * Build one nav-item per project and wire up hover / click.
 */
export function initNav() {
  PROJECTS.forEach((proj, idx) => {
    const el = document.createElement('div');
    el.className  = 'nav-item';
    el.dataset.idx = idx;
    el.innerHTML  = `<div class="nav-dot"></div><div class="nav-label">${proj.name}</div>`;

    el.addEventListener('click', () => {
      playClick();
      openProject(idx);
    });

    el.addEventListener('mouseenter', () => {
      playHover();
      blobs[idx].hovered = true;
      el.classList.add('active');
    });
    el.addEventListener('mouseleave', () => {
      blobs[idx].hovered = false;
      el.classList.remove('active');
    });

    sideNav.appendChild(el);
  });
}
