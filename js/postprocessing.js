/* ═══════════════════════════════════════════════════════════════════
   postprocessing.js — Bloom + vignette via Three.js EffectComposer
   ═══════════════════════════════════════════════════════════════════ */

import * as THREE from 'three';
import { EffectComposer }  from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass }      from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass }      from 'three/addons/postprocessing/ShaderPass.js';
import { BokehPass }       from 'three/addons/postprocessing/BokehPass.js';
import { renderer, scene, camera } from './scene.js';

let composer;
let bloomPass;
let bokehPass;

/* ── Custom vignette shader ───────────────────────────────────────── */
const VignetteShader = {
  uniforms: {
    tDiffuse:  { value: null },
    uDarkness: { value: 0.35 },
    uOffset:   { value: 0.9 },
  },
  vertexShader: /* glsl */`
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse;
    uniform float uDarkness;
    uniform float uOffset;
    varying vec2 vUv;
    void main() {
      vec4 color = texture2D(tDiffuse, vUv);
      float dist = distance(vUv, vec2(0.5));
      float vig  = smoothstep(uOffset, uOffset - 0.45, dist);
      color.rgb  = mix(color.rgb * (1.0 - uDarkness), color.rgb, vig);
      gl_FragColor = color;
    }
  `,
};

export function initPostProcessing() {
  const size = new THREE.Vector2();
  renderer.getSize(size);

  composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));

  bloomPass = new UnrealBloomPass(size, 0.1, 0.4, 1.4);
  composer.addPass(bloomPass);

  bokehPass = new BokehPass(scene, camera, {
    focus:    22.0,
    aperture: 0.0,
    maxblur:  0.004,
  });
  composer.addPass(bokehPass);

  const vignette = new ShaderPass(VignetteShader);
  composer.addPass(vignette);

  return composer;
}

export function resizePostProcessing() {
  if (!composer) return;
  const w = window.innerWidth;
  const h = window.innerHeight;
  composer.setSize(w, h);
}

export function renderComposer() {
  if (composer) composer.render();
}

export function getComposer() {
  return composer;
}

/** Adjust bloom parameters dynamically (e.g. per-theme) */
export function setBloomParams(strength, radius, threshold) {
  if (!bloomPass) return;
  bloomPass.strength  = strength;
  bloomPass.radius    = radius;
  bloomPass.threshold = threshold;
}

/** Update DOF focus distance and aperture (call from animation loop) */
export function setDofFocus(focusDist, aperture) {
  if (!bokehPass) return;
  bokehPass.uniforms['focus'].value = focusDist;
  if (aperture !== undefined) bokehPass.uniforms['aperture'].value = aperture;
}
