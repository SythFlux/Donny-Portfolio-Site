/* ═══════════════════════════════════════════════════════════════════
   constellation.js — Simple lines connecting nearby orbs
   ═══════════════════════════════════════════════════════════════════ */

import * as THREE from 'three';
import { blobs }  from './orbs.js';

let linesMesh;
const MAX_DIST = 12;

const _wp  = new THREE.Vector3();
const _wp2 = new THREE.Vector3();

export function createConstellation(parent) {
  const maxLines = blobs.length * (blobs.length - 1) / 2;
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(maxLines * 2 * 3);
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setDrawRange(0, 0);

  const mat = new THREE.LineBasicMaterial({
    color: 0x999999,
    transparent: true,
    opacity: 0.4,
    depthWrite: false,
  });

  linesMesh = new THREE.LineSegments(geo, mat);
  parent.add(linesMesh);
}

export function updateConstellation(dt) {
  if (!linesMesh) return;
  const pos = linesMesh.geometry.attributes.position;
  let idx = 0;

  for (let i = 0; i < blobs.length; i++) {
    blobs[i].mesh.getWorldPosition(_wp);
    for (let j = i + 1; j < blobs.length; j++) {
      blobs[j].mesh.getWorldPosition(_wp2);
      if (_wp.distanceTo(_wp2) < MAX_DIST) {
        pos.setXYZ(idx++, _wp.x, _wp.y, _wp.z);
        pos.setXYZ(idx++, _wp2.x, _wp2.y, _wp2.z);
      }
    }
  }

  linesMesh.geometry.setDrawRange(0, idx);
  pos.needsUpdate = true;
}

export function setConstellationColor(hex, opacity = 0.4) {
  if (linesMesh) {
    linesMesh.material.color.set(hex);
    linesMesh.material.opacity = opacity;
  }
}
