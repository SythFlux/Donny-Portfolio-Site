/* ═══════════════════════════════════════════════════════════════════
   particles.js — Floating dust / particles in the background
   ═══════════════════════════════════════════════════════════════════ */

import * as THREE from 'three';

let points;
const COUNT = 600;
const SPREAD = 40;

export function createParticles(parent) {
  const geo = new THREE.BufferGeometry();
  const positions = new Float32Array(COUNT * 3);
  const sizes     = new Float32Array(COUNT);
  const phases    = new Float32Array(COUNT); // for individual drift

  for (let i = 0; i < COUNT; i++) {
    positions[i * 3]     = (Math.random() - 0.5) * SPREAD;
    positions[i * 3 + 1] = (Math.random() - 0.5) * SPREAD * 0.7;
    positions[i * 3 + 2] = (Math.random() - 0.5) * SPREAD;
    sizes[i]  = 0.02 + Math.random() * 0.04;
    phases[i] = Math.random() * Math.PI * 2;
  }

  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('aSize',    new THREE.BufferAttribute(sizes, 1));
  geo.setAttribute('aPhase',   new THREE.BufferAttribute(phases, 1));

  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uTime:  { value: 0 },
      uColor: { value: new THREE.Color(0x888888) },
      uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
    },
    vertexShader: /* glsl */`
      attribute float aSize;
      attribute float aPhase;
      uniform float uTime;
      uniform float uPixelRatio;
      varying float vAlpha;

      void main() {
        vec3 p = position;
        // gentle drift
        p.x += sin(uTime * 0.08 + aPhase) * 0.4;
        p.y += cos(uTime * 0.06 + aPhase * 1.3) * 0.25;
        p.z += sin(uTime * 0.07 + aPhase * 0.7) * 0.3;

        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = aSize * uPixelRatio * (180.0 / -mv.z);

        // fade with distance
        float dist = length(mv.xyz);
        vAlpha = smoothstep(30.0, 5.0, dist) * 0.55;
      }
    `,
    fragmentShader: /* glsl */`
      uniform vec3 uColor;
      varying float vAlpha;

      void main() {
        // soft circle
        float d = length(gl_PointCoord - 0.5);
        if (d > 0.5) discard;
        float alpha = smoothstep(0.5, 0.15, d) * vAlpha;
        gl_FragColor = vec4(uColor, alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  points = new THREE.Points(geo, mat);
  parent.add(points);

  return points;
}

export function updateParticles(elapsed) {
  if (!points) return;
  points.material.uniforms.uTime.value = elapsed;
}

/** Update particle color for dark / light mode */
export function setParticleColor(hex) {
  if (!points) return;
  points.material.uniforms.uColor.value.set(hex);
}
