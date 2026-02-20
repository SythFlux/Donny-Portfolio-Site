/* ═══════════════════════════════════════════════════════════════════
   cursor.js — Custom dot + trailing ring cursor
   ═══════════════════════════════════════════════════════════════════ */

export function initCursor() {
  const dot  = document.getElementById('cursor-dot');
  const ring = document.getElementById('cursor-ring');
  if (!dot || !ring) return;

  let mx = window.innerWidth / 2;
  let my = window.innerHeight / 2;
  let rx = mx, ry = my; // ring position (lerped)

  // Track mouse position
  window.addEventListener('pointermove', (e) => {
    mx = e.clientX;
    my = e.clientY;
    dot.style.left  = mx + 'px';
    dot.style.top   = my + 'px';
  });

  // Smooth trailing ring via RAF
  function animateRing() {
    rx += (mx - rx) * 0.15;
    ry += (my - ry) * 0.15;
    ring.style.left = rx + 'px';
    ring.style.top  = ry + 'px';
    requestAnimationFrame(animateRing);
  }
  animateRing();

  // Hover state on interactive elements
  const hoverTargets = 'a, button, .nav-item, .color-swatch, .toggle-track, canvas';
  document.addEventListener('pointerover', (e) => {
    if (e.target.closest(hoverTargets)) {
      document.body.classList.add('cursor-hover');
    }
  });
  document.addEventListener('pointerout', (e) => {
    if (e.target.closest(hoverTargets)) {
      document.body.classList.remove('cursor-hover');
    }
  });

  // Click pulse
  document.addEventListener('pointerdown', () => {
    document.body.classList.add('cursor-click');
  });
  document.addEventListener('pointerup', () => {
    document.body.classList.remove('cursor-click');
  });

  // Hide cursor when leaving window
  document.addEventListener('pointerleave', () => {
    dot.style.opacity  = '0';
    ring.style.opacity = '0';
  });
  document.addEventListener('pointerenter', () => {
    dot.style.opacity  = '';
    ring.style.opacity = '';
  });
}
