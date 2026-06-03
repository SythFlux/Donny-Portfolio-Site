import * as THREE from 'three';

export function setupEnvironment(scene) {
  // Clean white studio — no fog, just pure white
  scene.fog = null;

  // Soft ambient light for even illumination
  const ambient = new THREE.AmbientLight(0xffffff, 3.0);
  scene.add(ambient);

  // Neutral key light from the front-top
  const keyLight = new THREE.DirectionalLight(0xffffff, 3.5);
  keyLight.position.set(2, 6, 4);
  scene.add(keyLight);

  // Soft fill light from the opposite side
  const fillLight = new THREE.DirectionalLight(0xffffff, 1.5);
  fillLight.position.set(-3, 3, -2);
  scene.add(fillLight);

  // Subtle rim light from behind for edge definition
  const rimLight = new THREE.SpotLight(0xffffff, 40);
  rimLight.position.set(-4, 5, -4);
  rimLight.target.position.set(0, 0, 0);
  scene.add(rimLight);
  scene.add(rimLight.target);
}

export function animateEnvironment(time) {
  // Nothing to animate — clean static white studio
}
