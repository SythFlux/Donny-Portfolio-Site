import * as THREE from 'three';

// Lighting optimised for a transparent scene — the model needs to
// pop against the city canvas below without any scene background.
export function setupEnvironment(scene) {
  scene.fog = null;

  // Strong ambient so model reads on any background colour
  const ambient = new THREE.AmbientLight(0xffffff, 3.8);
  scene.add(ambient);

  // Hard key from front-top-left
  const key = new THREE.DirectionalLight(0xffffff, 5.5);
  key.position.set(2, 6, 4);
  scene.add(key);

  // Cool-tinted fill from opposite rear — adds colour depth
  const fill = new THREE.DirectionalLight(0xddeeff, 2.2);
  fill.position.set(-3, 3, -2);
  scene.add(fill);

  // Hot rim / back light — crisp silhouette edge against city bg
  const rim = new THREE.SpotLight(0xffffff, 100);
  rim.position.set(-3, 6, -5);
  rim.target.position.set(0, 0, 0);
  rim.angle    = 0.35;
  rim.penumbra = 0.5;
  scene.add(rim);
  scene.add(rim.target);

  // Soft bottom bounce — lifts underside shadows
  const bounce = new THREE.DirectionalLight(0xffffff, 0.7);
  bounce.position.set(0, -3, 2);
  scene.add(bounce);
}

export function animateEnvironment(_time) {
  // Static studio
}
