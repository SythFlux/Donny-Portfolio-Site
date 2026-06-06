// ── UI sound effects ──────────────────────────────────────────
// Everything is SYNTHESIZED with the Web Audio API — no audio files to load,
// and the tones stay in keeping with the clean transit/tech aesthetic.
// A single AudioContext is created lazily on the first user gesture (browser
// autoplay policy), and a mute toggle (persisted to localStorage) lets people
// turn it all off.

let actx   = null;
let master = null;
let enabled = !(typeof localStorage !== 'undefined' && localStorage.getItem('taiwan-sfx') === 'off');

function ctx() {
  if (!actx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    actx = new AC();
    master = actx.createGain();
    master.gain.value = 0.32;            // keep everything gentle
    master.connect(actx.destination);
  }
  if (actx.state === 'suspended') actx.resume();
  return actx;
}

// One short enveloped oscillator "voice" (attack → exponential decay).
function voice(freq, start, dur, opts = {}) {
  const { type = 'sine', peak = 0.2, attack = 0.006, glideTo = null, pan = 0 } = opts;
  const o = actx.createOscillator();
  const g = actx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, start);
  if (glideTo) o.frequency.exponentialRampToValueAtTime(glideTo, start + dur);

  let out = g;
  if (pan && actx.createStereoPanner) {
    const p = actx.createStereoPanner(); p.pan.value = pan; g.connect(p); out = p;
  }
  o.connect(g); out.connect(master);

  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(peak, start + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  o.start(start);
  o.stop(start + dur + 0.03);
}

function play(notes) {
  if (!enabled) return;
  const c = ctx(); if (!c) return;
  const t0 = c.currentTime;
  notes.forEach((n) => voice(n.f, t0 + (n.t || 0), n.d || 0.12, n));
}

export const sfx = {
  // Small tick — generic buttons, stops, cards, chips.
  click()   { play([{ f: 880,  d: 0.07, type: 'triangle', peak: 0.10 }]); },
  // Faint blip — hovering the big menu buttons.
  hover()   { play([{ f: 1280, d: 0.05, type: 'sine',     peak: 0.04 }]); },
  // Two-note rise — committing to "Explore" / "Learn".
  confirm() { play([
    { f: 587.33, d: 0.10,            type: 'triangle', peak: 0.12 },
    { f: 880,    d: 0.18, t: 0.07,   type: 'triangle', peak: 0.13 },
  ]); },
  // Gentle two-note arrival chime (à la a metro door bell) for travelling
  // between stations, with a soft shimmering octave on top.
  travel()  { play([
    { f: 659.25, d: 0.50,            type: 'sine', peak: 0.16, pan: -0.18 },  // E5
    { f: 987.77, d: 0.55, t: 0.10,   type: 'sine', peak: 0.15, pan:  0.18 },  // B5
    { f: 1318.5, d: 0.40, t: 0.10,   type: 'sine', peak: 0.05 },             // shimmer
  ]); },
  // Soft sweeps for opening / closing overlays (the map).
  open()  { play([{ f: 300, glideTo: 760, d: 0.20, type: 'sine', peak: 0.10 }]); },
  close() { play([{ f: 720, glideTo: 280, d: 0.20, type: 'sine', peak: 0.10 }]); },

  isEnabled() { return enabled; },
  setEnabled(on) {
    enabled = on;
    try { localStorage.setItem('taiwan-sfx', on ? 'on' : 'off'); } catch (_) {}
    if (on) this.click();                 // little confirmation when switching on
  },
};

export function initSfx() {
  // Warm up / resume the context on the very first gesture (autoplay policy).
  const kick = () => { ctx(); window.removeEventListener('pointerdown', kick); };
  window.addEventListener('pointerdown', kick, { once: true });

  // Hover blip — only the two headline menu buttons, so it stays a treat.
  document.addEventListener('mouseover', (e) => {
    const btn = e.target.closest && e.target.closest('.menu-btn');
    if (btn && !btn._sfxHover) { btn._sfxHover = true; sfx.hover(); }
  });
  document.addEventListener('mouseout', (e) => {
    const btn = e.target.closest && e.target.closest('.menu-btn');
    if (btn) btn._sfxHover = false;
  });

  // Generic click router. Station changes play travel() from main.js (they can
  // be triggered without a DOM click — e.g. from the map), so they're skipped
  // here to avoid doubling up.
  document.addEventListener('click', (e) => {
    const el = e.target.closest && e.target.closest('a, button, .qa-photo[data-full]');
    if (!el) return;
    if (el.closest('#explore-btn, #learn-btn')) { sfx.confirm(); return; }
    if (el.closest('#map-fab'))     { sfx.open();  return; }
    if (el.closest('#mm-exit'))     { sfx.close(); return; }
    if (el.closest('#sfx-toggle'))  return;                 // owns its own behaviour
    if (el.closest('.exp-stop, .stop')) return;             // → travel() in main.js
    sfx.click();
  });

  // Mute toggle button.
  const toggle = document.getElementById('sfx-toggle');
  if (toggle) {
    const sync = () => {
      toggle.classList.toggle('sfx-muted', !sfx.isEnabled());
      toggle.setAttribute('aria-pressed', sfx.isEnabled() ? 'true' : 'false');
      toggle.setAttribute('aria-label', sfx.isEnabled() ? 'Mute sound effects' : 'Unmute sound effects');
    };
    toggle.addEventListener('click', () => { sfx.setEnabled(!sfx.isEnabled()); sync(); });
    sync();
  }
}
