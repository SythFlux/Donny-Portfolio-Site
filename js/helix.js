/* ═══════════════════════════════════════════════════════════════════
   helix.js — Hyper-artistic interactive particle cloud background
   for the Contact page.  Features:
   • Hundreds of floating dots with depth parallax
   • 3D rotating dot-sphere behind each info node
   • Constellation lines between nearby particles
   • Mouse-reactive repulsion field
   • Flow lines, grid overlay, tech annotations
   • Accent-coloured, adapts to dark/light theme
   ═══════════════════════════════════════════════════════════════════ */

export function initHelix() {
  const contactPage = document.getElementById('page-contact');
  if (!contactPage) return;

  /* ── Canvas setup ────────────────────────────────────────────── */
  let canvas = document.getElementById('helix-canvas');
  if (!canvas) {
    canvas = document.createElement('canvas');
    canvas.id = 'helix-canvas';
    contactPage.insertBefore(canvas, contactPage.firstChild);
  }
  const ctx = canvas.getContext('2d');

  let w = 0, h = 0, animId = null, isVisible = false, time = 0;
  let mx = -9999, my = -9999;

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = window.innerWidth;
    h = contactPage.scrollHeight || window.innerHeight;
    canvas.width  = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width  = w + 'px';
    canvas.style.height = h + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    initParticles();
    initNodeOrbs();
  }

  /* ── Colour helpers ──────────────────────────────────────────── */
  function getAccent() {
    return getComputedStyle(document.documentElement)
      .getPropertyValue('--accent').trim() || '#5588cc';
  }
  function hexToRgb(hex) {
    const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return r
      ? { r: parseInt(r[1], 16), g: parseInt(r[2], 16), b: parseInt(r[3], 16) }
      : { r: 85, g: 136, b: 204 };
  }
  function rgba(rgb, a) { return `rgba(${rgb.r},${rgb.g},${rgb.b},${a})`; }

  /* ── Particles ───────────────────────────────────────────────── */
  let particles = [];
  const PARTICLE_COUNT = 280;
  const CONNECT_DIST = 100;

  function initParticles() {
    particles = [];
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      particles.push({
        x: Math.random() * w,
        y: Math.random() * h,
        z: 0.3 + Math.random() * 0.7,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.25,
        baseSize: 0.6 + Math.random() * 2.2,
        phase: Math.random() * Math.PI * 2,
      });
    }
  }

  function updateParticles(dt) {
    const mInfluence = 160;
    particles.forEach(p => {
      const dx = p.x - mx;
      const dy = p.y - my;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < mInfluence && dist > 0) {
        const force = (1 - dist / mInfluence) * 0.8 * p.z;
        p.vx += (dx / dist) * force;
        p.vy += (dy / dist) * force;
      }
      p.x += p.vx * p.z;
      p.y += p.vy * p.z;
      p.vx *= 0.97;
      p.vy *= 0.97;
      p.vx += Math.sin(time * 0.0003 + p.phase) * 0.01;
      p.vy += Math.cos(time * 0.0002 + p.phase) * 0.005 - 0.002;
      if (p.x < -20) p.x = w + 20;
      if (p.x > w + 20) p.x = -20;
      if (p.y < -20) p.y = h + 20;
      if (p.y > h + 20) p.y = -20;
    });
  }

  function drawParticles(rgb, dark) {
    const baseA = dark ? 0.35 : 0.2;
    particles.forEach(p => {
      const pulse = 0.7 + 0.3 * Math.sin(time * 0.003 + p.phase);
      const sz = p.baseSize * p.z * pulse;
      const alpha = baseA * p.z * pulse;
      ctx.beginPath();
      ctx.arc(p.x, p.y, sz, 0, Math.PI * 2);
      ctx.fillStyle = rgba(rgb, alpha);
      ctx.fill();
      if (sz > 1.8) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, sz + 3, 0, Math.PI * 2);
        ctx.fillStyle = rgba(rgb, alpha * 0.15);
        ctx.fill();
      }
    });
  }

  function drawConnections(rgb, dark) {
    const maxA = dark ? 0.06 : 0.03;
    for (let i = 0; i < particles.length; i++) {
      const a = particles[i];
      for (let j = i + 1; j < particles.length; j++) {
        const b = particles[j];
        const dx = a.x - b.x, dy = a.y - b.y;
        const dist = dx * dx + dy * dy;
        const maxD = CONNECT_DIST * CONNECT_DIST;
        if (dist < maxD) {
          const alpha = maxA * (1 - dist / maxD) * Math.min(a.z, b.z);
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.strokeStyle = rgba(rgb, alpha);
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }
    }
  }

  /* ── 3D dotted orb behind each info node ─────────────────────── */
  let nodeOrbs = [];

  function initNodeOrbs() {
    const nodes = contactPage.querySelectorAll('.ct-node');
    nodeOrbs = [];
    nodes.forEach((el, i) => {
      const dotCount = 60 + Math.floor(Math.random() * 30);
      const dots = [];
      for (let j = 0; j < dotCount; j++) {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        dots.push({ theta, phi, r: 0.85 + Math.random() * 0.3, size: 0.8 + Math.random() * 1.5 });
      }
      const ringDots = [];
      for (let j = 0; j < 40; j++) {
        ringDots.push({ angle: (j / 40) * Math.PI * 2, size: 0.5 + Math.random() * 0.8 });
      }
      nodeOrbs.push({
        el, dots, ringDots,
        rotY: Math.random() * Math.PI * 2,
        rotX: 0.3 + Math.random() * 0.4,
        speed: 0.3 + Math.random() * 0.2,
        hoverT: 0,
        radius: 50 + Math.random() * 15,
        ringRadius: 65 + Math.random() * 10,
        ringTilt: 0.3 + Math.random() * 0.3,
      });
    });
  }

  function updateNodeOrbs(dt) {
    nodeOrbs.forEach(orb => {
      const rect = orb.el.getBoundingClientRect();
      const scrollY = contactPage.scrollTop || 0;
      orb.cx = rect.left + rect.width * 0.8;
      orb.cy = rect.top + rect.height * 0.5 + scrollY;
      const hovered = orb.el.matches(':hover');
      orb.hoverT += ((hovered ? 1 : 0) - orb.hoverT) * 0.06;
      orb.rotY += orb.speed * (1 + orb.hoverT * 1.5) * dt * 0.001;
    });
  }

  function drawNodeOrbs(rgb, dark) {
    const baseA = dark ? 0.3 : 0.18;
    nodeOrbs.forEach(orb => {
      const { cx, cy, dots, ringDots, rotY, rotX, hoverT, radius, ringRadius, ringTilt } = orb;
      const r = radius * (1 + hoverT * 0.15);
      const alpha = baseA * (0.6 + hoverT * 0.4);

      // Sphere dots
      dots.forEach(d => {
        const sp = Math.sin(d.phi), cp = Math.cos(d.phi);
        const st = Math.sin(d.theta + rotY), ct = Math.cos(d.theta + rotY);
        let x3 = sp * ct * d.r, y3 = cp * d.r, z3 = sp * st * d.r;
        const cosRx = Math.cos(rotX), sinRx = Math.sin(rotX);
        const y3r = y3 * cosRx - z3 * sinRx;
        const z3r = y3 * sinRx + z3 * cosRx;
        const depth = 0.5 + z3r * 0.5;
        const px = cx + x3 * r, py = cy + y3r * r;
        const sz = d.size * depth * (1 + hoverT * 0.3);
        ctx.beginPath();
        ctx.arc(px, py, sz, 0, Math.PI * 2);
        ctx.fillStyle = rgba(rgb, alpha * depth);
        ctx.fill();
      });

      // Ring dots
      ringDots.forEach(rd => {
        const a = rd.angle + rotY * 0.7;
        const rx = Math.cos(a) * ringRadius * (1 + hoverT * 0.1);
        const ry = Math.sin(a) * ringRadius * ringTilt;
        const rz = Math.sin(a) * ringRadius * 0.4;
        const cosRx2 = Math.cos(rotX * 0.5), sinRx2 = Math.sin(rotX * 0.5);
        const ryR = ry * cosRx2 - rz * sinRx2;
        const depth = 0.5 + Math.sin(a) * 0.2;
        ctx.beginPath();
        ctx.arc(cx + rx, cy + ryR, rd.size * depth, 0, Math.PI * 2);
        ctx.fillStyle = rgba(rgb, alpha * 0.6 * depth);
        ctx.fill();
      });

      // Lines to nearby particles on hover
      if (hoverT > 0.05) {
        const lineA = 0.04 * hoverT;
        particles.forEach(p => {
          const dx = p.x - cx, dy = p.y - cy;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 140) {
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.lineTo(p.x, p.y);
            ctx.strokeStyle = rgba(rgb, lineA * (1 - dist / 140));
            ctx.lineWidth = 0.4;
            ctx.stroke();
          }
        });
      }
    });
  }

  /* ── Flow lines ──────────────────────────────────────────────── */
  const flowLines = [];
  for (let i = 0; i < 8; i++) {
    flowLines.push({
      y: Math.random(), amp: 30 + Math.random() * 80,
      freq: 0.002 + Math.random() * 0.003,
      speed: 0.0005 + Math.random() * 0.001,
      phase: Math.random() * Math.PI * 2,
      width: 0.3 + Math.random() * 0.7,
    });
  }

  function drawFlowLines(rgb, dark) {
    const baseA = dark ? 0.04 : 0.025;
    flowLines.forEach(fl => {
      const baseY = h * fl.y;
      ctx.beginPath();
      for (let x = 0; x <= w; x += 3) {
        const y = baseY + Math.sin(x * fl.freq + time * fl.speed + fl.phase) * fl.amp
                        + Math.sin(x * fl.freq * 2.3 + time * fl.speed * 1.5) * fl.amp * 0.3;
        if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = rgba(rgb, baseA);
      ctx.lineWidth = fl.width;
      ctx.stroke();
    });
  }

  /* ── Grid overlay ────────────────────────────────────────────── */
  function drawGrid(rgb, dark) {
    const gridA = dark ? 0.015 : 0.012;
    const step = 80;
    for (let x = 0; x < w; x += step) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h);
      ctx.strokeStyle = rgba(rgb, gridA); ctx.lineWidth = 0.3; ctx.stroke();
    }
    for (let y = 0; y < h; y += step) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y);
      ctx.strokeStyle = rgba(rgb, gridA); ctx.lineWidth = 0.3; ctx.stroke();
    }
    const crossA = dark ? 0.06 : 0.035;
    for (let x = 0; x < w; x += step) {
      for (let y = 0; y < h; y += step) {
        ctx.beginPath();
        ctx.moveTo(x - 3, y); ctx.lineTo(x + 3, y);
        ctx.moveTo(x, y - 3); ctx.lineTo(x, y + 3);
        ctx.strokeStyle = rgba(rgb, crossA); ctx.lineWidth = 0.4; ctx.stroke();
      }
    }
  }

  /* ── Annotations ─────────────────────────────────────────────── */
  const annotations = [
    { x: 0.06, y: 0.08, t: 'SYS.CONTACT_MODULE', s: 'v2.6.0' },
    { x: 0.88, y: 0.12, t: 'NODE_CLUSTER', s: '\u03c3 = 4.2918' },
    { x: 0.04, y: 0.55, t: 'PARTICLE_FIELD', s: 'n = 280' },
    { x: 0.90, y: 0.60, t: 'ORBITAL_SYNC', s: '\u03c9 = 0.3 rad/s' },
    { x: 0.08, y: 0.90, t: 'TRANSMISSION_READY', s: 'latency: 0.00ms' },
    { x: 0.85, y: 0.88, t: 'VECTOR_FIELD', s: '\u03c6 = 1.61803' },
  ];

  function drawAnnotations(rgb, dark) {
    const baseA = dark ? 0.12 : 0.06;
    annotations.forEach((a, i) => {
      const ax = w * a.x, ay = h * a.y;
      const pulse = 0.6 + 0.4 * Math.sin(time * 0.002 + i * 1.7);
      const al = baseA * pulse;
      ctx.strokeStyle = rgba(rgb, al * 0.6);
      ctx.lineWidth = 0.5;
      ctx.beginPath(); ctx.moveTo(ax - 8, ay - 10); ctx.lineTo(ax - 8, ay + 20); ctx.stroke();
      ctx.font = '9px "Courier New", monospace';
      ctx.fillStyle = rgba(rgb, al);
      ctx.fillText(a.t, ax, ay);
      ctx.font = '8px "Courier New", monospace';
      ctx.fillStyle = rgba(rgb, al * 0.55);
      ctx.fillText(a.s, ax, ay + 13);
    });
  }

  /* ── Corner brackets ─────────────────────────────────────────── */
  function drawCorners(rgb, dark) {
    const a = dark ? 0.1 : 0.06;
    const sz = 20, margin = 30;
    ctx.strokeStyle = rgba(rgb, a); ctx.lineWidth = 0.7;
    ctx.beginPath(); ctx.moveTo(margin, margin + sz); ctx.lineTo(margin, margin); ctx.lineTo(margin + sz, margin); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(w - margin - sz, margin); ctx.lineTo(w - margin, margin); ctx.lineTo(w - margin, margin + sz); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(margin, h - margin - sz); ctx.lineTo(margin, h - margin); ctx.lineTo(margin + sz, h - margin); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(w - margin - sz, h - margin); ctx.lineTo(w - margin, h - margin); ctx.lineTo(w - margin, h - margin - sz); ctx.stroke();
  }

  /* ── Main loop ───────────────────────────────────────────────── */
  function draw() {
    if (!isVisible) return;
    const accent = getAccent();
    const rgb = hexToRgb(accent);
    const dark = document.documentElement.dataset.theme === 'dark';
    const dt = 16;
    ctx.clearRect(0, 0, w, h);
    time += dt;
    updateParticles(dt);
    updateNodeOrbs(dt);
    drawGrid(rgb, dark);
    drawFlowLines(rgb, dark);
    drawConnections(rgb, dark);
    drawParticles(rgb, dark);
    drawNodeOrbs(rgb, dark);
    drawAnnotations(rgb, dark);
    drawCorners(rgb, dark);
    animId = requestAnimationFrame(draw);
  }

  /* ── Mouse tracking ──────────────────────────────────────────── */
  contactPage.addEventListener('mousemove', e => {
    mx = e.clientX;
    my = e.clientY + (contactPage.scrollTop || 0);
  });
  contactPage.addEventListener('mouseleave', () => { mx = -9999; my = -9999; });

  /* ── 3D tilt on info nodes ───────────────────────────────────── */
  contactPage.querySelectorAll('.ct-node').forEach(node => {
    node.addEventListener('mousemove', e => {
      const rect = node.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width - 0.5;
      const py = (e.clientY - rect.top) / rect.height - 0.5;
      node.style.transform = `translateY(-6px) rotateX(${-py * 8}deg) rotateY(${px * 8}deg)`;
    });
    node.addEventListener('mouseleave', () => { node.style.transform = ''; });
  });

  /* ── Show / hide ─────────────────────────────────────────────── */
  function show() {
    if (isVisible) return;
    isVisible = true;
    resize();
    draw();
  }
  function hide() {
    isVisible = false;
    if (animId) { cancelAnimationFrame(animId); animId = null; }
  }

  const observer = new MutationObserver(() => {
    contactPage.classList.contains('active') ? show() : hide();
  });
  observer.observe(contactPage, { attributes: true, attributeFilter: ['class'] });
  window.addEventListener('resize', () => { if (isVisible) resize(); });
  if (contactPage.classList.contains('active')) show();
}
