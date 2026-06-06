/* ═══════════════════════════════════════════════════════════════════
   device.js — Central device & quality detection
   One source of truth for "is this a phone / touch / low-power device?"
   so every module can scale its work accordingly.
   ═══════════════════════════════════════════════════════════════════ */

// Touch device = no real hover capability (covers phones & tablets)
export const isTouch =
  window.matchMedia('(hover: none)').matches ||
  'ontouchstart' in window ||
  (navigator.maxTouchPoints || 0) > 0;

// Treat narrow OR touch screens as "mobile" for layout/perf decisions
export const isMobile = isTouch || window.innerWidth < 768;

// Respect the OS "reduce motion" accessibility setting
export const prefersReducedMotion =
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Cap the render resolution. iPhones choke on 3× retina fill-rate and can drop
// canvas tiles to white under GPU-memory pressure, so render at 1× on mobile.
export const pixelRatioCap = isMobile ? 1 : 2;

// The actual device-pixel-ratio we render at, already clamped.
export const dpr = Math.min(window.devicePixelRatio || 1, pixelRatioCap);

// Scalar (0–1) for decorative element counts (HUD particles, etc.)
export const quality = isMobile ? 0.45 : 1;
