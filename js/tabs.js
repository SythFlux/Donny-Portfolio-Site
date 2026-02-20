/* ═══════════════════════════════════════════════════════════════════
   tabs.js — Instant page switch (no transition)
   ═══════════════════════════════════════════════════════════════════ */

const tabBar = document.getElementById('tab-bar');
const tabs   = tabBar.querySelectorAll('.tab');

let currentTab = 'portfolio';

function getThreeCanvas() {
  return document.querySelector('canvas:not(#hud-canvas):not(#helix-canvas)');
}

function switchToTab(targetTab) {
  if (targetTab === currentTab) return;

  const fromPage = document.getElementById(`page-${currentTab}`);
  const toPage   = document.getElementById(`page-${targetTab}`);
  if (!fromPage || !toPage) return;

  // Tab highlights
  tabs.forEach(t => t.classList.toggle('active', t.dataset.tab === targetTab));

  // Swap pages instantly
  fromPage.classList.remove('active');
  toPage.classList.add('active');

  // Show/hide Three.js canvas
  const c = getThreeCanvas();
  if (c) c.style.opacity = targetTab === 'portfolio' ? '' : '0';

  currentTab = targetTab;
}

export function initTabs() {
  tabs.forEach(tab => {
    tab.addEventListener('click', () => switchToTab(tab.dataset.tab));
  });
}
