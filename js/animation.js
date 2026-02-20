/* ═══════════════════════════════════════════════════════════════════
   animation.js — Main render / update loop
   ═══════════════════════════════════════════════════════════════════ */

import * as THREE from 'three';
import { renderer, scene, camera, controls } from './scene.js';
import { blobs, morphGeo, updateWaveRipple, startWave } from './orbs.js';
import { randomCoeffs }                       from './harmonics.js';
import { state as panelState }                  from './panel.js';
import { updateParticles }                     from './particles.js';
import { renderComposer, setDofFocus }         from './postprocessing.js';
import { updateConstellation }                 from './constellation.js';
import { updateIntro, isIntroDone }            from './intro.js';
import { updateParallax }                      from './parallax.js';
import { getTheme, isDark }                    from './darkmode.js';
import { updateOrbFx }                         from './orbfx.js';
import { updateConstruct }                      from './construct.js';

const clock    = new THREE.Clock();
const _invQuat = new THREE.Quaternion();
let _dofAperture = 0.0; // smoothed aperture value
let _dofFocus    = 22.0; // smoothed focus distance

/** Cubic ease-in-out */
function easeIO(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export function startLoop() {
  requestAnimationFrame(tick);
}

function tick() {
  requestAnimationFrame(tick);
  const dt = Math.min(clock.getDelta(), 0.05);
  const t  = clock.elapsedTime;

  // ── Intro animation ────────────────────────────────────────────────
  updateIntro(dt);

  // ── Parallax ───────────────────────────────────────────────────────
  updateParallax();

  // ── Per-blob update ────────────────────────────────────────────────
  const theme = getTheme();
  for (const b of blobs) {
    // SH coefficient morphing
    b.lerpT += dt * b.morphSpeed;
    if (b.lerpT >= 1) {
      b.lerpT = 0;
      for (let i = 0; i < 12; i++) b.coeffs[i] = b.coeffsTarget[i];
      b.coeffsTarget = randomCoeffs(b.baseR, b.ampHi);
    }
    const s = b.lerpT * b.lerpT * (3 - 2 * b.lerpT); // smoothstep
    const mixed = new Float64Array(12);
    for (let i = 0; i < 12; i++) mixed[i] = b.coeffs[i] + (b.coeffsTarget[i] - b.coeffs[i]) * s;
    morphGeo(b.geo, b.unitAngles, mixed, b.baseR);

    // Wave ripple — GPU-driven via shader uniforms
    if (b.hovered && !b.waveActive) {
      startWave(b);
      b.waveFade = 0.0;
    }

    // Smooth fade for wave amplitude
    const waveFadeTarget = b.hovered ? 1.0 : 0.0;
    b.waveFade += (waveFadeTarget - b.waveFade) * (b.hovered ? 0.12 : 0.03);
    b.mat.uniforms.uWaveAmp.value = 1.0 * b.waveFade;

    if (b.waveActive) {
      if (b.hovered && b.hitLocal) {
        b.mat.uniforms.uHitPoint.value.copy(b.hitLocal);
        b.waveElapsed += dt;
        b.mat.uniforms.uWaveTime.value = b.waveElapsed;
      } else {
        // Keep running the wave while fading out
        b.waveElapsed += dt;
        b.mat.uniforms.uWaveTime.value = b.waveElapsed;
        // Kill wave only after fully faded
        if (b.waveFade < 0.005) {
          b.waveActive = false;
          b.mat.uniforms.uWaveTime.value = -10.0;
          b.mat.uniforms.uWaveAmp.value = 0.0;
        }
      }
    }

    // Focused orb — gentle random ripples all over
    const isFocused = panelState.panelOpen && panelState.focusedIdx === b.projectIdx;
    if (isFocused) {
      b.mat.uniforms.uNoiseTime.value += dt;
      // Smoothly ramp noise up
      b.mat.uniforms.uNoiseAmp.value += (0.18 - b.mat.uniforms.uNoiseAmp.value) * 0.05;
    } else {
      // Smoothly ramp noise down
      b.mat.uniforms.uNoiseAmp.value += (0.0 - b.mat.uniforms.uNoiseAmp.value) * 0.06;
    }

    // Sway position (Lissajous)
    b.mesh.position.x = b.origin.x + Math.sin(t * b.swayFrq[0] + b.swayPh[0]) * b.swayAmp[0];
    b.mesh.position.y = b.origin.y + Math.sin(t * b.swayFrq[1] + b.swayPh[1]) * b.swayAmp[1];
    b.mesh.position.z = b.origin.z + Math.cos(t * b.swayFrq[2] + b.swayPh[2]) * b.swayAmp[2];

    // Gentle rotation
    b.mesh.rotation.x += b.rotSpd.x;
    b.mesh.rotation.y += b.rotSpd.y;
    b.mesh.rotation.z += b.rotSpd.z;

    // Breathing scale
    const breath = 1 + Math.sin(t * b.brSpd + b.brPh) * b.brAmp;

    // Unique per-orb pulse (two-harmonic sine)
    const p1 = Math.sin(t * b.pulseFreq1 + b.pulsePhase);
    const p2 = Math.sin(t * b.pulseFreq2 + b.pulsePhase * 1.7);
    const pulseRaw = (p1 + p2 * b.pulseMix) / (1.0 + b.pulseMix);
    const pulseNorm = pulseRaw * 0.5 + 0.5; // 0 → 1
    b.mat.uniforms.uPulseGlow.value = pulseNorm * b.pulseAmp;

    // Core sphere pulsing & opacity
    if (b.core) {
      const baseCoreOp = isDark
        ? 0.15 + pulseNorm * 0.4   // dark: pulsing 0.15 → 0.55
        : 0.18 + pulseNorm * 0.1;  // light: subtle 0.18 → 0.28
      const targetCoreOp = panelState.panelOpen ? (isFocused ? baseCoreOp : 0.0) : baseCoreOp;
      b.coreMat.opacity += (targetCoreOp - b.coreMat.opacity) * 0.08;
      b.core.scale.setScalar(1.0 + pulseNorm * 0.1);
    }

    // Hover interpolation
    const hTarget = b.hovered ? 1 : 0;
    b.hoverT += (hTarget - b.hoverT) * 0.08;
    const hScale = 1 + b.hoverT * 0.18;
    b.mesh.scale.setScalar(breath * hScale);

    // Color lerp — adaptive to theme (via shader uniform)
    const hoverColor = new THREE.Color(theme.wireHover);
    const baseColor  = new THREE.Color(theme.wireHex);
    const targetColor = (b.hovered || isFocused) ? hoverColor : baseColor;
    b.mat.uniforms.uColor.value.lerp(targetColor, (b.hovered || isFocused) ? 0.14 : 0.06);

    // Opacity — heavily dim non-focused orbs when panel is open
    const targetOpacity = panelState.panelOpen ? (isFocused ? 1.0 : 0.04) : 1.0;
    b.mat.uniforms.uOpacity.value += (targetOpacity - b.mat.uniforms.uOpacity.value) * 0.08;

    // ── Dotted label above orb ─────────────────────────────────────
    if (b.labelPts) {
      // Billboard — cancel parent group rotation, then face camera
      _invQuat.copy(b.mesh.quaternion).invert();
      b.labelPts.quaternion.copy(_invQuat).multiply(camera.quaternion);

      // Typewriter reveal: ~800 dots/sec, staggered by orb index after intro
      if (!b.labelRevealDone) {
        const introDelay = b.projectIdx * 0.15 + 2.2; // match intro stagger
        if (t > introDelay) {
          b.labelRevealed = Math.min(b.labelRevealed + dt * 800, b.labelTotalDots);
          b.labelPts.geometry.setDrawRange(0, Math.floor(b.labelRevealed));
          if (b.labelRevealed >= b.labelTotalDots) b.labelRevealDone = true;
        }
      }

      // Color: follow orb color lerp
      const labelTarget = (b.hovered || isFocused) ? hoverColor : baseColor;
      b.labelMat.color.lerp(labelTarget, (b.hovered || isFocused) ? 0.18 : 0.06);

      // Opacity: brighter on hover, dim when panel hides this orb
      const baseLabelOp = 0.55 + b.hoverT * 0.45;
      const labelOp = panelState.panelOpen ? (isFocused ? baseLabelOp : 0.0) : baseLabelOp;
      b.labelMat.opacity += (labelOp - b.labelMat.opacity) * 0.08;

      // Blending follows theme
      const labelBlend = isDark ? THREE.AdditiveBlending : THREE.NormalBlending;
      if (b.labelMat.blending !== labelBlend) {
        b.labelMat.blending = labelBlend;
        b.labelMat.needsUpdate = true;
      }
    }
  }

  // ── Per-orb unique decorations ───────────────────────────────────
  updateOrbFx(t, dt);

  // ── Background construct rotation ─────────────────────────────────
  updateConstruct(dt);

  // ── Particles ──────────────────────────────────────────────────────
  updateParticles(t);

  // ── Constellation lines + packets ───────────────────────────────
  updateConstellation(dt);

  // ── Camera fly-to animation ────────────────────────────────────────
  if (panelState.camActive) {
    panelState.camT += dt * 1.1;
    if (panelState.camT >= 1) {
      panelState.camT = 1;
      panelState.camActive = false;
      if (panelState.camReturning) controls.enabled = true;
    }
    const e = easeIO(Math.min(panelState.camT, 1));
    camera.position.lerpVectors(panelState.camFrom, panelState.camTo, e);
    controls.target.lerpVectors(panelState.camLookFrom, panelState.camLookTo, e);
  }

  // ── Depth of field — only active when an orb is focused/clicked ──
  {
    let targetAperture = 0.0;
    let targetFocus = 22.0;

    const focusedB = panelState.panelOpen ? blobs[panelState.focusedIdx] : null;
    if (focusedB) {
      const wp = new THREE.Vector3();
      focusedB.mesh.getWorldPosition(wp);
      targetFocus = camera.position.distanceTo(wp);
      targetAperture = 0.0006;
    }

    // Smooth transitions so DOF doesn't snap or jitter
    _dofFocus    += (targetFocus - _dofFocus) * 0.08;
    _dofAperture += (targetAperture - _dofAperture) * 0.05;
    setDofFocus(_dofFocus, _dofAperture);
  }

  controls.update();
  // Use post-processing composer instead of direct render
  renderComposer();
}
