/* ═══════════════════════════════════════════════════════════════════
   sound.js — Ambient & interaction sounds via Web Audio API
   All sounds are synthesised — no external files needed.
   ═══════════════════════════════════════════════════════════════════ */

let ctx;
let masterGain;
let ambientOsc;
let muted = false;

function ensureCtx() {
  if (ctx) return;
  ctx = new (window.AudioContext || window.webkitAudioContext)();
  masterGain = ctx.createGain();
  masterGain.gain.value = 0.25;
  masterGain.connect(ctx.destination);
}

/* ── Ambient drone (very quiet) ───────────────────────────────────── */
export function startAmbient() {
  ensureCtx();
  if (ambientOsc) return;

  // Two detuned oscillators for a warm pad
  const g = ctx.createGain();
  g.gain.value = 0.03;
  g.connect(masterGain);

  const o1 = ctx.createOscillator();
  o1.type = 'sine';
  o1.frequency.value = 80;
  o1.connect(g);
  o1.start();

  const o2 = ctx.createOscillator();
  o2.type = 'sine';
  o2.frequency.value = 120.5;
  o2.connect(g);
  o2.start();

  ambientOsc = { o1, o2, g };
}

export function stopAmbient() {
  if (!ambientOsc) return;
  ambientOsc.o1.stop();
  ambientOsc.o2.stop();
  ambientOsc = null;
}

/* ── Hover sound (soft high tone) ─────────────────────────────────── */
export function playHover() {
  if (muted || !ctx) return;
  const osc = ctx.createOscillator();
  const g   = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.value = 600 + Math.random() * 200;
  g.gain.setValueAtTime(0.06, ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
  osc.connect(g).connect(masterGain);
  osc.start();
  osc.stop(ctx.currentTime + 0.3);
}

/* ── Click sound (resonant pop) ───────────────────────────────────── */
export function playClick() {
  if (muted || !ctx) return;
  const osc = ctx.createOscillator();
  const g   = ctx.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(900, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.15);
  g.gain.setValueAtTime(0.1, ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
  osc.connect(g).connect(masterGain);
  osc.start();
  osc.stop(ctx.currentTime + 0.25);
}

/* ── Close / back sound ───────────────────────────────────────────── */
export function playClose() {
  if (muted || !ctx) return;
  const osc = ctx.createOscillator();
  const g   = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(400, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.2);
  g.gain.setValueAtTime(0.06, ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
  osc.connect(g).connect(masterGain);
  osc.start();
  osc.stop(ctx.currentTime + 0.3);
}

/* ── Mute toggle ──────────────────────────────────────────────────── */
export function toggleMute() {
  muted = !muted;
  if (masterGain) masterGain.gain.value = muted ? 0 : 0.25;
  return muted;
}

export function isMuted() { return muted; }

/* ── Resume context (needed after user gesture) ───────────────────── */
export function resumeAudio() {
  ensureCtx();
  if (ctx.state === 'suspended') ctx.resume();
  startAmbient();
}
