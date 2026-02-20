/* ═══════════════════════════════════════════════════════════════════
   terminal.js — Live retro terminal overlay (boot sequence + orb nav)
   Styled like a 65816 monitor / embedded system console.
   ═══════════════════════════════════════════════════════════════════ */

import { PROJECTS } from './config.js';

const el = document.getElementById('terminal-overlay');
let lineBuffer = [];
let typing = false;
let queue  = [];
let cursor = null;
let currentResolve = null;

/* ── Boot sequence lines ──────────────────────────────────────────── */
const BOOT_LINES = [
  { text: '> INIT SYSTEM v3.2.1',            delay: 60 },
  { text: '  ROM CHECK ........... OK',       delay: 40 },
  { text: '  RAM  $0000-$7FFF ... OK',        delay: 35 },
  { text: '  VRAM $2100-$21FF ... OK',        delay: 35 },
  { text: '> LOAD FIRMWARE',                  delay: 55 },
  { text: '  READING 0x0400 SECTORS...',      delay: 30 },
  { text: '  CHECKSUM A5F3 .... VALID',       delay: 40 },
  { text: '> CALIBRATING IO',                delay: 50 },
  { text: '  GPIO PINS [0..31]  MAPPED',      delay: 35 },
  { text: '  SPI BUS  CLK 8MHz  READY',       delay: 35 },
  { text: '  I2C ADDR 0x68  ACK',             delay: 40 },
  { text: '> STARTING SERVICES',              delay: 50 },
  { text: '  RENDERER   ......... UP',        delay: 30 },
  { text: '  PARTICLES  ......... UP',        delay: 30 },
  { text: '  AUDIO ENG  ......... UP',        delay: 30 },
  { text: '  NAV CTRL   ......... UP',        delay: 30 },
  { text: '> PORTFOLIO.ORB READY',            delay: 55 },
  { text: '  7 NODES ONLINE',                 delay: 40 },
  { text: '  AWAITING INPUT...',              delay: 45 },
  { text: '',                                 delay: 0  },
];

/* ── Machine code snippets per project ────────────────────────────── */
function genMachineCode(proj, idx) {
  const baseAddr = 0x002000 + idx * 0x100;
  const ha = (a) => a.toString(16).toUpperCase().padStart(6, '0');
  const hb = (n) => n.toString(16).toUpperCase().padStart(2, '0');
  const hw = (n) => n.toString(16).toUpperCase().padStart(4, '0');

  // Pseudo-random but deterministic bytes from project name
  const seed = proj.name.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const rb = (i) => ((seed * 31 + i * 17) & 0xFF);

  const lines = [
    '',
    `; ── TRAVERSE NODE ${idx} ──────────`,
    `; TARGET: ${proj.name.toUpperCase()}`,
    `; TAG:    ${proj.tag.toUpperCase()}`,
    ';',
    `A ${ha(baseAddr)}  C2 30       REP #$30`,
    `A ${ha(baseAddr+2)}  ${hb(rb(0))} ${hb(rb(1))}        LDA #$${hw(seed & 0xFFFF)}`,
    `A ${ha(baseAddr+4)}  ${hb(rb(2))} ${hb(rb(3))} ${hb(rb(4))}     STA $${ha(0x7E0000 + idx * 2)}`,
    `A ${ha(baseAddr+7)}  20 ${hb(rb(5))} ${hb(rb(6))}     JSR $${hw(0xC000 + idx * 0x20)}`,
    `A ${ha(baseAddr+10)} E2 30       SEP #$30`,
    `A ${ha(baseAddr+12)} ${hb(rb(7))}           NOP`,
    `A ${ha(baseAddr+13)} 60           RTS`,
    '',
    `r`,
    `  PB  PC   NVmxDIZC .A   .X   .Y   SP   DP  DB`,
    `; 00 ${hw(baseAddr & 0xFFFF)}  00110000 ${hw(seed & 0xFFFF)} 0000 0000 CFFF 0000 00`,
    '',
    `> EXECUTING NODE[${idx}]...`,
    `  STATUS: ACTIVE`,
  ];

  // Add tech stack as "loaded modules"
  proj.techs.forEach((t, i) => {
    lines.push(`  MODULE ${i}: ${t.toUpperCase()} ... LOADED`);
  });

  lines.push('  AWAITING NEXT INSTRUCTION...');
  lines.push('');

  return lines;
}

/* ── Typing engine ────────────────────────────────────────────────── */
function appendLine(text) {
  const line = document.createElement('div');
  line.className = 'term-line';
  el.appendChild(line);
  lineBuffer.push(line);

  // Keep max ~40 lines visible
  while (lineBuffer.length > 40) {
    const old = lineBuffer.shift();
    old.remove();
  }

  return line;
}

function typeText(lineEl, text, charDelay) {
  return new Promise((resolve) => {
    if (!text) { resolve(); return; }
    let i = 0;
    const iv = setInterval(() => {
      lineEl.textContent = text.slice(0, i + 1) + '█';
      i++;
      if (i >= text.length) {
        clearInterval(iv);
        lineEl.textContent = text;
        resolve();
      }
    }, charDelay);
  });
}

async function processQueue() {
  if (typing) return;
  typing = true;

  while (queue.length > 0) {
    const batch = queue.shift();
    for (const item of batch.lines) {
      const lineEl = appendLine(item.text);
      await typeText(lineEl, item.text, item.delay || 25);
      // Small pause between lines
      await sleep(30 + Math.random() * 40);
    }
    if (batch.resolve) batch.resolve();
  }

  // Show blinking cursor at end
  showCursor();
  typing = false;
}

function showCursor() {
  if (cursor) cursor.remove();
  cursor = appendLine('');
  cursor.textContent = '█';
  cursor.classList.add('term-cursor');
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

/* ── Public API ───────────────────────────────────────────────────── */

/** Run the boot sequence on page load */
export function runBootSequence() {
  if (!el) return;
  el.innerHTML = '';
  lineBuffer = [];

  return new Promise((resolve) => {
    queue.push({
      lines: BOOT_LINES,
      resolve,
    });
    processQueue();
  });
}

/** Show machine code for navigating to a project orb */
export function showOrbCode(idx) {
  if (!el) return;
  if (idx < 0 || idx >= PROJECTS.length) return;

  const proj = PROJECTS[idx];
  const codeLines = genMachineCode(proj, idx);

  queue.push({
    lines: codeLines.map(text => ({ text, delay: 18 })),
    resolve: null,
  });
  processQueue();
}

/** Clear the terminal */
export function clearTerminal() {
  if (!el) return;
  queue.push({
    lines: [
      { text: '> RETURNING TO IDLE...', delay: 30 },
      { text: '  NODES STANDBY', delay: 25 },
      { text: '', delay: 0 },
    ],
    resolve: null,
  });
  processQueue();
}

/** Shader compile transition — called on theme toggle */
export function showShaderCompile(toDark) {
  if (!el) return;
  const mode = toDark ? 'DARK' : 'LIGHT';
  const lines = [
    { text: '', delay: 0 },
    { text: `> RECOMPILE PIPELINE [${mode}]`, delay: 22 },
    { text: '  glslang: vertex.glsl   .... OK', delay: 14 },
    { text: '  glslang: fragment.glsl .... OK', delay: 14 },
    { text: '  glslang: bloom.glsl    .... OK', delay: 14 },
    { text: '  SPIRV-Cross: linking ........ OK', delay: 16 },
    { text: '  Allocating UBO $2000-$20FF', delay: 12 },
    { text: '  Binding descriptor set [0]', delay: 10 },
    { text: `  SET clearColor 0x${toDark ? '06060C' : 'F0F0F4'}`, delay: 12 },
    { text: `  SET bloom.strength ${toDark ? '0.50' : '0.10'}`, delay: 10 },
    { text: `  SET bloom.threshold ${toDark ? '0.40' : '1.40'}`, delay: 10 },
    { text: '  Pipeline rebuilt ✓', delay: 18 },
    { text: '', delay: 0 },
  ];

  queue.push({ lines, resolve: null });
  processQueue();
}
